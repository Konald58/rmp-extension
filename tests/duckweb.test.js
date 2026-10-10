/**
 * @jest-environment jsdom
 *
 * University of Oregon DuckWeb adapter: name parser, URL matcher, course-code
 * lookup, and a DOM scan against a real UO CS class-schedule capture.
 */

const fs = require("fs");
const path = require("path");

const { parseDuckWebName, duckWebMatches, duckWebCourseInfo, findInstructorCells } =
  require("../content/adapters/duckweb.js");

describe("parseDuckWebName", () => {
  test("Lastname F", () => {
    expect(parseDuckWebName("Carrere D")).toEqual({
      lastName: "Carrere",
      firstInitial: "D",
      isPrimary: true,
      searchName: "Carrere D",
    });
  });

  test("multi-word last name", () => {
    expect(parseDuckWebName("Armenta Vega A")).toMatchObject({
      lastName: "Armenta Vega",
      firstInitial: "A",
    });
  });

  test("hyphenated and apostrophe last names", () => {
    expect(parseDuckWebName("Sheldon-Young P")).toMatchObject({
      lastName: "Sheldon-Young",
      firstInitial: "P",
    });
    expect(parseDuckWebName("O'Brien K")).toMatchObject({ lastName: "O'Brien", firstInitial: "K" });
  });

  test("lowercase initial is upper-cased, trailing period tolerated", () => {
    expect(parseDuckWebName("Li j.")).toMatchObject({ lastName: "Li", firstInitial: "J" });
  });

  test("non-breaking spaces and padding", () => {
    expect(parseDuckWebName(" Young M ")).toMatchObject({ lastName: "Young", firstInitial: "M" });
  });

  test("placeholders return null", () => {
    expect(parseDuckWebName("STAFF ")).toBeNull();
    expect(parseDuckWebName("tba")).toBeNull();
    expect(parseDuckWebName("TBD")).toBeNull();
  });

  test("full names and garbage return null", () => {
    expect(parseDuckWebName("See DuckWeb")).toBeNull();
    expect(parseDuckWebName("Instructor")).toBeNull();
    expect(parseDuckWebName("")).toBeNull();
    expect(parseDuckWebName(null)).toBeNull();
  });
});

describe("duckWebMatches", () => {
  test("matches DuckWeb class schedule URLs", () => {
    expect(duckWebMatches({ href: "https://duckweb.uoregon.edu/duckweb/hwskdhnt.P_ListCrse?term_in=202601" })).toBe(true);
    expect(duckWebMatches({ href: "https://duckweb.uoregon.edu/duckweb/hwskdhnt.p_viewdetl?term=202601&crn=11659" })).toBe(true);
  });

  test("does not match Banner SSB9 or PeopleSoft", () => {
    expect(duckWebMatches({ href: "https://studentssb9.it.usf.edu/StudentRegistrationSsb/ssb/classSearch" })).toBe(false);
    expect(duckWebMatches({ href: "https://cs.nau.edu/psc/ps/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL" })).toBe(false);
    expect(duckWebMatches({ href: "https://duckweb.uoregon.edu/duckweb/twbkwbis.P_WWWLogin" })).toBe(false);
  });
});

describe("DuckWeb UO fixture scan", () => {
  let cells;

  beforeAll(() => {
    document.documentElement.innerHTML = fs.readFileSync(
      path.join(__dirname, "fixtures/duckweb-uoregon.html"),
      "utf8"
    );
    cells = findInstructorCells();
  });

  test("finds every instructor cell under an Instructor header", () => {
    // 54 header rows in the capture, each followed by 1..n section rows.
    expect(cells.length).toBeGreaterThan(80);
    for (const { cell } of cells) {
      expect(cell.tagName).toBe("TD");
    }
  });

  test("header cells themselves are never returned", () => {
    expect(cells.some(({ cell }) => cell.textContent.trim() === "Instructor")).toBe(false);
  });

  test("parses real names and skips STAFF / tba", () => {
    const parsed = cells.map(({ cell }) => parseDuckWebName(cell.textContent));
    const names = parsed.filter(Boolean).map((p) => p.searchName);
    expect(names).toContain("Carrere D");
    expect(names).toContain("Sheldon-Young P");
    const skipped = cells.filter((_c, i) => !parsed[i]).map(({ cell }) => cell.textContent.trim());
    expect(skipped.length).toBeGreaterThan(0);
    for (const s of skipped) expect(s).toMatch(/^(STAFF|tba)$/i);
  });

  test("course info comes from the nearest preceding course header, not the first on the page", () => {
    const carrere = cells.find(({ cell }) => cell.textContent.trim() === "Carrere D");
    expect(duckWebCourseInfo(carrere.row)).toEqual({ subject: "CS", courseCode: "CS102" });

    const young = cells.find(({ cell }) => cell.textContent.trim() === "Young M");
    expect(duckWebCourseInfo(young.row)).toEqual({ subject: "CS", courseCode: "CS109" });

    const thuzar = cells.find(({ cell }) => cell.textContent.trim() === "Thuzar A");
    expect(duckWebCourseInfo(thuzar.row).courseCode).toBe("CS110");
  });
});
