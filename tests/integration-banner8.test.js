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

  test("badges injected into every Instructors cell with a real name", () => {
    expect(document.querySelectorAll(".rmp-container").length).toBeGreaterThan(15);
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
