// PeopleSoft Campus Solutions adapter.
// Matches the standard public Class Search component shipped by Oracle —
// `COMMUNITY_ACCESS.CLASS_SEARCH.GBL` — used by hundreds of universities
// (NAU, U Houston, FIU, Ohio State, SF State, and many more).
//
// DOM strategy: PeopleSoft renders results as a table per course. Each row's
// instructor is in a span with id="MTG_INSTR$N" (sequential). Names are in
// "Firstname Lastname" format (sometimes ALL CAPS), with "To be Announced" as
// the placeholder. Course code lives in an ancestor PSGROUPBOXLABEL — the
// shared findCourseInfo walker picks it up automatically.

(function () {
  // Reject placeholders + degree suffixes that PS sometimes appends.
  const PS_PLACEHOLDER_RE = /^(to\s*be\s*announced|staff|tba|tbd)$/i;
  const PS_SUFFIX_RE = /^(jr|sr|i{1,3}|iv|v|ph\.?d\.?|m\.?d\.?|esq)\.?$/i;

  function parsePeopleSoftName(text) {
    if (!text) return null;
    const trimmed = text.trim().replace(/\s+/g, " ");
    if (!trimmed || PS_PLACEHOLDER_RE.test(trimmed)) return null;

    // PeopleSoft sometimes puts multiple instructors comma-separated in one
    // cell. Take the first; that's the primary.
    const primary = trimmed.split(/[,;]/)[0].trim();
    if (!primary) return null;

    let parts = primary.split(/\s+/).filter(Boolean);
    while (parts.length > 2 && PS_SUFFIX_RE.test(parts[parts.length - 1])) {
      parts.pop();
    }
    if (parts.length < 2) return null;

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    const firstInitial = firstName[0]?.toUpperCase();
    if (!firstInitial || !lastName) return null;

    return {
      firstName,
      lastName,
      firstInitial,
      isPrimary: true,
      searchName: `${lastName} ${firstInitial}`,
    };
  }

  function peopleSoftMatches(loc) {
    return /COMMUNITY_ACCESS\.CLASS_SEARCH\.GBL/i.test(loc.href);
  }

  function peopleSoftScan(RMP) {
    const cells = document.querySelectorAll('span[id^="MTG_INSTR$"]');
    for (const cell of cells) {
      // Use the parent <td> as the inject target so the badge sits cleanly
      // below the name within the cell, not next to the text.
      const target = cell.closest("td") || cell.parentElement;
      if (!target) continue;

      const parsed = parsePeopleSoftName(cell.textContent);
      if (!parsed) continue;

      RMP.processInstructorElement(target, parsed);
    }
  }

  function peopleSoftInit() {
    const RMP = window.RMP;
    peopleSoftScan(RMP);

    // PeopleSoft does AJAX for sort/filter; re-scan on DOM mutations.
    let scanTimer = null;
    const observer = new MutationObserver(() => {
      // If the extension was reloaded/updated while this page is open, the
      // content script is orphaned; stop observing.
      if (!chrome?.runtime?.id) {
        observer.disconnect();
        return;
      }
      clearTimeout(scanTimer);
      scanTimer = setTimeout(() => peopleSoftScan(RMP), 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Browser-side: register the adapter if common.js loaded.
  if (typeof window !== "undefined" && window.RMP && window.RMP.registerAdapter) {
    window.RMP.registerAdapter({
      name: "peoplesoft",
      matches: peopleSoftMatches,
      init: peopleSoftInit,
    });
  }

  // Node-side (Jest): expose the parser + matcher for tests.
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parsePeopleSoftName, peopleSoftMatches };
  }
})();
