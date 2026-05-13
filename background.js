// Service worker — handles all RMP GraphQL fetches.
// Extension service workers with host_permissions bypass CORS.

// Load pure helpers. importScripts is service-worker–native; runs the file
// in this worker's global scope so scoreCandidates/deptMatchesSubject become
// callable here. Jest imports the same file via CommonJS for unit tests.
importScripts("lib/scoring.js");

const RMP_URL = "https://www.ratemyprofessors.com/graphql";
const DEFAULT_SCHOOL_GRAPHQL_ID = "U2Nob29sLTEyNjI="; // USF Tampa fallback
const HEADERS = {
  "Content-Type": "application/json",
  "Referer": "https://www.ratemyprofessors.com/",
};

async function getSchoolGraphqlId() {
  const data = await chrome.storage.sync.get("schoolGraphqlId");
  return data.schoolGraphqlId || DEFAULT_SCHOOL_GRAPHQL_ID;
}

function professorUrl(id) {
  try {
    const numeric = atob(id).split("-").pop();
    if (!/^\d+$/.test(numeric)) return "https://www.ratemyprofessors.com";
    return `https://www.ratemyprofessors.com/professor/${numeric}`;
  } catch {
    return "https://www.ratemyprofessors.com";
  }
}

// Concurrency limiter — prevents firing 60+ parallel RMP requests on big
// course-search pages. RMP's public GraphQL endpoint doesn't publish a rate
// limit, so 6 in-flight is conservative + matches typical browser host limit.
const MAX_INFLIGHT_GQL = 6;
let gqlInflight = 0;
const gqlQueue = [];

function gqlPump() {
  while (gqlInflight < MAX_INFLIGHT_GQL && gqlQueue.length) {
    const { fn, resolve, reject } = gqlQueue.shift();
    gqlInflight++;
    fn().then(resolve, reject).finally(() => {
      gqlInflight--;
      gqlPump();
    });
  }
}

function gqlQueued(fn) {
  return new Promise((resolve, reject) => {
    gqlQueue.push({ fn, resolve, reject });
    gqlPump();
  });
}

async function gql(query, variables) {
  return gqlQueued(async () => {
    const resp = await fetch(RMP_URL, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ query, variables }),
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return resp.json();
  });
}

// ===== Professor search (for inline badges) =====

const SEARCH_QUERY = `
  query TeacherSearch($text: String!, $schoolID: ID) {
    newSearch {
      teachers(query: { text: $text, schoolID: $schoolID }) {
        edges { node { id firstName lastName department avgRating avgDifficulty wouldTakeAgainPercent numRatings } }
      }
    }
  }
`;

// SUBJECT_TO_DEPT, deptMatchesSubject, scoreCandidates are loaded from
// lib/scoring.js via importScripts above.

async function searchProfessor(lastName, firstInitial, subject, firstName) {
  const schoolGraphqlId = await getSchoolGraphqlId();

  let data;
  try {
    data = await gql(SEARCH_QUERY, { text: lastName, schoolID: schoolGraphqlId });
  } catch (err) {
    console.error("[RMP] fetch failed:", err.message);
    return { error: err.message };
  }

  const edges = data?.data?.newSearch?.teachers?.edges ?? [];
  const professors = edges.map((e) => e.node);

  // STRICT: lastName + firstInitial must both match. No lastName-only fallback —
  // that was matching "Xu, X." → "Yajie Xu" because the fallback didn't care
  // about the initial. If the right prof isn't on RMP, "No RMP data" is the
  // correct outcome — better than confidently showing the wrong person.
  const candidates = professors.filter(
    (p) =>
      p.lastName.toLowerCase() === lastName.toLowerCase() &&
      p.firstName?.[0]?.toUpperCase() === firstInitial.toUpperCase()
  );

  if (!candidates.length) return { result: null };

  const { best, ambiguous } = scoreCandidates(candidates, { firstName, subject });

  return {
    result: {
      id: best.id,
      name: `${best.firstName} ${best.lastName}`,
      department: best.department,
      rating: best.avgRating,
      difficulty: best.avgDifficulty,
      wouldTakeAgainPct: Math.round(best.wouldTakeAgainPercent || 0),
      numRatings: best.numRatings,
      rmpUrl: professorUrl(best.id),
      ambiguous,
    },
  };
}

// ===== Teacher details (for hover popover: tags + recent comments) =====

const TEACHER_DETAILS_QUERY = `
  query TeacherDetails($id: ID!) {
    node(id: $id) {
      ... on Teacher {
        ratingsDistribution {
          total
          r1
          r2
          r3
          r4
          r5
        }
      }
    }
  }
`;

async function teacherDetails(id) {
  try {
    const data = await gql(TEACHER_DETAILS_QUERY, { id });
    const dist = data?.data?.node?.ratingsDistribution || null;
    return { result: { distribution: dist } };
  } catch (err) {
    console.error("[RMP] details failed:", err.message);
    return { error: err.message };
  }
}

// ===== School search (for popup picker) =====

const SCHOOL_SEARCH_QUERY = `
  query SchoolSearch($query: String!) {
    newSearch {
      schools(query: { text: $query }) {
        edges { node { id name city state numRatings } }
      }
    }
  }
`;

function decodeNumericId(graphqlId) {
  try {
    const tail = atob(graphqlId).split("-").pop();
    return /^\d+$/.test(tail) ? tail : null;
  } catch {
    return null;
  }
}

async function searchSchools(query) {
  if (!query || query.trim().length < 2) return { result: [] };
  try {
    const data = await gql(SCHOOL_SEARCH_QUERY, { query: query.trim() });
    const edges = data?.data?.newSearch?.schools?.edges ?? [];
    const schools = edges
      .map((e) => {
        const numericId = decodeNumericId(e.node.id);
        if (!numericId) return null;
        return {
          id: numericId,
          graphqlId: e.node.id,
          name: e.node.name,
          city: e.node.city,
          state: e.node.state,
          numRatings: e.node.numRatings || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.numRatings - a.numRatings)
      .slice(0, 12);
    return { result: schools };
  } catch (err) {
    console.error("[RMP] school search failed:", err.message);
    return { error: err.message };
  }
}

// ===== Message router =====

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type === "rmp:search") {
    searchProfessor(msg.lastName, msg.firstInitial, msg.subject, msg.firstName).then(sendResponse);
    return true;
  }
  if (msg?.type === "rmp:teacherDetails") {
    teacherDetails(msg.id).then(sendResponse);
    return true;
  }
  if (msg?.type === "rmp:searchSchools") {
    searchSchools(msg.query).then(sendResponse);
    return true;
  }
  return false;
});
