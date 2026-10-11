/**
 * @jest-environment jsdom
 *
 * Classic Banner 8 self-service adapter: instructor-cell parser, URL matcher,
 * and scans against a real UO "Class Schedule Listing" capture plus a
 * synthetic "Look Up Classes" results table.
 */

const fs = require("fs");
const path = require("path");

const { parseBanner8Instructors, banner8Matches, findInstructorCells } =
  require("../content/adapters/banner8.js");

const FIXTURE = path.join(__dirname, "fixtures/banner8-uoregon.html");

describe("parseBanner8Instructors", () => {
  test("single primary instructor with full first name", () => {
    expect(parseBanner8Instructors("Dan Carrere (P)")).toEqual({
      firstName: "Dan",
      lastName: "Carrere",
      firstInitial: "D",
      isPrimary: true,
      searchName: "Carrere D",
    });
  });

  test("picks the (P) instructor out of a comma-separated list", () => {
    const p = parseBanner8Instructors("Jane Q Doe, Dan Carrere (P)");
    expect(p).toMatchObject({ firstName: "Dan", lastName: "Carrere", isPrimary: true });
  });

  test("no (P) marker: first instructor, flagged non-primary", () => {
    const p = parseBanner8Instructors("Jane Q Doe, Dan Carrere");
    expect(p).toMatchObject({ firstName: "Jane", lastName: "Doe", isPrimary: false });
  });

  test("middle names, suffixes, double spaces and NBSP", () => {
    expect(parseBanner8Instructors("Michal  Young (P)")).toMatchObject({ firstName: "Michal", lastName: "Young" });
    expect(parseBanner8Instructors("John A. Smith Jr. (P)")).toMatchObject({ firstName: "John", lastName: "Smith" });
    expect(parseBanner8Instructors("Zhengdong Zhang (P)")).toMatchObject({ searchName: "Zhang Z" });
  });

  test("Last, First sites and comma suffixes", () => {
    expect(parseBanner8Instructors("Smith, John Michael (P)")).toMatchObject({ firstName: "John", lastName: "Smith", isPrimary: true });
    expect(parseBanner8Instructors("Doe, Jane Q (P)")).toMatchObject({ firstName: "Jane", lastName: "Doe" });
    expect(parseBanner8Instructors("John Smith, Jr. (P)")).toMatchObject({ firstName: "John", lastName: "Smith" });
    expect(parseBanner8Instructors("Smith, Jr.")).toBeNull();
  });

  test("particles stay in the last name", () => {
    expect(parseBanner8Instructors("Maria De La Cruz (P)")).toMatchObject({ firstName: "Maria", lastName: "De La Cruz", searchName: "De La Cruz M" });
    expect(parseBanner8Instructors("Ludwig van Beethoven (P)")).toMatchObject({ lastName: "van Beethoven" });
  });

  test("placeholders and single tokens return null", () => {
    for (const s of ["TBA", "TBA (P)", "Staff", "Instructor", "Carrere", "", null]) {
      expect(parseBanner8Instructors(s)).toBeNull();
    }
  });
});

describe("banner8Matches", () => {
  const loc = (href) => new URL(href);

  test("matches schedule listing, detail and Look Up Classes URLs on any host", () => {
    for (const href of [
      "https://duckweb.uoregon.edu/duckweb/bwckschd.p_get_crse_unsec",
      "https://ssb.example.edu/prod/bwckschd.p_disp_detail_sched?term_in=202601&crn_in=11659",
      "https://ssb.example.edu/PROD/bwckschd.p_disp_listcrse?term_in=202601&subj_in=CS&crse_in=102",
      "https://ssb.example.edu/prod/bwskfcls.P_GetCrse",
      "https://ssb.example.edu/prod/bwskfcls.P_GetCrse_Advanced",
    ]) {
      expect(banner8Matches(loc(href))).toBe(true);
    }
  });

  test("does not match the term picker, SSB9, PeopleSoft, DuckWeb, or a Banner name in the query string", () => {
    for (const href of [
      "https://duckweb.uoregon.edu/duckweb/bwckschd.p_disp_dyn_sched",
      "https://studentssb9.it.usf.edu/StudentRegistrationSsb/ssb/classSearch",
      "https://cs.nau.edu/psc/ps/EMPLOYEE/HRMS/c/COMMUNITY_ACCESS.CLASS_SEARCH.GBL",
      "https://duckweb.uoregon.edu/duckweb/hwskdhnt.P_ListCrse",
      "https://example.com/x?r=/bwckschd.p_disp_detail_sched",
    ]) {
      expect(banner8Matches(loc(href))).toBe(false);
    }
  });
});

