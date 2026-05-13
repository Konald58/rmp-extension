const { scoreCandidates, deptMatchesSubject, SUBJECT_TO_DEPT } = require("../lib/scoring");

const KENNETH = {
  id: "T-1",
  firstName: "Kenneth",
  lastName: "Mitchell",
  department: "Accounting",
  numRatings: 12,
};
const KIMBERLY = {
  id: "T-2",
  firstName: "Kimberly",
  lastName: "Mitchell",
  department: "Marketing",
  numRatings: 87,
};
const KATE = {
  id: "T-3",
  firstName: "Kate",
  lastName: "Mitchell",
  department: "Finance",
  numRatings: 5,
};

describe("scoreCandidates", () => {
  test("empty list → null, not ambiguous", () => {
    expect(scoreCandidates([])).toEqual({ best: null, ambiguous: false });
    expect(scoreCandidates(null)).toEqual({ best: null, ambiguous: false });
  });

  test("single candidate → that one, not ambiguous", () => {
    const r = scoreCandidates([KENNETH]);
    expect(r.best.id).toBe("T-1");
    expect(r.ambiguous).toBe(false);
  });

  test("firstName match outweighs numRatings → Kenneth wins over Kimberly", () => {
    // Kimberly has 87 ratings to Kenneth's 12 — but PeopleSoft passed
    // firstName="Kenneth", so the exact match should dominate.
    const r = scoreCandidates([KENNETH, KIMBERLY], { firstName: "Kenneth" });
    expect(r.best.id).toBe("T-1");
    expect(r.ambiguous).toBe(false);
  });

  test("firstName match case-insensitive", () => {
    const r = scoreCandidates([KENNETH, KIMBERLY], { firstName: "kenneth" });
    expect(r.best.id).toBe("T-1");
  });

  test("subject match outweighs numRatings when no firstName", () => {
    // Banner doesn't pass firstName. Subject ACC → Kenneth's "Accounting" dept.
    // Should beat Kimberly's higher numRatings.
    const r = scoreCandidates([KENNETH, KIMBERLY], { subject: "ACC" });
    expect(r.best.id).toBe("T-1");
    expect(r.ambiguous).toBe(false);
  });

  test("subject ACG also maps to accounting", () => {
    const r = scoreCandidates([KENNETH, KIMBERLY], { subject: "ACG" });
    expect(r.best.id).toBe("T-1");
  });

  test("no firstName, no subject → falls to numRatings AND ambiguous=true", () => {
    // The exact wrong-prof scenario: Banner passes nothing useful, two
    // candidates exist. We pick by numRatings but flag as ambiguous.
    const r = scoreCandidates([KENNETH, KIMBERLY]);
    expect(r.best.id).toBe("T-2"); // Kimberly has more ratings
    expect(r.ambiguous).toBe(true);
  });

  test("subject doesn't match either candidate → ambiguous=true", () => {
    // Subject HIS (history) — neither Kenneth (accounting) nor Kimberly
    // (marketing) match. Falls to numRatings, flagged ambiguous.
    const r = scoreCandidates([KENNETH, KIMBERLY], { subject: "HIS" });
    expect(r.best.id).toBe("T-2");
    expect(r.ambiguous).toBe(true);
  });

  test("firstName match wins even if subject points elsewhere", () => {
    // PeopleSoft passes firstName=Kate, subject=ACC. ACC matches Kenneth's
    // dept. But firstName=Kate matches Kate exactly — and firstName weight
    // (1M) >>> subject weight (100k). Kate wins.
    const r = scoreCandidates([KENNETH, KATE], {
      firstName: "Kate",
      subject: "ACC",
    });
    expect(r.best.id).toBe("T-3");
    expect(r.ambiguous).toBe(false);
  });

  test("missing firstName on candidate doesn't crash", () => {
    const broken = { id: "T-X", firstName: undefined, lastName: "Mitchell", department: null, numRatings: 1 };
    expect(() => scoreCandidates([broken, KENNETH])).not.toThrow();
  });

  test("3 candidates, ambiguous because winner had no firstName/subject decisive", () => {
    const r = scoreCandidates([KENNETH, KIMBERLY, KATE]);
    expect(r.best.id).toBe("T-2"); // Kimberly's 87 wins
    expect(r.ambiguous).toBe(true);
  });
});

describe("deptMatchesSubject", () => {
  test("direct substring match — FIN ⊂ Finance", () => {
    expect(deptMatchesSubject("Finance", "FIN")).toBe(true);
  });

  test("case insensitive", () => {
    expect(deptMatchesSubject("FINANCE", "fin")).toBe(true);
  });

  test("curated map — ECO → Economics", () => {
    expect(deptMatchesSubject("Economics", "ECO")).toBe(true);
  });

  test("curated map — PSY → Psychology", () => {
    expect(deptMatchesSubject("Psychology", "PSY")).toBe(true);
  });

  test("no match", () => {
    expect(deptMatchesSubject("Music", "FIN")).toBe(false);
  });

  test("null inputs safe", () => {
    expect(deptMatchesSubject(null, "FIN")).toBe(false);
    expect(deptMatchesSubject("Finance", null)).toBe(false);
    expect(deptMatchesSubject(undefined, undefined)).toBe(false);
  });

  test("unknown subject code", () => {
    expect(deptMatchesSubject("Aerospace Engineering", "ZZZ")).toBe(false);
  });
});

describe("SUBJECT_TO_DEPT", () => {
  test("contains expected USF subject codes", () => {
    expect(SUBJECT_TO_DEPT.FIN).toBeDefined();
    expect(SUBJECT_TO_DEPT.ACG).toContain("accounting");
    expect(SUBJECT_TO_DEPT.PSY).toContain("psychology");
  });
});
