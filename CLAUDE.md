# CLAUDE.md — rmp-extension

## Overview

Multi-SIS Chrome extension (MV3) that injects RateMyProfessors ratings into university course-registration pages. Supports Banner SSB9 (~1,400 universities) and PeopleSoft Campus Solutions Class Search (hundreds more — NAU, U Houston, FIU, Ohio State, SF State, etc.).

- Repo: https://github.com/Konald58/rmp-extension
- Privacy policy: https://konald58.github.io/rmp-extension/PRIVACY
- Extension ID: `fddicmacgfogicmodgojnmgenlepeejb`
- Stack: MV3, vanilla JS, zero-build. Jest + ESLint flat config.

## Key Files

- **`background.js`** — service worker; RMP GraphQL (search teachers, search schools, get teacher details with rating distribution). firstName-aware scorer; `SUBJECT_TO_DEPT` map (~45 entries) for cross-dept disambiguation. Strict matching (lastName + firstInitial both required, no fallback); when the SIS provides a full firstName, an exact match scores weight 1,000,000.
- **`content/common.js`** — shared utilities: `RMP.injectBadge`, `RMP.searchProfessor` IPC, `RMP.fetchDetails`, `RMP.findCourseInfo` (ancestor walker, depth 30, day-of-week subject blacklist), `RMP.processInstructorElement`, hover popover (rating distribution chart), adapter registry (`RMP.adapters` + `RMP.registerAdapter`).
- **`content/adapters/banner.js`** — Banner SSB9 scan: walks `(Primary)`/`(Secondary)` text nodes → smallest ancestor matching the `Lastname, F.` pattern. MutationObserver re-scan on DOM changes.
- **`content/adapters/peoplesoft.js`** — PeopleSoft scan: queries `span[id^="MTG_INSTR$"]`, parses "Firstname Lastname" with handling for ALL CAPS, middle names, suffixes, multi-instructor, hyphenated names. Skips "To be Announced". `parsePeopleSoftName` exported via conditional `module.exports` for tests.
- **`content/index.js`** — adapter dispatcher; first registered adapter whose `matches(location)` returns true wins.
- **`content/name-parser.js`** — Banner instructor pattern extractor.
- **`popup.html` / `popup.js`** — searchable school picker (typeahead → RMP `newSearch.schools` GraphQL via background). `dedupeByName` collapses multi-campus schools (e.g. USF Tampa + St. Pete + Lakeland → "USF").
- **`styles.css`** — white card, 3-col values (Rating · Diff · Retake), tier-colored bar (green ≥4 / gold 3–3.9 / red <3). Hover popover with 5-row rating distribution chart. Dark mode via `prefers-color-scheme`.
- **`tests/`** — Jest. `name-parser.test.js`, `peoplesoft.test.js` (runs against `tests/fixtures/peoplesoft-nau.html`).

## Manifest `content_scripts` load order

```
content/name-parser.js
content/common.js
content/adapters/banner.js
content/adapters/peoplesoft.js
content/index.js
```

Order matters — `common.js` defines `window.RMP`; adapters register against it; `index.js` dispatches. **Add new adapters before `index.js`.**

## Match patterns

- Banner: `https://*/StudentRegistrationSsb/*`, `https://*/ssb/*classRegistration*`, `https://*/ssb/*scheduleDetails*`
- PeopleSoft: `https://*/*COMMUNITY_ACCESS.CLASS_SEARCH.GBL*` (Oracle's standard public Class Search component — covers hundreds of schools in one pattern)

## Architecture watch-outs

- **All RMP fetches must go through `background.js`** — MV3 content scripts don't bypass CORS; service workers do.
- RMP endpoint works without an auth header.
- Chrome shows a broad install warning due to the wildcard host pattern; the path is narrow but Chrome doesn't display the path in the warning.
- **PeopleSoft `findCourseInfo` quirk:** day-of-week column headers (SUN/MON/TUE/…) flatten next to numeric section codes in `textContent`. The subject blacklist in `common.js` filters these. The test fixture proves the case — don't remove without understanding it.
- **PeopleSoft walker depth must be ≥30** — Oracle generates 14–18 wrapper-table layers before the course header.
- **Name disambiguation (e.g. Kenneth/Kimberly) only works when both professors exist on RMP.** If the correct prof isn't on RMP and only a wrong-prof candidate matches lastName + firstInitial, the wrong one is shown. Banner is most exposed (no firstName); PeopleSoft/Workday less so.
- **School dedup** trades small isolated branch campuses (e.g. NAU Yuma) for a cleaner picker.
- **Orphan content-script context is a real production hazard:** when the extension reloads/auto-updates while a registration page is open, the page's content script becomes orphaned (`chrome.runtime` undefined). A synchronous `TypeError` fires on the next IPC *before* any Promise, so `.catch` can't intercept. Fix: an `isContextAlive()` check (canonical: `chrome?.runtime?.id`) gating every `sendMessage`, plus a MutationObserver `disconnect()` when a dead context is detected.

## Tooling

- **Tests**: Jest + jest-environment-jsdom. `npm test`. 55 tests across name-parser, peoplesoft (unit + fixture DOM scan), scoring, and integration-peoplesoft (full pipeline with a stubbed `chrome.runtime`).
- **Lint**: ESLint flat config (`eslint.config.js`). `npm run lint`. File-scoped globals are declared for `background.js` (pulled in via `importScripts`) and `content/adapters/*.js`.
- **CI**: `.github/workflows/test.yml` runs lint then test on push to `main` + PRs. Node 20.
- **Support email**: `konstantind@duck.com` (used in `popup.js` `REPORT_EMAIL` + the store listing).
- **Report button in popup**: primary CTA opens a `mailto:` with pre-filled diagnostics; a secondary link opens GitHub Issues with the same diagnostics.

## RMP school IDs

USF Tampa 1262 · USF St. Pete 4383 · USF Lakeland 5122 · UF 1100 · FSU 1237 · UCF 1082 · FIU 1322

## Related

Twin project: **rmp-mcp** (https://github.com/Konald58/rmp-mcp) — same RMP GraphQL endpoint exposed as an MCP server for conversational queries.
