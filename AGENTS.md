# AGENTS.md — rmp-extension

How any AI tool should work in this repo.

## What this is

"Professor Ratings for Course Search" — a Chrome extension (MV3, vanilla JS, zero-build) that
injects Rate My Professors ratings inline on university course-registration pages. Adapters:
Ellucian Banner 9 (verified USF), Ellucian Banner 8 classic self-service (verified UO), Oracle
PeopleSoft Campus Solutions Class Search (verified NAU), and UO's DuckWeb schedule. Public copy
names only verified schools; do not reintroduce "~1,400 universities" style reach claims.

- Repo: https://github.com/Konald58/rmp-extension
- Privacy policy: https://konald58.github.io/rmp-extension/PRIVACY
- Extension ID: `fddicmacgfogicmodgojnmgenlepeejb`
- Stack: Manifest V3, vanilla JS, no build step. Jest (+ jsdom) for tests, ESLint flat config for lint.

## Commands

```bash
npm install     # dev deps only: eslint, jest, jest-environment-jsdom
npm test        # jest — 90 tests across name-parser, peoplesoft, banner8, duckweb, scoring, integration
npm run lint    # eslint . --no-warn-ignored
```

CI (`.github/workflows/test.yml`) runs lint then test on push to `main` and on PRs, Node 20.
There is no build/bundle step — load unpacked from the repo root as-is.

## Layout

```
background.js              service worker: RMP GraphQL client (search teachers/schools, teacher
                            details incl. rating distribution), firstName-aware scorer,
                            SUBJECT_TO_DEPT map (~45 entries) for cross-department disambiguation
content/
  name-parser.js            Banner instructor-text parser
  common.js                 shared utils: RMP.injectBadge, RMP.searchProfessor (IPC to
                             background), RMP.fetchDetails, RMP.findCourseInfo (ancestor
                             walker), RMP.processInstructorElement, hover popover, adapter
                             registry (RMP.adapters / RMP.registerAdapter)
  adapters/banner.js         Banner SSB9 scan + MutationObserver
  adapters/peoplesoft.js     PeopleSoft scan + name parsing (exports parsePeopleSoftName for tests)
  adapters/banner8.js        Banner 8 classic: Instructors/Instructor column, "First Last (P)" parser (full
                             first name passed through), course from the section title row or Subj/Crse columns
  adapters/duckweb.js        UO DuckWeb scan: Instructor column lookup, `Lastname F` parser, course code
                             from the preceding header row (passed as processInstructorElement's 3rd arg)
  index.js                   dispatcher — first adapter whose matches(location) is true wins
lib/scoring.js               scoring helpers pulled in via importScripts (not manifest-listed —
                             don't forget it when zipping for a store submission)
popup.html / popup.js        searchable school picker (typeahead over RMP schools GraphQL),
                             dedupeByName collapses multi-campus schools
styles.css                   card + hover-popover styling, dark mode via prefers-color-scheme
tests/                       Jest: name-parser, peoplesoft (unit + live NAU fixture DOM scan),
                             scoring, integration-peoplesoft (full pipeline, stubbed chrome.runtime)
listing/                     HTML/CSS slide templates + render.sh (headless-Chrome screenshot
                             pipeline) for Web Store listing assets
docs/                        decisions.md, plans/, notes/
```

## Manifest content_scripts load order

```
content/name-parser.js
content/common.js
content/adapters/banner.js
content/adapters/peoplesoft.js
content/adapters/duckweb.js
content/adapters/banner8.js
content/index.js
```

Order matters: `common.js` defines `window.RMP`, adapters register against it, `index.js`
dispatches last. Add new adapters before `index.js`, and add the new file to both
`manifest.json` `content_scripts.js` and `eslint.config.js` if it needs its own globals.

## Conventions and pitfalls

- **All RMP fetches go through `background.js`.** MV3 content scripts don't reliably bypass
  CORS; the service worker does. Never fetch RMP directly from a content script.
- The RMP GraphQL endpoint works without an auth header — don't add one back.
- **PeopleSoft `findCourseInfo` quirk:** day-of-week column headers (SUN/MON/TUE/…) flatten
  next to numeric section codes in `textContent`. `common.js` filters these with a subject
  blacklist; the test fixture proves the case, don't remove without understanding why.
- **PeopleSoft ancestor-walker depth must be ≥30** — Oracle generates 14–18 wrapper-table
  layers before the course header.
- **Name disambiguation only works when both candidate professors exist on RMP.** Matching is
  strict (lastName + firstInitial required, no lastName-only fallback); an exact firstName
  match (when the SIS provides one) scores far above a subject/department match. Banner is
  most exposed to ambiguity since it never provides a full first name.
- **Orphan content-script context:** when the extension reloads/auto-updates while a
  registration page is open, `chrome.runtime` becomes undefined in that page and a synchronous
  `TypeError` fires before any Promise, so `.catch` can't catch it. Every `sendMessage` call
  must be gated by an `isContextAlive()` check (`chrome?.runtime?.id`), and MutationObservers
  must `disconnect()` once a dead context is detected.
- `RMP.processInstructorElement(el, parsed, courseInfo)`: `undefined` runs the ancestor walker,
  `null` means "unknown, do not guess" (pages where one table holds every course).
- Each SIS is an adapter in `content/adapters/`; a new registration system is one new file that
  self-registers and detects itself via URL pattern — don't branch existing adapters.
- ESLint globals are file-scoped in `eslint.config.js` for `background.js` (pulled in via
  `importScripts`) and `content/adapters/*.js` — extend that config, don't suppress warnings.
- This repo is public. Never commit real screenshots showing a logged-in registration page,
  a person's name, or browser bookmarks — `screenshots/raw/` is gitignored for exactly that
  reason; only processed, PII-free assets under `screenshots/listing/` are committed.
