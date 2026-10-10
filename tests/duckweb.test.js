/**
 * @jest-environment jsdom
 *
 * University of Oregon DuckWeb adapter: name parser, URL matcher, instructor
 * cell discovery (including rowspan continuation rows) and course tracking,
 * against a real UO CS class-schedule capture.
 */

const fs = require("fs");
const path = require("path");

const { parseDuckWebName, duckWebMatches, findInstructorCells } =
  require("../content/adapters/duckweb.js");

const FIXTURE = path.join(__dirname, "fixtures/duckweb-uoregon.html");

describe("parseDuckWebName", () => {
  test("Lastname F", () => {
    expect(parseDuckWebName("Carrere D")).toEqual({
      lastName: "Carrere",
      firstInitial: "D",
      isPrimary: true,
      searchName: "Carrere D",
    });
  });

  test("multi-word, hyphenated, apostrophe, dotted and particle last names", () => {
    expect(parseDuckWebName("Armenta Vega A")).toMatchObject({ lastName: "Armenta Vega", firstInitial: "A" });
    expect(parseDuckWebName("Sheldon-Young P")).toMatchObject({ lastName: "Sheldon-Young", firstInitial: "P" });
    expect(parseDuckWebName("O'Brien K")).toMatchObject({ lastName: "O'Brien", firstInitial: "K" });
    expect(parseDuckWebName("St. John M")).toMatchObject({ lastName: "St. John", firstInitial: "M" });
    expect(parseDuckWebName("Van Der Berg A")).toMatchObject({ lastName: "Van Der Berg", firstInitial: "A" });
  });

  test("two initials keep the first one; accented initial accepted", () => {
    expect(parseDuckWebName("Smith J A")).toMatchObject({ lastName: "Smith", firstInitial: "J" });
    expect(parseDuckWebName("Åberg Ö")).toMatchObject({ lastName: "Åberg", firstInitial: "Ö" });
  });

  test("lowercase initial is upper-cased, trailing period and NBSP tolerated", () => {
    expect(parseDuckWebName("Li j.")).toMatchObject({ lastName: "Li", firstInitial: "J" });
    expect(parseDuckWebName(" Young M ")).toMatchObject({ lastName: "Young", firstInitial: "M" });
  });

  test("placeholders, full names and garbage return null", () => {
    for (const s of ["STAFF ", "tba", "TBD", "See DuckWeb", "Instructor", "", null]) {
      expect(parseDuckWebName(s)).toBeNull();
    }
  });

  test("pathological hyphen runs return quickly", () => {
    const start = Date.now();
    expect(parseDuckWebName("A" + "-".repeat(40) + "!")).toBeNull();
    expect(Date.now() - start).toBeLessThan(200);
  });
});

describe("duckWebMatches", () => {
  test("matches DuckWeb class schedule URLs", () => {
    expect(duckWebMatches({ href: "https://duckweb.uoregon.edu/duckweb/hwskdhnt.P_ListCrse?term_in=202601" })).toBe(true);
    expect(duckWebMatches({ href: "https://duckweb.uoregon.edu/duckweb/hwskdhnt.p_viewdetl?term=202601&crn=11659" })).toBe(true);
  });

  test("does not match Banner SSB9, PeopleSoft or the DuckWeb login", () => {
    expect(duckWebMatches({ href: "https://studentssb9.it.usf.edu/StudentRegistrationSsb/ssb/classSearch" })).toBe(false);
    expect(duckWebMatches({ href: "https://cs.nau.edu/psc/ps/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL" })).toBe(false);
    expect(duckWebMatches({ href: "https://duckweb.uoregon.edu/duckweb/twbkwbis.P_WWWLogin" })).toBe(false);
  });
});

describe("DuckWeb UO fixture scan", () => {
  let cells;
  const by = (name) => cells.find(({ cell }) => cell.textContent.trim() === name);

  beforeAll(() => {
    document.documentElement.innerHTML = fs.readFileSync(FIXTURE, "utf8");
    cells = findInstructorCells();
  });

  test("finds every instructor cell under an Instructor header, never the header itself", () => {
    expect(cells.length).toBeGreaterThan(80);
    for (const { cell } of cells) {
      expect(cell.tagName).toBe("TD");
      expect(cell.textContent.trim()).not.toBe("Instructor");
    }
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

  test("course info follows the nearest preceding course header, not the first on the page", () => {
    expect(by("Carrere D").courseInfo).toEqual({ subject: "CS", courseCode: "CS102" });
    expect(by("Young M").courseInfo).toEqual({ subject: "CS", courseCode: "CS109" });
    expect(by("Thuzar A").courseInfo.courseCode).toBe("CS110");
  });

  test("co-instructor continuation rows (rowspan) are found", () => {
    // CRN 11710: "Richmond G" in the full row, "Reasoner K" alone in the next <tr>.
    expect(by("Richmond G")).toBeDefined();
    expect(by("Reasoner K")).toBeDefined();
    expect(by("Reasoner K").courseInfo).toEqual(by("Richmond G").courseInfo);
  });
});

describe("DuckWeb synthetic tables", () => {
  afterAll(() => {
    document.documentElement.innerHTML = fs.readFileSync(FIXTURE, "utf8");
  });

  test("rows under <thead> and a course with many sections still resolve", () => {
    const course = '<tr><td class="dddead">CS 999 &nbsp;Many Sections</td><td>4.00 cr.</td></tr>';
    const header = '<tr><td>&nbsp;</td><td>CRN</td><td width="110">Instructor</td><td>Notes</td></tr>';
    const sections = [];
    for (let i = 0; i < 80; i++) {
      sections.push(`<tr><td>&nbsp;</td><td>${20000 + i}</td><td width="110">Person${i} Z</td><td></td></tr>`);
    }
    document.body.innerHTML =
      `<table class="datadisplaytable"><thead>${header}</thead><tbody>${course}${sections.join("")}</tbody></table>`;
    const found = findInstructorCells();
    expect(found.length).toBe(80);
    expect(found[79].courseInfo).toEqual({ subject: "CS", courseCode: "CS999" });
  });

  test("short row without a width attribute falls back to a name-shaped cell", () => {
    document.body.innerHTML =
      '<table class="datadisplaytable"><tr><td>CS 101 Intro</td><td>4 cr.</td></tr>' +
      "<tr><td>&nbsp;</td><td>CRN</td><td>Instructor</td><td>Notes</td></tr>" +
      "<tr><td>&nbsp;</td><td>1</td><td>Main A</td><td>!</td></tr>" +
      "<tr><td>Second B</td></tr></table>";
    const names = findInstructorCells().map(({ cell }) => cell.textContent);
    expect(names).toEqual(["Main A", "Second B"]);
  });

  test("nested tables inside a results table are ignored", () => {
    document.body.innerHTML =
      '<table class="datadisplaytable"><tr><td>CS 101 Intro</td><td>4 cr.</td></tr>' +
      '<tr><td colspan="4"><table class="datadisplaytable"><tr><td>Grading Options:</td><td>Optional</td></tr></table></td></tr>' +
      "<tr><td>&nbsp;</td><td>CRN</td><td>Instructor</td><td>Notes</td></tr>" +
      "<tr><td>&nbsp;</td><td>1</td><td>Main A</td><td>!</td></tr></table>";
    expect(findInstructorCells().map(({ cell }) => cell.textContent)).toEqual(["Main A"]);
  });
});
