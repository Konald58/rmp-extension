// University of Oregon DuckWeb adapter.
// DuckWeb is UO's custom Banner 8 PL/SQL class schedule
// (duckweb.uoregon.edu/duckweb/hwskdhnt.*). It is not Banner SSB9: there is no
// "(Primary)" marker and instructors render as "Lastname F" (last name plus a
// bare first initial) in a td under an "Instructor" column header.
//
// DOM strategy: every results table is `table.datadisplaytable`. Inside it, a
// header row has a cell whose text is exactly "Instructor"; data rows with the
// same cell count carry the instructor at that column index. One table holds
// every course on the page, so the shared ancestor walker would always return
// the first course code on the page. Instead, the course code is read from the
// nearest preceding course-header row ("CS 102  Fnd of Comp Security").

(function () {
  const DW_PLACEHOLDER_RE = /^(staff|tba|tbd|to\s*be\s*announced)$/i;
  // "Lastname F", "Armenta Vega A", "Sheldon-Young P", "O'Brien K", "St. John M",
  // "Smith J A" (first initial J, trailing middle initial ignored). Name parts
  // need 2+ chars so a bare initial is never absorbed into the last name, and
  // the part class excludes the separators so the regex cannot backtrack.
  const DW_NAME_RE =
    /^([A-Za-zÀ-ÿ'.]{2,}(?:[ \-][A-Za-zÀ-ÿ'.]{2,})*)\s+([A-Za-zÀ-ÿ])\.?(?:\s+[A-Za-zÀ-ÿ]\.?)?$/;
  const DW_COURSE_RE = /^\s*([A-Z]{2,4})\s+(\d{3}[A-Z]?)\b/;

  function parseDuckWebName(text) {
    if (!text) return null;
    const trimmed = text.trim().replace(/\s+/g, " ");
    if (!trimmed || DW_PLACEHOLDER_RE.test(trimmed)) return null;
    const m = trimmed.match(DW_NAME_RE);
    if (!m) return null;
    const lastName = m[1].trim();
    if (DW_PLACEHOLDER_RE.test(lastName)) return null;
    const firstInitial = m[2].toUpperCase();
    return {
      lastName,
      firstInitial,
      isPrimary: true,
      searchName: `${lastName} ${firstInitial}`,
    };
  }

  function duckWebMatches(loc) {
    return /\/duckweb\/hwskdhnt\./i.test(loc.href);
  }

  function cellsOf(row) {
    return Array.from(row.children).filter((c) => /^T[DH]$/.test(c.tagName));
  }

  function courseOf(cells) {
    const m = cells[0] && (cells[0].textContent || "").match(DW_COURSE_RE);
    return m ? { subject: m[1], courseCode: `${m[1]}${m[2]}` } : null;
  }

  // One pass over every row of every results table. Yields
  // { cell, row, courseInfo } for each instructor cell. Handles:
  //   - the header row ("Instructor" cell) that fixes the column index,
  //   - full data rows (same cell count as the header),
  //   - short continuation rows: a second instructor or meeting sits in its
  //     own <tr> while CRN/Avail/Max/Time carry rowspan=2, so the row has
  //     fewer cells. The instructor cell is then found by the header cell's
  //     width attribute, falling back to a name-shaped cell.
  //   - course headers ("CS 102  Fnd of Comp Security") that set the course
  //     for the rows that follow. One table holds every course on the page,
  //     so this cannot come from an ancestor walk.
  function findInstructorCells() {
    const found = [];
    for (const table of document.querySelectorAll("table.datadisplaytable")) {
      let instrIdx = -1;
      let headerCount = 0;
      let instrWidth = null;
      let courseInfo = null;
      for (const row of Array.from(table.rows)) {
        if (row.closest("table") !== table) continue; // row of a nested table
        const cells = cellsOf(row);
        if (!cells.length) continue;

        const course = courseOf(cells);
        if (course) {
          courseInfo = course;
          continue;
        }
        const hdr = cells.findIndex((c) => (c.textContent || "").trim() === "Instructor");
        if (hdr !== -1) {
          instrIdx = hdr;
          headerCount = cells.length;
          instrWidth = cells[hdr].getAttribute("width");
          continue;
        }
        if (instrIdx === -1) continue;

        let cell = null;
        if (cells.length === headerCount) {
          cell = cells[instrIdx];
        } else if (cells.length < headerCount) {
          cell =
            (instrWidth && cells.find((c) => c.getAttribute("width") === instrWidth)) ||
            cells.find((c) => DW_NAME_RE.test((c.textContent || "").trim())) ||
            null;
        }
        if (cell) found.push({ cell, row, courseInfo });
      }
    }
    return found;
  }

  function duckWebScan(RMP) {
    for (const { cell, courseInfo } of findInstructorCells()) {
      if (cell.hasAttribute(RMP.BADGE_ATTR)) continue;
      const parsed = parseDuckWebName(cell.textContent);
      if (!parsed) continue;
      RMP.processInstructorElement(cell, parsed, courseInfo);
    }
  }

  function duckWebInit() {
    const RMP = window.RMP;
    duckWebScan(RMP);
    // DuckWeb is server-rendered, but keep a light observer so a future
    // AJAX-loaded variant still gets picked up.
    let scanTimer = null;
    const observer = new MutationObserver(() => {
      if (!chrome?.runtime?.id) {
        observer.disconnect();
        return;
      }
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => duckWebScan(RMP), 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (typeof window !== "undefined" && window.RMP && window.RMP.registerAdapter) {
    window.RMP.registerAdapter({
      name: "duckweb",
      matches: duckWebMatches,
      init: duckWebInit,
    });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseDuckWebName, duckWebMatches, findInstructorCells };
  }
})();
