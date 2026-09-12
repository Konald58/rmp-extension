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

## Where it stands (2026-09-12)

- **Live on the Chrome Web Store** at version 2.0.0 (extension ID
  `fddicmacgfogicmodgojnmgenlepeejb`), currently with a handful of installs and no ratings yet.
- `manifest.json` / `package.json` both at 2.0.0. Adds multi-SIS support (Banner + PeopleSoft),
  an ambiguity warning when a name match is uncertain, a report-an-issue flow in the popup, and
  a concurrency limiter on Rate My Professors requests.
- 55/55 Jest tests passing, ESLint clean, CI (GitHub Actions, Node 20) green on `main`.
- Two known cleanup items sitting in the repo: `CHANGELOG.md`'s top entry is still headed
  "Unreleased — v2.0.0 candidate" even though 2.0.0 has shipped, and `README.md`'s Chrome Web
  Store install link still reads "(Coming soon)".

## Next up

- Reconcile `CHANGELOG.md`'s "Unreleased" heading with the shipped 2.0.0 release.
- Update `README.md`'s Web Store link (currently "(Coming soon)").
- Workday Student adapter (Phase 3) — needs a real class-search HTML fixture from a
  Workday-using school before it can be built.
- Custom-frontend-wrapper adapters (Phase 4) — lower priority, not started.

## Open questions

- Where to get a Workday Student HTML fixture (no fixture in hand yet).
- Name-disambiguation limitation: matching is strict (lastName + firstInitial, exact firstName
  preferred when the SIS provides one), but if the correct professor isn't listed on Rate My
  Professors at all, a same-initial namesake can still surface as the only candidate. No fix
  identified yet.
