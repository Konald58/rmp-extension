/**
 * @jest-environment jsdom
 *
 * Full DuckWeb adapter flow against the UO fixture with a stubbed
 * chrome.runtime, plus the no-school guard: when the worker reports that no
 * school is selected, every cell gets a "choose your school" badge and no
 * professor lookup result is rendered.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

function loadScript(relPath) {
  eval.call(globalThis, fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

const tick = () => new Promise((r) => setTimeout(r, 0));

function loadFixture() {
  document.documentElement.innerHTML = fs.readFileSync(
    path.join(ROOT, "tests/fixtures/duckweb-uoregon.html"),
    "utf8"
  );
}

function stubChrome(handler) {
  global.chrome = {
    runtime: { id: "fake-extension-id", sendMessage: jest.fn(handler) },
  };
}

async function runAdapter() {
  delete window.RMP;
  loadScript("content/common.js");
  loadScript("content/adapters/duckweb.js");
  const adapter = window.RMP.adapters.find((a) => a.name === "duckweb");
  expect(adapter).toBeDefined();
  adapter.init();
  for (let i = 0; i < 5; i++) await tick();
}

describe("DuckWeb adapter full flow (UO fixture)", () => {
  beforeAll(async () => {
    stubChrome(async (msg) => {
      if (msg.type !== "rmp:search") return null;
      if (msg.lastName === "Carrere") {
        return {
          result: {
            id: "VGVhY2hlci0xMjM=",
            name: "Daniel Carrere",
            department: "Computer Science",
            rating: 4.4,
            difficulty: 2.8,
            wouldTakeAgainPct: 90,
            numRatings: 21,
            rmpUrl: "https://www.ratemyprofessors.com/professor/123",
            ambiguous: false,
          },
        };
      }
      return { result: null };
    });
    loadFixture();
    await runAdapter();
  });

  test("badges injected into instructor cells", () => {
    expect(document.querySelectorAll(".rmp-container").length).toBeGreaterThan(80);
    // Continuation row (rowspan co-instructor) gets its own badge.
    const reasoner = [...document.querySelectorAll("td")].find((td) => /^Reasoner K/.test(td.textContent.trim()));
    expect(reasoner.querySelector(".rmp-container")).not.toBeNull();
  });

  test("search carries the subject resolved from the course header row", () => {
    const calls = chrome.runtime.sendMessage.mock.calls.map((c) => c[0]);
    const carrere = calls.find((m) => m.type === "rmp:search" && m.lastName === "Carrere");
    expect(carrere).toMatchObject({ firstInitial: "D", subject: "CS" });
  });

  test("Carrere cell renders the real rating", () => {
    const cell = [...document.querySelectorAll("td")].find(
      (td) => td.getAttribute("data-rmp-badge") && /^Carrere D/.test(td.textContent.trim())
    );
    expect(cell).toBeDefined();
    const card = cell.querySelector(".rmp-card");
    expect(card).not.toBeNull();
    expect(card.querySelector(".rmp-col__value").textContent).toBe("4.4");
    expect(card.title).toContain("Daniel Carrere (Computer Science)");
  });

  test("STAFF cells get no badge", () => {
    const staff = [...document.querySelectorAll("td")].filter(
      (td) => td.textContent.trim() === "STAFF"
    );
    expect(staff.length).toBeGreaterThan(0);
    for (const td of staff) expect(td.querySelector(".rmp-container")).toBeNull();
  });
});

describe("no school selected", () => {
  beforeAll(async () => {
    stubChrome(async (msg) => (msg.type === "rmp:search" ? { noSchool: true } : null));
    loadFixture();
    await runAdapter();
  });

  test("every instructor cell shows a short choose-school badge with the hint in the tooltip", () => {
    const empties = [...document.querySelectorAll(".rmp-empty")];
    expect(empties.length).toBeGreaterThan(80);
    for (const e of empties) {
      expect(e.textContent).toBe("Choose school in popup");
      expect(e.title).toMatch(/search for your school/);
    }
    expect(document.querySelectorAll(".rmp-card").length).toBe(0);
  });

  test("a no-school answer is not cached, so the next scan re-asks the worker", async () => {
    const before = chrome.runtime.sendMessage.mock.calls.length;
    const result = await window.RMP.searchProfessor("Carrere", "D", "CS");
    expect(result).toBe(window.RMP.NO_SCHOOL);
    await window.RMP.searchProfessor("Carrere", "D", "CS");
    expect(chrome.runtime.sendMessage.mock.calls.length).toBe(before + 2);
  });
});
