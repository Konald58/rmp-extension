// name-parser.js is loaded before this file (see manifest content_scripts array)
// parseInstructorCell() is available as a global

const BADGE_ATTR = "data-rmp-badge";

function ratingClass(rating) {
  if (rating == null) return "rmp-badge--none";
  if (rating >= 4.0) return "rmp-badge--good";
  if (rating >= 3.0) return "rmp-badge--ok";
  return "rmp-badge--bad";
}

function injectBadge(element, data) {
  if (!data) {
    const badge = document.createElement("span");
    badge.className = "rmp-badge rmp-badge--none";
    badge.textContent = "No RMP data";
    element.appendChild(document.createElement("br"));
    element.appendChild(badge);
    return;
  }

  const againText =
    data.wouldTakeAgainPct > 0 ? ` · ${data.wouldTakeAgainPct}% again` : "";

  const badge = document.createElement("a");
  badge.href = data.rmpUrl;
  badge.target = "_blank";
  badge.rel = "noopener noreferrer";
  badge.className = `rmp-badge ${ratingClass(data.rating)}`;
  badge.textContent = `⭐ ${data.rating} · diff ${data.difficulty}${againText}`;
  badge.title = `${data.name} — ${data.numRatings} ratings on Rate My Professors`;

  element.appendChild(document.createElement("br"));
  element.appendChild(badge);
}

function processElement(element) {
  if (element.hasAttribute(BADGE_ATTR)) return;
  const text = element.textContent.trim();
  const parsed = parseInstructorCell(text);
  if (!parsed) return;

  element.setAttribute(BADGE_ATTR, "pending");

  chrome.runtime.sendMessage(
    { action: "getRating", lastName: parsed.lastName, firstInitial: parsed.firstInitial },
    (result) => {
      if (chrome.runtime.lastError) {
        element.removeAttribute(BADGE_ATTR);
        return;
      }
      injectBadge(element, result || null);
      element.setAttribute(BADGE_ATTR, "done");
    }
  );
}

function scanPage() {
  // Banner renders displayName ("Cainas, J.") as a link and "(Primary)" as a
  // separate text node — so we can't match both in a single text node.
  // Instead: find "(Primary)" text nodes, walk up to the TD, process the TD
  // whose full textContent gives us the combined "Cainas, J. (Primary)" string.
  const seen = new Set();
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  let node;
  while ((node = walker.nextNode())) {
    const t = node.textContent;
    if (!t.includes("(Primary)") && !t.includes("(Secondary)")) continue;
    let el = node.parentElement;
    while (el && el.tagName !== "TD" && el !== document.body) {
      el = el.parentElement;
    }
    if (!el || el.tagName !== "TD" || seen.has(el)) continue;
    seen.add(el);
    processElement(el);
  }
}

// Initial scan after DOM is ready
scanPage();

// Watch for dynamic table loads (Banner uses AJAX for course search results)
// Debounced to avoid re-scanning on every badge injection
let scanTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(scanTimer);
  scanTimer = setTimeout(scanPage, 150);
});
observer.observe(document.body, { childList: true, subtree: true });
