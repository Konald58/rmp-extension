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
  const B8_PARTICLES = new Set(["de", "la", "le", "del", "della", "der", "den", "di", "da", "du", "van", "von", "st", "st."]);
  // "Title - 13236 - MATH 95 - 0": CRN, then subject and course number.
  const B8_TITLE_COURSE_RE = /-\s*\d{4,6}\s*-\s*([A-Z]{2,4})\s+(\d{2,4}[A-Z]{0,2})\s*-/;
  const B8_PRIMARY_RE = /\(\s*P\s*\)/i;

  // "Maria De La Cruz" -> first "Maria", last "De La Cruz".
  function parseFullName(text) {
    const trimmed = (text || "").trim().replace(/\s+/g, " ");
    if (!trimmed || B8_PLACEHOLDER_RE.test(trimmed)) return null;
    const parts = trimmed.split(" ").filter(Boolean);
    while (parts.length > 2 && B8_SUFFIX_RE.test(parts[parts.length - 1])) parts.pop();
    if (parts.length < 2) return null;
    const firstName = parts[0];
    let lastStart = parts.length - 1;
    while (lastStart > 1 && B8_PARTICLES.has(parts[lastStart - 1].toLowerCase())) lastStart--;
    const lastName = parts.slice(lastStart).join(" ");
    const firstInitial = firstName[0]?.toUpperCase();
    if (!firstInitial || !/[A-Za-zÀ-ÿ]/.test(firstInitial)) return null;
    return { firstName, lastName, firstInitial, isPrimary: true, searchName: `${lastName} ${firstInitial}` };
  }

  // Split an instructor cell into one entry per person. Handles
  // "Dan Carrere (P), Jane Q Doe", "Smith, John (P)" (Last, First sites) and
  // "John Smith, Jr. (P)" (suffix after a comma).
  function splitInstructors(text) {
    const segments = text
      .replace(/\u00a0/g, " ")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);
    const entries = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const bare = seg.replace(B8_PRIMARY_RE, " ").trim();
      if (B8_SUFFIX_RE.test(bare) && entries.length) {
        entries[entries.length - 1] += seg.includes("(P)") ? " (P)" : "";
        continue;
      }
      const next = segments[i + 1];
      const nextBare = next ? next.replace(B8_PRIMARY_RE, " ").trim() : "";
      const nextTokens = nextBare ? nextBare.split(/\s+/).length : 0;
      if (!bare.includes(" ") && next && nextTokens >= 1 && nextTokens <= 3 && !B8_SUFFIX_RE.test(nextBare)) {
        // "Last, First [Middle]" -> "First [Middle] Last"
        entries.push(`${nextBare} ${bare}${B8_PRIMARY_RE.test(seg + next) ? " (P)" : ""}`);
        i++;
        continue;
      }
      entries.push(seg);
    }
    return entries;
  }

  function parseBanner8Instructors(text) {
    if (!text) return null;
    const entries = splitInstructors(text);
    if (!entries.length) return null;
    const primary = entries.find((e) => B8_PRIMARY_RE.test(e)) || entries[0];
    const parsed = parseFullName(primary.replace(B8_PRIMARY_RE, " "));
    if (parsed) parsed.isPrimary = entries.length === 1 || B8_PRIMARY_RE.test(primary);
    return parsed;
  }

  function banner8Matches(loc) {
    const path = loc.pathname || "";
    return /\/(bwckschd\.p_(get_crse_unsec|disp_detail_sched|disp_listcrse)|bwskfcls\.P_GetCrse)/i.test(path);
  }

  function cellsOf(row) {
    return Array.from(row.children).filter((c) => /^T[DH]$/.test(c.tagName));
  }

  function headerIndex(cells, names) {
    return cells.findIndex((c) => names.includes((c.textContent || "").trim().toLowerCase()));
  }

  // Scheduled Meeting Times: the table lives in a section body <td>; the
  // row right before that body holds <th class="ddtitle"> "Title - CRN - SUBJ NUM - SEC".
  // Only that row is inspected: anything further back belongs to another section.
  function courseFromSectionTitle(table) {
    const body = table.closest("td");
    const bodyRow = body && body.closest("tr");
    const titleRow = bodyRow && bodyRow.previousElementSibling;
    if (!titleRow || !titleRow.querySelector("th.ddtitle")) return null;
    const m = (titleRow.textContent || "").match(B8_TITLE_COURSE_RE);
    return m ? { subject: m[1], courseCode: `${m[1]}${m[2]}` } : null;
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
  // Look Up Classes continuation rows (extra meetings of one CRN) leave Subj
  // and Crse blank or drop leading cells, so the last course seen in the table
  // carries forward and a short row's instructor cell is found by its text.
  function findInstructorCells() {
    const found = [];
    for (const table of document.querySelectorAll("table.datadisplaytable")) {
      let instrIdx = -1;
      let subjIdx = -1;
      let crseIdx = -1;
      let headerCount = 0;
      let titleCourse;
      let lastCourse = null;
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
        if (instrIdx === -1 || cells.length > headerCount) continue;

        let cell = null;
        if (cells.length === headerCount) {
          cell = cells[instrIdx];
        } else {
          cell = cells.find((c) => parseBanner8Instructors(c.textContent)) || null;
        }
        if (!cell) continue;

        let courseInfo = courseFromRow(cells, subjIdx, crseIdx);
        if (!courseInfo && subjIdx === -1) {
          if (titleCourse === undefined) titleCourse = courseFromSectionTitle(table);
          courseInfo = titleCourse;
        }
        if (!courseInfo) courseInfo = lastCourse;
        lastCourse = courseInfo;
        found.push({ cell, courseInfo });
      }
    }
    return found;
  }

  function banner8Scan(RMP) {
    if (!chrome?.runtime?.id) return; // orphaned after an extension reload
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
