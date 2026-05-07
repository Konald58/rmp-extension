const RMP_URL = "https://www.ratemyprofessors.com/graphql";
const USF_ID = "U2Nob29sLTEyNjI=";
// text/plain avoids CORS preflight (no OPTIONS request sent by browser).
// Authorization header is also omitted — it's a non-simple header that
// forces a preflight, and the RMP API doesn't require it.
const HEADERS = {
  "Content-Type": "text/plain",
};

async function rmpFetch(query) {
  const resp = await fetch(RMP_URL, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ query }),
  });
  if (!resp.ok) throw new Error(`RMP HTTP ${resp.status}`);
  return resp.json();
}

function professorUrl(id) {
  try {
    const decoded = atob(id);
    const numeric = decoded.split("-").pop();
    return `https://www.ratemyprofessors.com/professor/${numeric}`;
  } catch {
    return "https://www.ratemyprofessors.com";
  }
}

async function searchProfessor(lastName, firstInitial) {
  const cacheKey = `rmp_${lastName}_${firstInitial}`.toLowerCase().replace(/\s+/g, "_");

  // Check session cache first
  const stored = await chrome.storage.session.get(cacheKey);
  if (cacheKey in stored) return stored[cacheKey];

  let data;
  try {
    data = await rmpFetch(`{
      newSearch {
        teachers(query: {text: "${lastName}", schoolID: "${USF_ID}"}) {
          edges {
            node {
              id firstName lastName department
              avgRating avgDifficulty wouldTakeAgainPercent numRatings
            }
          }
        }
      }
    }`);
  } catch (err) {
    console.error("[RMP] fetch failed:", err.message, err);
    return null;
  }

  const edges = data?.data?.newSearch?.teachers?.edges ?? [];
  const professors = edges.map((e) => e.node);

  // Prefer exact last name + first initial match; fall back to last name only
  const match =
    professors.find(
      (p) =>
        p.lastName.toLowerCase() === lastName.toLowerCase() &&
        p.firstName?.[0]?.toUpperCase() === firstInitial.toUpperCase()
    ) ||
    professors.find((p) => p.lastName.toLowerCase() === lastName.toLowerCase());

  const result = match
    ? {
        id: match.id,
        name: `${match.firstName} ${match.lastName}`,
        rating: match.avgRating,
        difficulty: match.avgDifficulty,
        wouldTakeAgainPct: Math.round(match.wouldTakeAgainPercent || 0),
        numRatings: match.numRatings,
        rmpUrl: professorUrl(match.id),
      }
    : null;

  await chrome.storage.session.set({ [cacheKey]: result });
  return result;
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === "getRating") {
    searchProfessor(msg.lastName, msg.firstInitial)
      .then(sendResponse)
      .catch(() => sendResponse(null));
    return true; // keep message channel open for async response
  }
});
