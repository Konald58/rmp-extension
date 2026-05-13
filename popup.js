const searchInput = document.getElementById("search");
const results = document.getElementById("results");
const status = document.getElementById("status");
const currentEl = document.getElementById("current");
const currentName = document.getElementById("currentName");
const currentMeta = document.getElementById("currentMeta");

function encodeSchoolId(numericId) {
  return btoa(`School-${numericId}`);
}

function showStatus(message, isError = false) {
  status.textContent = message;
  status.className = "status show" + (isError ? " error" : "");
}

function renderCurrent(name, meta) {
  if (!name) {
    currentEl.style.display = "none";
    return;
  }
  currentName.textContent = name;
  currentMeta.textContent = meta || "";
  currentEl.style.display = "block";
}

// Load current selection
chrome.storage.sync.get(["schoolId", "schoolName", "schoolMeta"]).then((data) => {
  if (data.schoolName) {
    renderCurrent(data.schoolName, data.schoolMeta || `RMP ID ${data.schoolId}`);
  }
});

let searchTimer = null;
let currentQuery = "";

function clearResults() {
  results.innerHTML = "";
  results.classList.remove("show");
}

function renderLoading() {
  results.innerHTML = '<div class="loader">Searching…</div>';
  results.classList.add("show");
}

function renderEmpty() {
  results.innerHTML = '<div class="empty">No schools found. Try a different name.</div>';
  results.classList.add("show");
}

function renderResults(schools) {
  if (!schools.length) return renderEmpty();
  results.innerHTML = "";
  for (const school of schools) {
    const item = document.createElement("div");
    item.className = "result-item";
    item.dataset.id = school.id;
    item.dataset.graphqlId = school.graphqlId;
    item.dataset.name = school.name;
    item.dataset.meta = `${school.city || ""}${school.city && school.state ? ", " : ""}${school.state || ""}`;

    const name = document.createElement("div");
    name.className = "name";
    name.textContent = school.name;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = item.dataset.meta || "—";

    if (school.numRatings) {
      const count = document.createElement("span");
      count.className = "ratings-count";
      count.textContent = `${school.numRatings.toLocaleString()} ratings`;
      name.appendChild(count);
    }

    item.appendChild(name);
    item.appendChild(meta);
    item.addEventListener("click", () => selectSchool(item.dataset));
    results.appendChild(item);
  }
  results.classList.add("show");
}

// Dedupe schools that share the same name (e.g. NAU Flagstaff/Online/Phoenix/Yuma).
// Most multi-campus schools share a single registration system, so picking the
// canonical (highest-rated) entry per name reduces clutter without losing the
// professor data students actually look for. RMP returns results sorted by
// numRatings desc, so first-seen-wins keeps the canonical campus.
function dedupeByName(schools) {
  const seen = new Set();
  return schools.filter((s) => {
    const key = s.name.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function runSearch(query) {
  currentQuery = query;
  if (query.trim().length < 2) {
    clearResults();
    return;
  }
  renderLoading();
  const resp = await chrome.runtime.sendMessage({ type: "rmp:searchSchools", query });
  // Bail if user has typed something else since
  if (currentQuery !== query) return;
  if (resp?.error) {
    results.innerHTML = "";
    const errEl = document.createElement("div");
    errEl.className = "empty";
    errEl.textContent = `Search failed: ${resp.error}`;
    results.appendChild(errEl);
    results.classList.add("show");
    return;
  }
  renderResults(dedupeByName(resp?.result || []));
}

searchInput.addEventListener("input", (e) => {
  const value = e.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => runSearch(value), 220);
});

searchInput.addEventListener("focus", () => {
  if (searchInput.value.trim().length >= 2 && results.children.length) {
    results.classList.add("show");
  }
});

// Build a pre-filled GitHub Issues URL so users can report bad matches or
// schools where badges don't render. Stays inside their browser — no external
// reporting service, no telemetry.
function buildReportUrl(school) {
  const manifest = chrome.runtime.getManifest();
  const version = manifest.version;
  const ua = navigator.userAgent;
  const schoolLine = school?.schoolName
    ? `${school.schoolName} (RMP ID ${school.schoolId})`
    : "(none selected)";
  const title = school?.schoolName
    ? `[${school.schoolName}] `
    : "[unsupported school] ";
  const body = [
    "**What happened?**",
    "(describe the issue — e.g. no ratings appear, wrong professor matched, badges overlap text…)",
    "",
    "**Page URL (if applicable)**",
    "",
    "**Diagnostics (don't edit)**",
    `- Extension version: ${version}`,
    `- Selected school: ${schoolLine}`,
    `- User agent: ${ua}`,
  ].join("\n");
  const params = new URLSearchParams({ title, body });
  return `https://github.com/Konald58/rmp-extension/issues/new?${params.toString()}`;
}

async function refreshReportLink() {
  const link = document.getElementById("reportLink");
  if (!link) return;
  const school = await chrome.storage.sync.get(["schoolId", "schoolName"]);
  link.href = buildReportUrl(school);
}
refreshReportLink();

async function selectSchool(d) {
  await chrome.storage.sync.set({
    schoolId: d.id,
    schoolName: d.name,
    schoolMeta: d.meta,
    schoolGraphqlId: d.graphqlId || encodeSchoolId(d.id),
  });
  renderCurrent(d.name, d.meta);
  clearResults();
  searchInput.value = "";
  showStatus(`Saved — ${d.name}. Refresh your class search page to see ratings.`);
  refreshReportLink();
}
