---
status: active
---

# rmp-extension

## What it is

"Professor Ratings for Course Search" — a Chrome extension (Manifest V3, vanilla JS, no
build step) that injects Rate My Professors ratings inline on university course-registration
pages. Supports Ellucian Banner SSB9 (~1,400 universities) and Oracle PeopleSoft Campus
Solutions Class Search (hundreds more, e.g. NAU, U Houston, FIU, Ohio State, SF State).
Workday Student and custom registration portals are planned but not started.

## Where it stands (2026-10-10 21:00)

- **2.1.0 pushed and tagged** (`v2.1.0`, GitHub release with the zip attached). Store upload
  still pending: it needs Kon's Google re-verification in the dashboard tab.
- 2.1.0 adds a generic **Banner 8 classic self-service adapter** (Class Schedule Listing,
  Detailed Class Information, Look Up Classes) and a **UO DuckWeb schedule adapter**, after a
  friend at the University of Oregon (a Banner 8 school) saw no ratings. Both built from real
  UO captures and rendered in the browser on those pages. Look Up Classes (logged in) is
  covered by a synthetic test only.
- The silent USF fallback is gone: no school picked means a "Choose school in popup" badge.
- **Public copy names only verified schools**: USF (Banner 9), UO (Banner 8, DuckWeb), NAU
  (PeopleSoft). The "~1,400 universities" claim is gone everywhere, including the personal
  website blurb. README rewritten as the portfolio page.
- 95/95 Jest tests, ESLint clean, CI green. Three fresh-context reviews, all findings fixed.
- Pre-public-release gates passed (secrets, privacy URL 200, contact alias, assets, versions).

## Next up

- **Kon:** re-verify Google in the Web Store dashboard tab. Then upload
  `rmp-extension-v2.1.0.zip`, paste the WORKS ON block, short description, single purpose and
  the two new host justifications from `STORE_LISTING.md`, submit for review.
- After approval: UO friend retests with "University of Oregon" picked (first live check of
  Look Up Classes). Fix from the popup report if it misses.
- Workday Student adapter still needs a real class-search capture.
- LinkedIn launch post (copy final in the vault since July).

## Open questions

- Where to get a Workday Student HTML fixture (no fixture in hand yet).
- Name-disambiguation limitation: matching is strict (lastName + firstInitial, exact firstName
  preferred when the SIS provides one), but if the correct professor isn't listed on Rate My
  Professors at all, a same-initial namesake can still surface as the only candidate. No fix
  identified yet.
