/**
 * @jest-environment jsdom
 */
const fs = require("fs");
const path = require("path");

const { parsePeopleSoftName } = require("../content/adapters/peoplesoft");

describe("parsePeopleSoftName", () => {
  test("standard Firstname Lastname", () => {
    expect(parsePeopleSoftName("Kenneth Mitchell")).toMatchObject({
      firstName: "Kenneth",
      lastName: "Mitchell",
      firstInitial: "K",
    });
  });

  test("ALL CAPS name", () => {
    const r = parsePeopleSoftName("LANDI MORRIS");
    expect(r.lastName).toBe("MORRIS");
    expect(r.firstInitial).toBe("L");
  });

  test("rejects 'To be Announced'", () => {
    expect(parsePeopleSoftName("To be Announced")).toBeNull();
  });

  test("rejects 'Staff'", () => {
    expect(parsePeopleSoftName("Staff")).toBeNull();
  });

  test("rejects empty / single word", () => {
    expect(parsePeopleSoftName("")).toBeNull();
    expect(parsePeopleSoftName("Madonna")).toBeNull();
  });

  test("strips Jr./Sr. suffix, keeps real lastName", () => {
    const r = parsePeopleSoftName("Robert Downey Jr.");
    expect(r.lastName).toBe("Downey");
    expect(r.firstInitial).toBe("R");
  });

  test("middle name → first word is first, last word is last", () => {
    const r = parsePeopleSoftName("Mary Anne Smith");
    expect(r.firstInitial).toBe("M");
    expect(r.lastName).toBe("Smith");
  });

  test("comma-separated multi-instructor → takes primary", () => {
    const r = parsePeopleSoftName("Kenneth Mitchell, Eric Yordy");
    expect(r.firstInitial).toBe("K");
    expect(r.lastName).toBe("Mitchell");
  });

  test("hyphenated last name preserved", () => {
    const r = parsePeopleSoftName("Maria Smith-Jones");
    expect(r.lastName).toBe("Smith-Jones");
  });

  // Defensive coverage for variants other PS schools may exhibit but the NAU
  // fixture doesn't. We can't fetch fixtures from authenticated PS instances
  // (Ohio State, U Houston, etc.), so harden the parser against likely inputs.

  test("apostrophe in last name preserved", () => {
    const r = parsePeopleSoftName("Sean O'Brien");
    expect(r.lastName).toBe("O'Brien");
    expect(r.firstInitial).toBe("S");
  });

  test("apostrophe in first name preserved", () => {
    const r = parsePeopleSoftName("D'Angelo Smith");
    expect(r.firstName).toBe("D'Angelo");
    expect(r.firstInitial).toBe("D");
    expect(r.lastName).toBe("Smith");
  });

  test("accented characters preserved", () => {
    const r = parsePeopleSoftName("José Núñez");
    expect(r.firstInitial).toBe("J");
    expect(r.lastName).toBe("Núñez");
  });

  test("semicolon-separated multi-instructor → takes primary", () => {
    const r = parsePeopleSoftName("Alice Wong; Bob Lee");
    expect(r.firstName).toBe("Alice");
    expect(r.lastName).toBe("Wong");
  });

  test("PhD suffix stripped (no period)", () => {
    const r = parsePeopleSoftName("Jane Doe PhD");
    expect(r.lastName).toBe("Doe");
    expect(r.firstInitial).toBe("J");
  });

  test("Esq suffix stripped", () => {
    const r = parsePeopleSoftName("Sam Brown Esq.");
    expect(r.lastName).toBe("Brown");
  });

  test("extra whitespace tolerated", () => {
    const r = parsePeopleSoftName("  Kenneth   Mitchell  ");
    expect(r.lastName).toBe("Mitchell");
    expect(r.firstInitial).toBe("K");
  });

  test("rejects 'TBD' placeholder", () => {
    expect(parsePeopleSoftName("TBD")).toBeNull();
  });

  test("null/undefined input safe", () => {
    expect(parsePeopleSoftName(null)).toBeNull();
    expect(parsePeopleSoftName(undefined)).toBeNull();
  });
});

describe("PeopleSoft adapter scan against NAU fixture", () => {
  const fixture = fs.readFileSync(
    path.join(__dirname, "fixtures", "peoplesoft-nau.html"),
    "utf8"
  );

  test("finds all MTG_INSTR cells", () => {
    document.documentElement.innerHTML = fixture;
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    expect(cells.length).toBeGreaterThan(20);
  });

  test("parses live fixture cells, skipping 'To be Announced'", () => {
    document.documentElement.innerHTML = fixture;
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    const parsed = [];
    const skipped = [];
    for (const cell of cells) {
      const result = parsePeopleSoftName(cell.textContent);
      if (result) parsed.push(result);
      else skipped.push(cell.textContent.trim());
    }
    expect(parsed.length).toBeGreaterThan(0);
    // Each skipped cell should be the placeholder
    for (const s of skipped) {
      expect(s).toMatch(/to be announced/i);
    }
  });

  test("each parsed instructor has plausible last name + first initial", () => {
    document.documentElement.innerHTML = fixture;
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    for (const cell of cells) {
      const r = parsePeopleSoftName(cell.textContent);
      if (!r) continue;
      expect(r.lastName.length).toBeGreaterThanOrEqual(2);
      expect(r.firstInitial).toMatch(/^[A-Z]$/);
    }
  });

  test("findCourseInfo extracts subject from PSGROUPBOXLABEL ancestor", () => {
    document.documentElement.innerHTML = fixture;

    // Walk our findCourseInfo logic over every instructor cell — every one
    // should resolve to a subject, since each section is wrapped under a
    // course header containing 'ACC <number>'.
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');

    // Tiny standalone implementation matching common.js (jsdom doesn't run
    // common.js as a content script; redo the walker here).
    function findCourseInfo(element) {
      const ADJ = /\b([A-Z]{2,4})[\s\-]+(\d{3,4}[A-Z]{0,2})\b/g;
      const BL = new Set([
        "SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT",
        "TBA", "TBD", "STAFF", "MTW", "MWF", "TR", "TWR",
        "AM", "PM", "CRN", "ID", "GPA",
      ]);
      let p = element;
      for (let d = 0; p && p !== document.body && d < 30; d++) {
        const text = p.textContent || "";
        ADJ.lastIndex = 0;
        for (const m of text.matchAll(ADJ)) {
          if (!BL.has(m[1])) return { subject: m[1], courseCode: `${m[1]}${m[2]}` };
        }
        p = p.parentElement;
      }
      return null;
    }

    let withSubject = 0;
    for (const cell of cells) {
      const td = cell.closest("td") || cell.parentElement;
      const info = findCourseInfo(td);
      if (info?.subject === "ACC") withSubject++;
    }
    expect(withSubject).toBeGreaterThan(20);
  });
});
