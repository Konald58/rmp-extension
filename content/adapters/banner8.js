// Ellucian Banner 8 Self-Service adapter (the classic, pre-SSB9 web pages).
// Still the live registration system at a long tail of universities; UO's
// DuckWeb is one. Covers the three pages where instructor names appear:
//   - bwckschd.p_get_crse_unsec   "Class Schedule Listing" (public dynamic schedule)
//   - bwckschd.p_disp_detail_sched "Detailed Class Information" (one section)
//   - bwskfcls.P_GetCrse*          "Look Up Classes" results (logged-in registration)
//
// DOM strategy: every grid is `table.datadisplaytable`. A header cell reads
// "Instructors" (Scheduled Meeting Times tables) or "Instructor" (Look Up
// Classes). The cell under it holds "Dan Carrere (P)", several instructors
// comma-separated, with the primary marked "(P)". Full first names are
// present, so they are passed through for disambiguation.
//
// Course code: Scheduled Meeting Times tables sit inside a section body
// whose title row reads "Title - CRN - CS 102 - 0"; Look Up Classes rows
// carry Subj and Crse columns. Both are resolved here rather than by the
// shared ancestor walker, which would see every section on the page.

(function () {
  const B8_PLACEHOLDER_RE = /^(tba|tbd|staff|to\s*be\s*announced|instructor)$/i;
  const B8_SUFFIX_RE = /^(jr|sr|i{1,3}|iv|v|ph\.?d\.?|m\.?d\.?|esq)\.?$/i;
  const B8_TITLE_COURSE_RE = /-\s*\d{4,6}\s*-\s*([A-Z]{2,4})\s+(\d{3,4}[A-Z]?)\s*-/;

  function parseFullName(text) {
    const trimmed = (text || "").trim().replace(/\s+/g, " ");
    if (!trimmed || B8_PLACEHOLDER_RE.test(trimmed)) return null;
    let parts = trimmed.split(" ").filter(Boolean);
    while (parts.length > 2 && B8_SUFFIX_RE.test(parts[parts.length - 1])) parts.pop();
    if (parts.length < 2) return null;
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const firstInitial = firstName[0]?.toUpperCase();
    if (!firstInitial || !/[A-Za-zÀ-ÿ]/.test(firstInitial)) return null;
    return { firstName, lastName, firstInitial, isPrimary: true, searchName: `${lastName} ${firstInitial}` };
  }

  // "Dan Carrere (P), Jane Q Doe" -> primary instructor's parsed name.
  function parseBanner8Instructors(text) {
    if (!text) return null;
    const entries = text
      .replace(/ /g, " ")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    if (!entries.length) return null;
    const primary = entries.find((e) => /\(\s*P\s*\)/i.test(e)) || entries[0];
    const parsed = parseFullName(primary.replace(/\(\s*P\s*\)/gi, " "));
    if (parsed) parsed.isPrimary = entries.length === 1 || /\(\s*P\s*\)/i.test(primary);
    return parsed;
  }

  function banner8Matches(loc) {
    return /\/bwckschd\.p_(get_crse_unsec|disp_detail_sched|disp_listcrse)|\/bwskfcls\.P_GetCrse/i.test(
      loc.href
    );
  }

  function cellsOf(row) {
    return Array.from(row.children).filter((c) => /^T[DH]$/.test(c.tagName));
  }

  function headerIndex(cells, names) {
    return cells.findIndex((c) => names.includes((c.textContent || "").trim().toLowerCase()));
  }

  // Scheduled Meeting Times: the table lives in a section body <td>; the
  // row before that body holds the <th class="ddtitle"> "Title - CRN - SUBJ NUM - SEC".
  function courseFromSectionTitle(table) {
    const body = table.closest("td");
    const bodyRow = body && body.closest("tr");
    let r = bodyRow && bodyRow.previousElementSibling;
    for (let depth = 0; r && depth < 3; depth++, r = r.previousElementSibling) {
      const m = (r.textContent || "").match(B8_TITLE_COURSE_RE);
      if (m) return { subject: m[1], courseCode: `${m[1]}${m[2]}` };
    }
    return null;
  }

  // Look Up Classes: Subj and Crse columns on the same row.
  function courseFromRow(cells, subjIdx, crseIdx) {
    if (subjIdx < 0 || crseIdx < 0) return null;
    const subject = (cells[subjIdx]?.textContent || "").trim().toUpperCase();
    const number = (cells[crseIdx]?.textContent || "").trim();
    if (!/^[A-Z]{2,4}$/.test(subject)) return null;
    return { subject, courseCode: `${subject}${number}` };
  }

  // Yields { cell, courseInfo } for every instructor cell on the page.
  function findInstructorCells() {
    const found = [];
    for (const table of document.querySelectorAll("table.datadisplaytable")) {
      let instrIdx = -1;
      let subjIdx = -1;
      let crseIdx = -1;
      let headerCount = 0;
      let titleCourse;
      for (const row of Array.from(table.rows)) {
        if (row.closest("table") !== table) continue;
        const cells = cellsOf(row);
        if (!cells.length) continue;
        const hdr = headerIndex(cells, ["instructors", "instructor"]);
        if (hdr !== -1) {
          instrIdx = hdr;
          headerCount = cells.length;
          subjIdx = headerIndex(cells, ["subj", "subject"]);
          crseIdx = headerIndex(cells, ["crse", "course"]);
          continue;
        }
        if (instrIdx === -1 || cells.length !== headerCount) continue;
        let courseInfo = courseFromRow(cells, subjIdx, crseIdx);
        if (!courseInfo) {
          if (titleCourse === undefined) titleCourse = courseFromSectionTitle(table);
          courseInfo = titleCourse;
        }
        found.push({ cell: cells[instrIdx], courseInfo });
      }
    }
    return found;
  }

  function banner8Scan(RMP) {
    for (const { cell, courseInfo } of findInstructorCells()) {
      if (cell.hasAttribute(RMP.BADGE_ATTR)) continue;
      const parsed = parseBanner8Instructors(cell.textContent);
      if (!parsed) continue;
      RMP.processInstructorElement(cell, parsed, courseInfo);
    }
  }

  function banner8Init() {
    const RMP = window.RMP;
    banner8Scan(RMP);
    let scanTimer = null;
    const observer = new MutationObserver(() => {
      if (!chrome?.runtime?.id) {
        observer.disconnect();
        return;
      }
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => banner8Scan(RMP), 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (typeof window !== "undefined" && window.RMP && window.RMP.registerAdapter) {
    window.RMP.registerAdapter({ name: "banner8", matches: banner8Matches, init: banner8Init });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseBanner8Instructors, banner8Matches, findInstructorCells };
  }
})();
