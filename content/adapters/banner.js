// Banner SSB9 adapter.
// Matches Ellucian Banner Self-Service course registration pages — used by
// roughly 1,400 universities (USF, UF, FSU, UCF, FIU, Penn State, etc.).
//
// DOM strategy: walk text nodes for "(Primary)" or "(Secondary)" — Banner's
// hallmark instructor-role markers — then walk up to the smallest ancestor
// whose textContent matches the full instructor pattern. Works in both:
//   - search-results table cells
//   - Schedule Details inline blocks ("Instructor: Lastname, F. (Primary)")

(function () {
  const RMP = window.RMP;
  if (!RMP) {
    console.error("[RMP] common.js must load before adapters/banner.js");
    return;
  }

  function matches(loc) {
    const url = loc.href;
    return (
      /\/StudentRegistrationSsb\//i.test(url) ||
      /\/ssb\/.*classRegistration/i.test(url) ||
      /\/ssb\/.*scheduleDetails/i.test(url)
    );
  }

  function scanPage() {
    const seen = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const t = node.textContent;
      if (!t.includes("(Primary)") && !t.includes("(Secondary)")) continue;

      let container = node.parentElement;
      let parsed = null;
      let depth = 0;
      while (container && container !== document.body && depth < 6) {
        parsed = parseInstructorCell(container.textContent);
        if (parsed) break;
        container = container.parentElement;
        depth++;
      }

      if (!parsed || !container || seen.has(container)) continue;
      seen.add(container);
      RMP.processInstructorElement(container, parsed);
    }
  }

  function init() {
    // Initial scan after DOM is ready (manifest sets run_at: document_idle)
    scanPage();

    // Banner uses AJAX for search results — re-scan on DOM mutations.
    let scanTimer = null;
    const observer = new MutationObserver(() => {
      clearTimeout(scanTimer);
      scanTimer = setTimeout(scanPage, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  RMP.registerAdapter({ name: "banner", matches, init });
})();
