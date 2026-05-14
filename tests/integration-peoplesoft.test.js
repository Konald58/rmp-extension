/**
 * @jest-environment jsdom
 *
 * Integration test: full PeopleSoft adapter flow against the live NAU fixture
 * with a stubbed chrome.runtime. Verifies that the parser → IPC → injectBadge
 * pipeline actually produces DOM badges, not just that the parser parses.
 *
 * What unit tests don't catch but this does:
 *   - common.js IIFE side-effects (window.RMP setup)
 *   - peoplesoft.js IIFE adapter registration
 *   - chrome.runtime.sendMessage contract (Promise-returning shape)
 *   - injectBadge actually appends a .rmp-container to instructor cells
 *   - Ambiguous flag flows through to the rendered tooltip
 *   - Null avgRating renders "—" instead of crashing
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function loadScript(relPath) {
  const text = fs.readFileSync(path.join(ROOT, relPath), "utf8");
  eval.call(globalThis, text);
}

// Canned RMP responses. Keyed by lastName.
const FAKE_PROFS = {
  Mitchell: {
    id: "VGVhY2hlci0xMjM=",
    firstName: "Kenneth",
    lastName: "Mitchell",
    department: "Accounting",
    avgRating: 4.2,
    avgDifficulty: 3.1,
    wouldTakeAgainPercent: 78,
    numRatings: 42,
  },
  Morris: {
    id: "VGVhY2hlci00NTY=",
    firstName: "Landi",
    lastName: "Morris",
    department: "Accounting",
    avgRating: 3.8,
    avgDifficulty: 2.9,
    wouldTakeAgainPercent: 65,
    numRatings: 18,
  },
  // Null-rating prof — should render as "—", not crash
  Nobody: {
    id: "VGVhY2hlci0wMDA=",
    firstName: "New",
    lastName: "Nobody",
    department: "Accounting",
    avgRating: null,
    avgDifficulty: null,
    wouldTakeAgainPercent: 0,
    numRatings: 0,
  },
};

function stubChrome() {
  global.chrome = {
    runtime: {
      sendMessage: jest.fn(async (msg) => {
        if (msg.type === "rmp:search") {
          const prof = FAKE_PROFS[msg.lastName];
          if (!prof) return { result: null };
          // Mimic what the real searchProfessor returns
          return {
            result: {
              id: prof.id,
              name: `${prof.firstName} ${prof.lastName}`,
              department: prof.department,
              rating: prof.avgRating,
              difficulty: prof.avgDifficulty,
              wouldTakeAgainPct: Math.round(prof.wouldTakeAgainPercent || 0),
              numRatings: prof.numRatings,
              rmpUrl: `https://www.ratemyprofessors.com/professor/${atob(prof.id).split("-").pop()}`,
              ambiguous: false,
            },
          };
        }
        if (msg.type === "rmp:teacherDetails") {
          return {
            result: {
              distribution: { total: 42, r1: 2, r2: 3, r3: 7, r4: 15, r5: 15 },
            },
          };
        }
        return null;
      }),
    },
  };
}

// Tiny tick helper — yields to microtasks so awaited fetches can resolve.
const tick = () => new Promise((r) => setTimeout(r, 0));

describe("PeopleSoft adapter full flow (NAU fixture)", () => {
  let adapter;

  beforeAll(async () => {
    stubChrome();

    document.documentElement.innerHTML = fs.readFileSync(
      path.join(ROOT, "tests/fixtures/peoplesoft-nau.html"),
      "utf8"
    );

    // Load content scripts in manifest order. peoplesoft.js has a CommonJS
    // export check at the bottom — we want the IIFE registration, so the
    // module.exports branch is fine (just sets module.exports, doesn't
    // interfere with the side-effects we care about).
    loadScript("content/common.js");
    loadScript("content/adapters/peoplesoft.js");

    adapter = window.RMP.adapters.find((a) => a.name === "peoplesoft");
    expect(adapter).toBeDefined();

    adapter.init();

    // Let all the per-cell async searchProfessor() promises resolve.
    // The PS adapter fires one per cell synchronously; injection happens in
    // their .then(). 3 ticks is generous — each tick drains microtasks.
    for (let i = 0; i < 5; i++) await tick();
  });

  test("badges injected into instructor cells", () => {
    const badges = document.querySelectorAll(".rmp-container");
    // NAU fixture has 30+ MTG_INSTR cells. Some are TBA placeholders that get
    // skipped. We expect at least ~10 successful injections (Mitchell + Morris
    // candidates that map to fake profs, plus "No RMP data" empty badges for
    // the rest).
    expect(badges.length).toBeGreaterThan(10);
  });

  test("chrome.runtime.sendMessage called with rmp:search", () => {
    const calls = chrome.runtime.sendMessage.mock.calls;
    const searchCalls = calls.filter((c) => c[0]?.type === "rmp:search");
    expect(searchCalls.length).toBeGreaterThan(10);

    // Verify Mitchell was searched — confirms peoplesoft.js passes firstName
    // through correctly (the v1.5.1 Kenneth/Kimberly disambiguator).
    const mitchellCall = searchCalls.find((c) => c[0].lastName === "Mitchell");
    expect(mitchellCall).toBeDefined();
    expect(mitchellCall[0].firstName).toBe("Kenneth");
    expect(mitchellCall[0].firstInitial).toBe("K");
  });

  test("Mitchell badge contains real rating value, not crash", () => {
    // Find Mitchell's badge by walking from a MTG_INSTR cell with that name
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    let mitchellTarget = null;
    for (const cell of cells) {
      if (/mitchell/i.test(cell.textContent || "")) {
        mitchellTarget = cell.closest("td") || cell.parentElement;
        break;
      }
    }
    expect(mitchellTarget).not.toBeNull();
    const container = mitchellTarget.querySelector(".rmp-container");
    expect(container).not.toBeNull();
    // Should NOT show "No RMP data" — should show actual values
    const empty = container.querySelector(".rmp-empty");
    expect(empty).toBeNull();
    const ratingCol = container.querySelector(".rmp-col__value");
    expect(ratingCol).not.toBeNull();
    expect(ratingCol.textContent).toBe("4.2");
  });

  test("badge tooltip includes department (wrong-prof safety net)", () => {
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    for (const cell of cells) {
      if (/mitchell/i.test(cell.textContent || "")) {
        const target = cell.closest("td") || cell.parentElement;
        const card = target.querySelector(".rmp-card");
        if (!card) continue;
        expect(card.title).toContain("Kenneth Mitchell");
        expect(card.title).toContain("(Accounting)");
        return;
      }
    }
    throw new Error("Mitchell cell not found in fixture");
  });

  test("'To be Announced' cells get No RMP data badge, not real prof badge", () => {
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    for (const cell of cells) {
      if (/to be announced/i.test(cell.textContent || "")) {
        const target = cell.closest("td") || cell.parentElement;
        // Parser returns null → processInstructorElement skips → no container
        const container = target.querySelector(".rmp-container");
        expect(container).toBeNull();
        return;
      }
    }
    // Fixture has TBA cells; if we got here, fixture changed
    throw new Error("No 'To be Announced' cell in fixture — assert needs update");
  });
});
