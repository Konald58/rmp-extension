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
- **2.1.0 built on `feat/duckweb-adapter`, not yet uploaded.** Adds a University of Oregon
  DuckWeb adapter (`content/adapters/duckweb.js`) after a friend at UO saw no ratings: DuckWeb
  is a custom Banner 8 class schedule whose URL matched no pattern and whose instructor cells
  read `Lastname F`. Verified against a real UO CS listing (fixture) and by injecting the
  content scripts into that page in the browser.
- 2.1.0 also removes the silent USF fallback: with no school selected the badge now says
  "Choose your school in the Professor Ratings extension popup, then refresh".
- 73/73 Jest tests, ESLint clean. `rmp-extension-v2.1.0.zip` built at the repo root.
- CHANGELOG, README (store link, test count, DuckWeb row), PRIVACY.md and STORE_LISTING.md
  (new content-script pattern plus justification) are updated.

## Next up

- Upload `rmp-extension-v2.1.0.zip` to the Web Store dashboard. The new
  `duckweb.uoregon.edu` content-script pattern will trigger a review; paste the justification
  from `STORE_LISTING.md`.
- Ask the UO friend to re-test once 2.1.0 is live (pick "University of Oregon" in the popup
  first).
- Push `feat/duckweb-adapter`, merge to `main`, tag `v2.1.0`.
- Workday Student adapter (Phase 3) still needs a real class-search HTML fixture.
- Custom-frontend-wrapper adapters (Phase 4) not started.

## Open questions

- Where to get a Workday Student HTML fixture (no fixture in hand yet).
- Name-disambiguation limitation: matching is strict (lastName + firstInitial, exact firstName
  preferred when the SIS provides one), but if the correct professor isn't listed on Rate My
  Professors at all, a same-initial namesake can still surface as the only candidate. No fix
  identified yet.
