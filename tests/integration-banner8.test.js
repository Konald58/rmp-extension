/**
 * @jest-environment jsdom
 *
 * Full Banner 8 adapter flow against the UO MATH schedule listing with a
 * stubbed chrome.runtime: badges land in the Instructors cells and the
 * search carries firstName (Banner 8 shows full first names, unlike SSB9).
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const tick = () => new Promise((r) => setTimeout(r, 0));

function loadScript(relPath) {
  eval.call(globalThis, fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

describe("Banner 8 adapter full flow (UO MATH fixture)", () => {
  beforeAll(async () => {
    global.chrome = {
      runtime: {
        id: "fake-extension-id",
        sendMessage: jest.fn(async (msg) => {
          if (msg.type !== "rmp:search") return null;
          if (msg.lastName === "Steinberg") {
            return {
              result: {
                id: "VGVhY2hlci05OTk=",
                name: "David Steinberg",
                department: "Mathematics",
                rating: 4.1,
                difficulty: 3.3,
                wouldTakeAgainPct: 80,
                numRatings: 37,
                rmpUrl: "https://www.ratemyprofessors.com/professor/999",
                ambiguous: false,
              },
            };
          }
          return { result: null };
        }),
      },
    };
    document.documentElement.innerHTML = fs.readFileSync(
      path.join(ROOT, "tests/fixtures/banner8-uoregon.html"),
      "utf8"
    );
    delete window.RMP;
    loadScript("content/common.js");
    loadScript("content/adapters/banner8.js");
    const adapter = window.RMP.adapters.find((a) => a.name === "banner8");
    expect(adapter).toBeDefined();
    adapter.init();
    for (let i = 0; i < 5; i++) await tick();
  });

  test("exactly one badge per Instructors cell, none on placeholders", () => {
    // Instructor cells only: leaf cells (the section body <td> wraps the whole meeting table).
    const cells = [...document.querySelectorAll("table.datadisplaytable td")].filter(
      (td) => /\(\s*P\s*\)/.test(td.textContent) && !td.querySelector("table")
    );
    expect(cells.length).toBeGreaterThan(15);
    for (const td of cells) expect(td.querySelectorAll(".rmp-container").length).toBe(1);
    expect(document.querySelectorAll(".rmp-container").length).toBe(cells.length);
  });

  test("a section title without a course code sends no subject (no guess from the walker)", async () => {
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div>CS 102 lives in an ancestor</div><table class="datadisplaytable"><tr><th class="ddtitle">Mystery - no code</th></tr>' +
        '<tr><td class="dddefault"><table class="datadisplaytable"><caption>Scheduled Meeting Times</caption>' +
        '<tr><th class="ddheader">Instructors</th></tr><tr><td class="dddefault">Zed Nobody (P)</td></tr></table></td></tr></table>'
    );
    // The adapter re-scans 150 ms after a DOM mutation.
    await new Promise((r) => setTimeout(r, 250));
    for (let i = 0; i < 5; i++) await tick();
    const call = chrome.runtime.sendMessage.mock.calls.map((c) => c[0]).find((m) => m.lastName === "Nobody");
    expect(call).toBeDefined();
    expect(call.subject).toBeUndefined();
  });

  test("search carries firstName, initial and the MATH subject", () => {
    const calls = chrome.runtime.sendMessage.mock.calls.map((c) => c[0]);
    const steinberg = calls.find((m) => m.type === "rmp:search" && m.lastName === "Steinberg");
    expect(steinberg).toMatchObject({ firstName: "David", firstInitial: "D", subject: "MATH" });
  });

  test("Steinberg cells render the rating card with department in the tooltip", () => {
    const cells = [...document.querySelectorAll("td")].filter(
      (td) => td.getAttribute("data-rmp-badge") && /Steinberg/.test(td.textContent)
    );
    expect(cells.length).toBeGreaterThan(0);
    for (const td of cells) {
      const card = td.querySelector(".rmp-card");
      expect(card).not.toBeNull();
      expect(card.querySelector(".rmp-col__value").textContent).toBe("4.1");
      expect(card.title).toContain("David Steinberg (Mathematics)");
    }
  });
});
