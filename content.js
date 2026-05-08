// name-parser.js is loaded before this file (see manifest content_scripts array)
// parseInstructorCell() is available as a global

const BADGE_ATTR = "data-rmp-badge";

// In-memory cache per page load — avoids duplicate RMP calls for same professor
const rmpCache = new Map();

async function searchProfessor(lastName, firstInitial) {
  const key = `${lastName}_${firstInitial}`.toLowerCase();
  if (rmpCache.has(key)) return rmpCache.get(key);

  const promise = chrome.runtime
    .sendMessage({ type: "rmp:search", lastName, firstInitial })
    .then((resp) => {
      if (resp?.error) {
        console.error("[RMP] background error:", resp.error);
        return null;
      }
      return resp?.result ?? null;
    })
    .catch((err) => {
      console.error("[RMP] message failed:", err.message);
      return null;
    });

  rmpCache.set(key, promise);
  return promise;
}

function ratingTier(rating) {
  if (rating == null) return "none";
  if (rating >= 4.0) return "good";
  if (rating >= 3.0) return "ok";
  return "bad";
}

function makeCol(label, value) {
  const col = document.createElement("div");
  col.className = "rmp-col";

  const valueEl = document.createElement("span");
  valueEl.className = "rmp-col__value";
  valueEl.textContent = value;

  const labelEl = document.createElement("span");
  labelEl.className = "rmp-col__label";
  labelEl.textContent = label;

  col.appendChild(valueEl);
  col.appendChild(labelEl);
  return col;
}

function injectBadge(element, data) {
  const wrap = document.createElement("div");
  wrap.className = "rmp-container";

  if (!data) {
    const empty = document.createElement("span");
    empty.className = "rmp-empty";
    empty.textContent = "No RMP data";
    wrap.appendChild(empty);
    element.appendChild(wrap);
    return;
  }

  const tier = ratingTier(data.rating);
  const tooltip =
    `${data.name} — ${data.numRatings} ratings on Rate My Professors\n` +
    `Rating: ${data.rating}/5  ·  Difficulty: ${data.difficulty}/5` +
    (data.wouldTakeAgainPct > 0 ? `  ·  Would take again: ${data.wouldTakeAgainPct}%` : "");

  const card = document.createElement("a");
  card.href = data.rmpUrl;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  card.className = `rmp-card rmp-card--${tier}`;
  card.title = tooltip;

  const row = document.createElement("div");
  row.className = "rmp-row";
  row.appendChild(makeCol("Rating", data.rating.toFixed(1)));
  row.appendChild(makeCol("Diff", data.difficulty.toFixed(1)));
  if (data.wouldTakeAgainPct > 0) {
    row.appendChild(makeCol("Retake", `${data.wouldTakeAgainPct}%`));
  }

  const bar = document.createElement("div");
  bar.className = "rmp-bar";
  const fill = document.createElement("div");
  fill.className = "rmp-bar__fill";
  // Rating scale is 1–5 (1 = minimum), so normalize to (rating - 1) / 4
  const ratingPct = Math.max(0, Math.min(100, ((data.rating - 1) / 4) * 100));
  fill.style.width = `${ratingPct}%`;
  bar.appendChild(fill);

  card.appendChild(row);
  card.appendChild(bar);
  wrap.appendChild(card);
  element.appendChild(wrap);
}

function processElement(element, parsed) {
  if (element.hasAttribute(BADGE_ATTR)) return;
  if (!parsed) {
    parsed = parseInstructorCell(element.textContent);
    if (!parsed) return;
  }

  element.setAttribute(BADGE_ATTR, "pending");

  searchProfessor(parsed.lastName, parsed.firstInitial).then((result) => {
    injectBadge(element, result);
    element.setAttribute(BADGE_ATTR, "done");
  });
}

function scanPage() {
  // Find every text node containing "(Primary)" or "(Secondary)", then walk up
  // to the smallest ancestor whose textContent contains the full instructor
  // pattern. Works for both:
  //   - Search results table cells (TDs)
  //   - Schedule Details inline blocks ("Instructor: Williams, J. (Primary)")
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
    processElement(container, parsed);
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