describe("Class Schedule Listing (UO MATH fixture)", () => {
  let cells;

  beforeAll(() => {
    document.documentElement.innerHTML = fs.readFileSync(FIXTURE, "utf8");
    cells = findInstructorCells();
  });

  test("one instructor cell per Scheduled Meeting Times row", () => {
    const tables = document.querySelectorAll("table.datadisplaytable caption");
    const meetingTables = [...tables].filter((c) => /Scheduled Meeting Times/.test(c.textContent)).length;
    expect(meetingTables).toBeGreaterThan(15);
    expect(cells.length).toBeGreaterThanOrEqual(meetingTables);
    for (const { cell } of cells) expect(cell.textContent).toMatch(/\(\s*P\s*\)|TBA/);
  });

  test("parses full first names", () => {
    const names = cells.map(({ cell }) => parseBanner8Instructors(cell.textContent)).filter(Boolean);
    expect(names.map((n) => `${n.firstName} ${n.lastName}`)).toContain("David Steinberg");
    expect(names.every((n) => n.firstName.length > 1)).toBe(true);
  });

  test("every meeting row resolves to its own section's course code", () => {
    const titles = [...document.querySelectorAll("th.ddtitle")].map((t) => t.textContent);
    expect(titles.length).toBeGreaterThan(15);
    // One cell per data row of every Scheduled Meeting Times table (a section can have several meetings).
    const meetingRows = [...document.querySelectorAll("table.datadisplaytable")]
      .filter((t) => /Scheduled Meeting Times/.test(t.caption?.textContent || ""))
      .reduce((n, t) => n + (t.rows.length - 1), 0);
    expect(cells.length).toBe(meetingRows);
    expect(new Set(cells.map(({ cell }) => cell)).size).toBe(cells.length);
    for (const { cell, courseInfo } of cells) {
      expect(courseInfo).not.toBeNull();
      expect(courseInfo.courseCode).toMatch(/^MATH\d{3}/);
      // Independent check: the nearest th.ddtitle above this cell in document order.
      const all = [...document.querySelectorAll("th.ddtitle, td")];
      const idx = all.indexOf(cell);
      const title = all.slice(0, idx).reverse().find((el) => el.tagName === "TH").textContent;
      expect(title).toContain(`- ${courseInfo.subject} ${courseInfo.courseCode.slice(courseInfo.subject.length)} -`);
    }
  });
});

describe("Class Schedule Listing (synthetic edge cases)", () => {
  function listing(sections) {
    return `<table class="datadisplaytable"><caption class="captiontext">Sections Found</caption>${sections
      .map(
        ([title, instr]) =>
          `<tr><th class="ddtitle" scope="colgroup"><a href="#">${title}</a></th></tr>` +
          `<tr><td class="dddefault">Body text<br><table class="datadisplaytable"><caption class="captiontext">Scheduled Meeting Times</caption>` +
          `<tr><th class="ddheader">Time</th><th class="ddheader">Days</th><th class="ddheader">Instructors</th></tr>` +
          `<tr><td class="dddefault">9:00am</td><td class="dddefault">MWF</td><td class="dddefault">${instr}</td></tr></table></td></tr>`
      )
      .join("")}</table>`;
  }

  test("2-digit course numbers, hyphenated titles, and no leak from the previous section", () => {
    document.body.innerHTML = listing([
      ["Composition - 13235 - ENG 101 - 0", "Ann Writer (P)"],
      ["Remedial Algebra - 13236 - MATH 95 - 0", "Bob Counter (P)"],
      ["Intro to AI - Honors - 16698 - CS 109 - 0", "Cat Thinker (P)"],
      ["Mystery Seminar with no code", "Dan Unknown (P)"],
    ]);
    const found = findInstructorCells();
    expect(found.map(({ courseInfo }) => courseInfo)).toEqual([
      { subject: "ENG", courseCode: "ENG101" },
      { subject: "MATH", courseCode: "MATH95" },
      { subject: "CS", courseCode: "CS109" },
      null,
    ]);
  });
});

