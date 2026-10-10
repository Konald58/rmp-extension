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
  // "Lastname F", "Armenta Vega A", "Sheldon-Young P", "O'Brien K".
  const DW_NAME_RE = /^([A-Za-zÀ-ÿ'\-]+(?:[ \-][A-Za-zÀ-ÿ'\-]+)*)\s+([A-Za-z])\.?$/;
  const DW_COURSE_RE = /^\s*([A-Z]{2,4})\s+(\d{3}[A-Z]?)\b/;

  function parseDuckWebName(text) {
    if (!text) return null;
    const trimmed = text.replace(/ /g, " ").trim().replace(/\s+/g, " ");
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

  // Walk backwards over sibling rows to the nearest course header
  // ("CS 102  Fnd of Comp Security"). Returns { subject, courseCode } or null.
  function duckWebCourseInfo(row) {
    let r = row.previousElementSibling;
    for (let depth = 0; r && depth < 60; depth++, r = r.previousElementSibling) {
      const first = r.firstElementChild;
      if (!first) continue;
      const m = (first.textContent || "").replace(/ /g, " ").match(DW_COURSE_RE);
      if (m) return { subject: m[1], courseCode: `${m[1]}${m[2]}` };
    }
    return null;
  }

  function cellsOf(row) {
    return Array.from(row.children).filter((c) => /^T[DH]$/.test(c.tagName));
  }

  // Yields { cell, row } for every instructor cell on the page.
  function findInstructorCells() {
    const found = [];
    const tables = document.querySelectorAll("table.datadisplaytable");
    for (const table of tables) {
      // Direct rows only: nested tables (Grading Options) are separate tables.
      const rows = Array.from(table.querySelectorAll(":scope > tbody > tr, :scope > tr"));
      let instrIdx = -1;
      let headerCount = 0;
      for (const row of rows) {
        const cells = cellsOf(row);
        const hdr = cells.findIndex((c) => (c.textContent || "").trim() === "Instructor");
        if (hdr !== -1) {
          instrIdx = hdr;
          headerCount = cells.length;
          continue;
        }
        if (instrIdx === -1 || cells.length !== headerCount) continue;
        found.push({ cell: cells[instrIdx], row });
      }
    }
    return found;
  }

  function duckWebScan(RMP) {
    for (const { cell, row } of findInstructorCells()) {
      if (cell.hasAttribute(RMP.BADGE_ATTR)) continue;
      const parsed = parseDuckWebName(cell.textContent);
      if (!parsed) continue;
      RMP.processInstructorElement(cell, parsed, duckWebCourseInfo(row));
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
    module.exports = { parseDuckWebName, duckWebMatches, duckWebCourseInfo, findInstructorCells };
  }
})();
