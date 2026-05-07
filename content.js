// name-parser.js is loaded before this file (see manifest content_scripts array)
// parseInstructorCell() is available as a global

const BADGE_ATTR = "data-rmp-badge";
const RMP_URL = "https://www.ratemyprofessors.com/graphql";
const USF_ID = "U2Nob29sLTEyNjI=";

// In-memory cache per page load — avoids duplicate RMP calls for same professor
const rmpCache = new Map();

function professorUrl(id) {
  try {
    const numeric = atob(id).split("-").pop();
    return `https://www.ratemyprofessors.com/professor/${numeric}`;
  } catch {
    return "https://www.ratemyprofessors.com";
  }
}

async function searchProfessor(lastName, firstInitial) {
  const key = `${lastName}_${firstInitial}`.toLowerCase();
  if (rmpCache.has(key)) return rmpCache.get(key);

  // Mark in-flight to prevent duplicate requests for same professor
  rmpCache.set(key, null);

  const query = `{ newSearch { teachers(query: {text: "${lastName}", schoolID: "${USF_ID}"}) { edges { node { id firstName lastName department avgRating avgDifficulty wouldTakeAgainPercent numRatings } } } } }`;

  let data;
  try {
    const resp = await fetch(RMP_URL, {
      method: "POST",
      // text/plain avoids CORS preflight; content scripts with host_permissions
      // bypass CORS so no Access-Control-Allow-Origin header is required.
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ query }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = await resp.json();
  } catch (err) {
    console.error("[RMP] fetch failed:", err.message);
    return null;
  }

  const edges = data?.data?.newSearch?.teachers?.edges ?? [];
  const professors = edges.map((e) => e.node);

  const match =
    professors.find(
      (p) =>
        p.lastName.toLowerCase() === lastName.toLowerCase() &&
        p.firstName?.[0]?.toUpperCase() === firstInitial.toUpperCase()
    ) || professors.find((p) => p.lastName.toLowerCase() === lastName.toLowerCase());

  const result = match
    ? {
        name: `${match.firstName} ${match.lastName}`,
        rating: match.avgRating,
        difficulty: match.avgDifficulty,
        wouldTakeAgainPct: Math.round(match.wouldTakeAgainPercent || 0),
        numRatings: match.numRatings,
        rmpUrl: professorUrl(match.id),
      }
    : null;

  rmpCache.set(key, result);
  return result;
}

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

  const againText = data.wouldTakeAgainPct > 0 ? ` · ${data.wouldTakeAgainPct}% again` : "";
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

  searchProfessor(parsed.lastName, parsed.firstInitial).then((result) => {
    injectBadge(element, result);
    element.setAttribute(BADGE_ATTR, "done");
  });
}

function scanPage() {
  // Banner renders displayName ("Cainas, J.") as a link and "(Primary)" as a
  // separate text node — so we can't match both in a single text node.
  // Find "(Primary)" text nodes, walk up to the TD, use its full textContent.
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
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