describe("Look Up Classes (synthetic bwskfcls.P_GetCrse table)", () => {
  beforeAll(() => {
    document.body.innerHTML = `
      <table class="datadisplaytable" summary="This layout table is used to present the sections found">
        <caption class="captiontext">Sections Found</caption>
        <tr><th class="ddtitle" colspan="20">Computer Science</th></tr>
        <tr>
          <th class="ddheader" scope="col">Select</th><th class="ddheader" scope="col">CRN</th>
          <th class="ddheader" scope="col"><abbr title="Subject">Subj</abbr></th>
          <th class="ddheader" scope="col"><abbr title="Course">Crse</abbr></th>
          <th class="ddheader" scope="col">Sec</th><th class="ddheader" scope="col">Title</th>
          <th class="ddheader" scope="col"><abbr title="Instructor">Instructor</abbr></th>
          <th class="ddheader" scope="col">Date (MM/DD)</th>
        </tr>
        <tr>
          <td class="dddefault"><input type="checkbox" name="sel_crn" value="11659 202601"></td>
          <td class="dddefault">11659</td><td class="dddefault">CS</td><td class="dddefault">102</td>
          <td class="dddefault">0</td><td class="dddefault">Fnd of Comp Security</td>
          <td class="dddefault">Dan  Carrere (<abbr title="Primary">P</abbr>)</td>
          <td class="dddefault">09/28-12/06</td>
        </tr>
        <tr>
          <td class="dddefault">C</td>
          <td class="dddefault">16698</td><td class="dddefault">CS</td><td class="dddefault">109</td>
          <td class="dddefault">0</td><td class="dddefault">Intro to AI</td>
          <td class="dddefault">TBA</td>
          <td class="dddefault">09/28-12/06</td>
        </tr>
      </table>`;
  });

  test("finds the Instructor column and the Subj/Crse course code on each row", () => {
    const found = findInstructorCells();
    expect(found.map(({ cell }) => cell.textContent.trim())).toEqual(["Dan  Carrere (P)", "TBA"]);
    expect(found[0].courseInfo).toEqual({ subject: "CS", courseCode: "CS102" });
    expect(found[1].courseInfo).toEqual({ subject: "CS", courseCode: "CS109" });
    expect(parseBanner8Instructors(found[0].cell.textContent)).toMatchObject({ firstName: "Dan", lastName: "Carrere" });
    expect(parseBanner8Instructors(found[1].cell.textContent)).toBeNull();
  });

  test("continuation rows carry the course forward: blank Subj/Crse and short rows", () => {
    const table = document.querySelector("table.datadisplaytable");
    table.insertAdjacentHTML(
      "beforeend",
      '<tr><td class="dddefault">&nbsp;</td><td class="dddefault">&nbsp;</td><td class="dddefault">&nbsp;</td><td class="dddefault">&nbsp;</td>' +
        '<td class="dddefault">&nbsp;</td><td class="dddefault">&nbsp;</td><td class="dddefault">Eve  Lab (<abbr title="Primary">P</abbr>)</td><td class="dddefault">10/01-10/02</td></tr>' +
        '<tr><td class="dddefault">Fay Short (P)</td><td class="dddefault">10/03</td></tr>'
    );
    const found = findInstructorCells();
    expect(found.map(({ cell }) => cell.textContent.trim())).toEqual(["Dan  Carrere (P)", "TBA", "Eve  Lab (P)", "Fay Short (P)"]);
    expect(found[2].courseInfo).toEqual({ subject: "CS", courseCode: "CS109" });
    expect(found[3].courseInfo).toEqual({ subject: "CS", courseCode: "CS109" });
  });
});
