// Professor-match scoring. Pure functions — no DOM, no chrome APIs — so they
// can be unit-tested against synthetic candidate sets without spinning up a
// service worker or mocking GraphQL.
//
// Imported by background.js via importScripts(). Also imported by Jest tests
// via CommonJS module.exports.

// Best-effort Banner-subject → department-name fragment mapping. Used to
// disambiguate when multiple professors share lastName+firstInitial across
// departments. Conservative — fragment match is generous (substring), and we
// fall through to numRatings when no subject hint helps.
//
// This list is USF-flavored (FIN, ACG, ENC, etc.). At other Banner schools
// with different subject prefixes, the map silently misses and scoring falls
// to numRatings — same behavior as v1.1.1 at non-USF schools.
const SUBJECT_TO_DEPT = {
  ACC: ["accounting"],
  ACG: ["accounting"],
  ANT: ["anthropology"],
  ART: ["art"],
  BIO: ["biology", "biological"],
  BSC: ["biology", "biological"],
  BUL: ["business law", "legal"],
  BUS: ["business"],
  CHM: ["chemistry"],
  CIS: ["computer", "information systems"],
  COP: ["computer"],
  CSE: ["computer"],
  ECO: ["economics", "econ"],
  ECP: ["economics", "econ"],
  EDU: ["education"],
  EEL: ["electrical"],
  EGN: ["engineering"],
  EIN: ["industrial"],
  ENC: ["english"],
  ENG: ["english", "engineering"],
  ENL: ["english", "literature"],
  FIN: ["finance"],
  GEB: ["business"],
  GEY: ["geology", "geography"],
  HFT: ["hospitality"],
  HIS: ["history"],
  HSC: ["health"],
  ISM: ["information systems", "information"],
  ITA: ["italian"],
  LIT: ["literature", "english"],
  MAC: ["mathematics", "math"],
  MAD: ["mathematics", "math"],
  MAN: ["management"],
  MAP: ["mathematics", "math"],
  MAR: ["marketing"],
  MAS: ["mathematics", "math"],
  MAT: ["mathematics", "math"],
  MUS: ["music"],
  NUR: ["nursing"],
  PHI: ["philosophy"],
  PHY: ["physics"],
  POS: ["political"],
  PSB: ["psychology"],
  PSY: ["psychology"],
  QMB: ["quantitative", "business analytics"],
  REE: ["real estate"],
  RMI: ["risk", "insurance"],
  SOC: ["sociology"],
  SPN: ["spanish"],
  STA: ["statistics", "stats"],
};

function deptMatchesSubject(dept, subject) {
  if (!dept || !subject) return false;
  const d = dept.toLowerCase();
  const s = subject.toUpperCase();
  // Direct substring (subject embedded in dept) — handles "FIN" ⊂ "Finance"
  if (d.includes(s.toLowerCase())) return true;
  // Curated mapping
  const frags = SUBJECT_TO_DEPT[s];
  if (frags && frags.some((f) => d.includes(f))) return true;
  return false;
}

// Pick the best candidate from a list of RMP professors that all matched
// lastName+firstInitial. Returns { best, ambiguous } where:
//   - best:      the winning candidate (or null if input was empty)
//   - ambiguous: true when 2+ candidates exist AND the winner was selected
//                purely by numRatings (no firstName match, no subject match)
//
// Score components:
//   firstName exact match: 1_000_000 (PS/Workday only — Banner has no firstName)
//   subject→dept match:      100_000
//   numRatings:                  0–N (tiebreaker)
function scoreCandidates(candidates, { firstName, subject } = {}) {
  if (!candidates || !candidates.length) return { best: null, ambiguous: false };
  if (candidates.length === 1) return { best: candidates[0], ambiguous: false };

  const scored = candidates.map((p) => {
    const firstNameMatch = !!(
      firstName && p.firstName?.toLowerCase() === firstName.toLowerCase()
    );
    const subjectMatch = !!(subject && deptMatchesSubject(p.department, subject));
    return {
      p,
      firstNameMatch,
      subjectMatch,
      score:
        (firstNameMatch ? 1_000_000 : 0) +
        (subjectMatch ? 100_000 : 0) +
        (p.numRatings || 0),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0];

  return {
    best: winner.p,
    ambiguous: !winner.firstNameMatch && !winner.subjectMatch,
  };
}

// CommonJS export for Jest. Service worker uses importScripts() which doesn't
// care about module.exports — it just runs the file in the worker scope and
// our function declarations become globals there.
if (typeof module !== "undefined" && module.exports) {
  module.exports = { SUBJECT_TO_DEPT, deptMatchesSubject, scoreCandidates };
}
