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

## Where it stands (2026-10-10)

- **Live on the Chrome Web Store** at 2.0.0 (extension ID `fddicmacgfogicmodgojnmgenlepeejb`).
- **2.1.0 built on local `main`, not yet uploaded.** A friend at the University of Oregon saw no
  ratings. UO runs Banner 8 (DuckWeb), which the extension never supported: only Banner 9 SSB
  URLs matched. 2.1.0 adds a generic **Banner 8 classic self-service adapter**
  (`content/adapters/banner8.js`: Class Schedule Listing, Detailed Class Information, Look Up
  Classes) built from a real UO schedule capture, plus a **UO DuckWeb schedule adapter**
  (`content/adapters/duckweb.js`) for UO's custom public schedule, verified in the browser.
- **Reach claims cut to verified schools** (USF, UO, NAU) across README, store listing, manifest
  and the personal-website project entry. README rewritten as the portfolio page.
- 2.1.0 also removes the silent USF fallback: with no school selected the badge now says
  "Choose your school in the Professor Ratings extension popup, then refresh".
- 90/90 Jest tests, ESLint clean. `rmp-extension-v2.1.0.zip` built at the repo root.
- CHANGELOG, README (store link, test count, DuckWeb row), PRIVACY.md and STORE_LISTING.md
  (new content-script pattern plus justification) are updated.

## Next up

- Upload `rmp-extension-v2.1.0.zip` to the Web Store dashboard and paste the updated listing
  copy (WORKS ON section) and the Banner 8 + DuckWeb host justifications from
  `STORE_LISTING.md`. New content-script patterns will trigger a review.
- Ask the UO friend to re-test once 2.1.0 is live (pick "University of Oregon" in the popup
  first). Banner 8 "Look Up Classes" (logged in) is covered by a synthetic test only; his run is
  the first live check of that page.
- Push `feat/duckweb-adapter`, merge to `main`, tag `v2.1.0`.
- Workday Student adapter (Phase 3) still needs a real class-search HTML fixture.
- Custom-frontend-wrapper adapters (Phase 4) not started.

## Open questions

- Where to get a Workday Student HTML fixture (no fixture in hand yet).
- Name-disambiguation limitation: matching is strict (lastName + firstInitial, exact firstName
  preferred when the SIS provides one), but if the correct professor isn't listed on Rate My
  Professors at all, a same-initial namesake can still surface as the only candidate. No fix
  identified yet.
