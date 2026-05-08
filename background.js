// Service worker — handles all RMP GraphQL fetches.
// Extension service workers with host_permissions bypass CORS, so we can
// send the Authorization header that RMP's GraphQL endpoint requires.

const RMP_URL = "https://www.ratemyprofessors.com/graphql";
const DEFAULT_SCHOOL_GRAPHQL_ID = "U2Nob29sLTEyNjI="; // USF Tampa fallback
const HEADERS = {
  "Authorization": "Basic dGVzdDp0ZXN0",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
  "Referer": "https://www.ratemyprofessors.com/",
};

async function getSchoolGraphqlId() {
  const data = await chrome.storage.sync.get("schoolGraphqlId");
  return data.schoolGraphqlId || DEFAULT_SCHOOL_GRAPHQL_ID;
}

function professorUrl(id) {
  try {
    const numeric = atob(id).split("-").pop();
    return `https://www.ratemyprofessors.com/professor/${numeric}`;
  } catch {
    return "https://www.ratemyprofessors.com";
  }
}

async function searchProfessor(lastName, firstInitial) {
  const schoolGraphqlId = await getSchoolGraphqlId();
  const query = `{ newSearch { teachers(query: {text: "${lastName}", schoolID: "${schoolGraphqlId}"}) { edges { node { id firstName lastName department avgRating avgDifficulty wouldTakeAgainPercent numRatings } } } } }`;

  let data;
  try {
    const resp = await fetch(RMP_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ query }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    data = await resp.json();
  } catch (err) {
    console.error("[RMP] fetch failed:", err.message);
    return { error: err.message };
  }

  const edges = data?.data?.newSearch?.teachers?.edges ?? [];
  const professors = edges.map((e) => e.node);

  const match =
    professors.find(
      (p) =>
        p.lastName.toLowerCase() === lastName.toLowerCase() &&
        p.firstName?.[0]?.toUpperCase() === firstInitial.toUpperCase()
    ) || professors.find((p) => p.lastName.toLowerCase() === lastName.toLowerCase());

  if (!match) return { result: null };

  return {
    result: {
      name: `${match.firstName} ${match.lastName}`,
      rating: match.avgRating,
      difficulty: match.avgDifficulty,
      wouldTakeAgainPct: Math.round(match.wouldTakeAgainPercent || 0),
      numRatings: match.numRatings,
      rmpUrl: professorUrl(match.id),
    },
  };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "rmp:search") return false;
  searchProfessor(msg.lastName, msg.firstInitial).then(sendResponse);
  return true; // keep channel open for async response
});
