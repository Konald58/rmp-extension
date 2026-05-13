# Changelog

## [Unreleased — v2.0.0 candidate]

This is the rollup of all work since v1.1.1 (the version currently in Chrome Web Store review). Submit as v2.0.0 once the v1.1.1 privacy-URL appeal clears and USF/NAU smoke tests pass.

### Added
- **Report-an-issue link in popup** that opens a pre-filled GitHub Issues URL with extension version, selected school, and user agent. Zero infrastructure — no email handling, no telemetry, everything stays in the user's browser. Lets users at unsupported PeopleSoft instances or unknown Banner schools flag breaks for follow-up.
- **Ambiguity flag** (`ambiguous: true` returned from `searchProfessor`) when 2+ candidates matched lastName + firstInitial AND the winner was selected purely by `numRatings` (no firstName match, no subject-dept match). Surfaced as:
  - A "⚠ Multiple professors share this name — verify before deciding" prefix line in the badge tooltip
  - A yellow warning banner at the top of the hover popover (dark-mode styled)
  - Mitigates the wrong-prof class of bug at common-surname schools when no disambiguator helps.
- **Department in inline badge tooltip** — hover over any badge now shows `Firstname Lastname (Department)` instead of just `Firstname Lastname`, so users can catch wrong-prof matches visually even without opening the popover.
- **Concurrency limiter for RMP fetches** (`MAX_INFLIGHT_GQL = 6` in background.js). A USF Banner page with 60 instructor cells previously fired 60 parallel RMP requests; now caps at 6 in-flight with the rest queued. Plays nice with the API and avoids any risk of being throttled or IP-blocked.
- **9 defensive PeopleSoft parser tests** covering name variants the NAU fixture doesn't exhibit but other schools likely will: apostrophes (`O'Brien`, `D'Angelo`), accented characters (`José Núñez`), semicolon-separated multi-instructor, suffix-no-period (`PhD`, `Esq.`), extra-whitespace tolerance, TBD placeholder, null/undefined input safety.

### Fixed
- **`popup.js` XSS hardening** — replaced `results.innerHTML = ... ${resp.error} ...` template-literal interpolation with DOM build via `textContent`. `resp.error` flows from the RMP GraphQL API; not directly user input but external response data, and template-literal interpolation into innerHTML is the wrong pattern to ever ship.
- **Popover stale-update race** — `showPopover` previously guarded with `pop.dataset.activeId !== prof.id`, which had a subtle race on A→B→A rapid hover when `fetchDetails` returned a cached promise (both calls' continuations could fire). Replaced with monotonic `popoverRequestId` counter — only the latest call ever writes.
- **Dist chart label `innerHTML`** template literal in `common.js` replaced with DOM build. Safe today (constants only) but fragile pattern that would have been a real XSS risk the moment someone interpolated a server value into the label.
- **PeopleSoft adapter globals leak** — `peoplesoft.js` was not IIFE-wrapped, so `PS_PLACEHOLDER_RE`, `parsePeopleSoftName`, `peopleSoftMatches`, `peopleSoftScan`, `peopleSoftInit` all leaked to `window.*` and could collide with page JS. Now wrapped, with `module.exports` preserved inside the IIFE for Jest.
- **Crash on profs with null `avgRating` / `avgDifficulty`** — `data.rating.toFixed(1)` threw when RMP returned `null` for newly-listed profs with no ratings. Now renders `"—"` instead, and the tier bar reads as 0% rather than calculating negative widths from `null - 1`.

### Changed
- Privacy policy + source-code URLs across PRIVACY.md and STORE_LISTING.md updated from the old `usf-rmp-extension` repo slug to the renamed `rmp-extension` slug. GitHub auto-redirects the `github.com` URLs, but GitHub Pages does NOT auto-redirect — the old slug returns 404, which is what caused the v1.1.1 Web Store rejection. Web Store dashboard's Privacy Policy URL field must be updated manually in the appeal flow.

### Carried over from v1.2.0 → v1.5.1 (not yet released)
See the v1.2.0–v1.5.1 entries below for the full feature set being shipped:
searchable school picker, hover popover with rating distribution chart, dark mode, strict matching with firstName disambiguation, subject→department disambiguation map, per-SIS adapter pattern (`content/adapters/`), PeopleSoft Campus Solutions support (`COMMUNITY_ACCESS.CLASS_SEARCH.GBL`), multi-campus picker dedup.

## [1.5.1] — 2026-05-10

### Fixed
- **Wrong-prof match when multiple profs share a last name + first initial at the same school.** PeopleSoft (and future Workday) adapters give us the full first name; the previous matcher threw it away and only matched on initial, so "Kenneth Mitchell" could resolve to "Kimberly Mitchell" — both are `Mitchell, K.`. `searchProfessor` now scores exact firstName match with weight 1,000,000, far above subject (100,000) and numRatings, and the search-result cache key now includes firstName so they don't collide.
- **School-picker clutter from multi-campus universities.** NAU surfaced 5 entries (Flagstaff/Online/Phoenix/Yuma/East Valley); USF would do the same with Tampa/St. Pete/Lakeland. Most multi-campus schools share one registration system, so the dropdown now dedupes by school name and keeps only the highest-rated campus per name.

## [1.5.0] — 2026-05-10

### Added
- **PeopleSoft Campus Solutions support.** Adapter at `content/adapters/peoplesoft.js` matches `*COMMUNITY_ACCESS.CLASS_SEARCH.GBL*` — the standard public Class Search component used by hundreds of universities (NAU, U Houston, FIU, Ohio State, SF State, and many more). Inline RMP badges now render on PeopleSoft class search results with no further config beyond the school picker.
- DOM strategy: queries `span[id^="MTG_INSTR$"]` (PeopleSoft's instructor cells), parses `Firstname Lastname` format, skips `To be Announced` placeholders, and walks ancestors to find the course header for subject disambiguation.
- Test coverage: `tests/peoplesoft.test.js` runs against a live NAU class-search HTML fixture (`tests/fixtures/peoplesoft-nau.html`). 13 tests covering name parsing edge cases (ALL CAPS, middle names, suffixes, multi-instructor, hyphenated last names) and live-fixture integration.

### Changed
- `RMP.findCourseInfo` walker depth bumped from 14 → 30 to reach PeopleSoft's deeper wrapper-table nesting.
- `RMP.findCourseInfo` now uses a global regex with a blacklist (SUN/MON/TUE/.../TBA/STAFF/etc.) so it can't false-positive-match day-of-week column headers as subject codes when textContent flattens column labels and section codes together.

## [1.4.0] — 2026-05-10

### Changed
- **Architecture refactored to per-SIS adapter pattern.** Content script split from one monolithic `content.js` into:
  - `content/name-parser.js` — Banner instructor-text parser (unchanged)
  - `content/common.js` — shared utilities: `RMP.searchProfessor`, `RMP.fetchDetails`, `RMP.findCourseInfo`, `RMP.injectBadge`, `RMP.processInstructorElement`, hover popover, adapter registry
  - `content/adapters/banner.js` — Banner-specific scan + MutationObserver
  - `content/index.js` — dispatcher that picks the first adapter whose `matches(location)` returns true
- Manifest content_scripts now lists the four files in load order (name-parser → common → adapters → index). Banner behavior is identical to v1.3.0 — verified by the existing Jest suite (7/7 passing).

### Why
- Foundation for adding PeopleSoft Campus Solutions and Workday Student adapters in upcoming releases without bloating the Banner scan logic. Each new SIS becomes one file that registers itself, instead of branching the scan code with `if (urlMatches(...))` blocks.

## [1.3.0] — 2026-05-09

### Changed
- **Hover popover redesigned** to show RMP's rating distribution chart (Awesome 5 → Awful 1, with bars + counts) instead of tags + most recent reviews. Reading individual reviews requires more context than a hover affords; the distribution gives the at-a-glance "how many awesome vs awful" signal that actually informs a registration decision. Footer link still routes to the full RMP page for users who want to read comments.
- Header now leads with the headline rating and "X% would take again" — same data the badge shows, but bigger and easier to read at a glance.

### Removed
- Tags pill list, recent-review excerpts, course-aware review sort, and the "this course" pill — all replaced by the distribution chart. The course-disambiguation pathway (subject → department) is preserved in `searchProfessor`.

## [1.2.2] — 2026-05-09

### Fixed
- `findCourseInfo` was tied to detecting an ancestor `<tr>`, which Banner SSB9 doesn't always render — many search-results tables are `<div role="row">`. Course context wasn't reaching the popover, so the "this course" pill never rendered (sort still appeared correct only because RMP's date order coincidentally matched). Walker is now tag-agnostic: walks up to 14 ancestors and returns as soon as any one's textContent matches a course-code pattern.
- Adjacent-pattern regex now also accepts "FIN-3124" (hyphen) in addition to whitespace.

## [1.2.1] — 2026-05-09

### Fixed
- **Wrong-professor matches on common surnames.** Removed the lastName-only fallback in `searchProfessor` — it was matching e.g. "Xu, X." (Financial Planning) → "Yajie Xu" (Economics) because the fallback ignored the first initial. Match is now strict (lastName + firstInitial both required); when no candidate matches, the badge correctly shows "No RMP data" rather than confidently surfacing the wrong person.
- When multiple candidates share lastName + firstInitial at the same school, disambiguate by Banner subject code via a curated subject→department-fragment map (FIN→finance, ECO→economics, ACC→accounting, etc.), with `numRatings` as the tiebreaker.

### Added
- **Course-aware review sorting in the popover.** Reviews of the current course (e.g. FIN3124) are surfaced ahead of reviews from other classes the professor has taught. Matching reviews are visually highlighted with a subtle accent strip and a "this course" pill.
- `findCourseInfo()` extracts subject + course code from both Banner search-results table rows and Schedule Details labeled blocks; passed through to RMP search and review sorting.
- Bumped teacher-details query from `ratings(first: 3)` → `ratings(first: 12)` so course-matching reviews are likely to appear in the fetched window.

## [1.2.0] — 2026-05-09

### Added
- **Searchable school picker** in the popup — type any school name (e.g. "Penn State", "UCLA") and pick from live RMP results. Removes the dependency on the 7-school hardcoded dropdown; works at all ~1,400 schools listed on Rate My Professors.
- **Hover popover on each badge** — hovering an inline badge fetches the professor's top tags (e.g. "Tough grader", "Caring") and three most recent reviews with class, quality, and comment. Click-through to RMP from the popover footer.
- **Dark-mode support** — both the inline card and the hover popover now respect `prefers-color-scheme: dark`.
- New extension icon — emerald rounded square with a star and signature rating bar, replacing the placeholder.

### Changed
- Popup widened to 340px and reorganized: current selection shown above the search field; status messages collapse the result list automatically.
- Background service worker now exposes three message types: `rmp:search` (existing), `rmp:teacherDetails`, `rmp:searchSchools`.
- Search results sorted by `numRatings` so the canonical school surfaces first.

## [1.1.1] — 2026-05-08

### Changed
- GraphQL query now uses parameterized `variables` object — eliminates injection risk from DOM-sourced instructor names
- Removed hardcoded `Authorization: Basic` header and spoofed `User-Agent` — RMP endpoint works without them
- `professorUrl()` now validates decoded ID is numeric before constructing URL
- `all_frames` set to `false` — content script no longer runs in sub-iframes
- Added explicit `content_security_policy` to manifest (`script-src 'self'; object-src 'none'`)

## [1.1.0] — 2026-05-08

### Added
- Popup UI with school selector (`popup.html` / `popup.js`) — supports USF Tampa/St. Pete/Lakeland, UF, FSU, UCF, FIU + custom school via RMP URL
- `chrome.storage.sync` for cross-device school setting
- Schedule Details support — badges now inject below `Instructor: Lastname, F. (Primary)` lines, not just search-results table cells
- Three-meter card UI with bar fill scaled to RMP's 1–5 rating scale (was incorrectly 0–5)
- Container-aware layout (planned, simplified to direct grid)

### Changed
- Renamed extension to "Professor Ratings for Banner" — universal, not USF-specific
- Broadened `content_scripts.matches` to `https://*/StudentRegistrationSsb/*` — works on any Banner SSB9 install
- Dropped USF-only `host_permissions` — kept only RMP
- `parseInstructorCell` now finds the pattern anywhere in text (not anchored to start), handling embedded contexts like `"Instructor: Lastname, F. (Primary) CRN: 12345"`
- `scanPage` walks up to the smallest ancestor with a parser match, not just `<td>`
- RMP fetches moved from content script to background service worker — service workers bypass CORS, so the required `Authorization: Basic` header can be sent
- Card UI: white background with single tier-colored bar at bottom (was solid color block)

### Fixed
- "No RMP data" for every professor — root cause: missing `Authorization` header on RMP GraphQL request (auth required even though token is the well-known leaked `test:test`)
- Wrong school IDs in popup: FSU 1118→1237, UCF 1121→1082, FIU 1112→1322, USF St. Pete 4951→4383

## [1.0.0] — Initial

### Added
- Inline RMP rating badges in USF Banner course registration search results
- `name-parser.js` for instructor cell parsing with Jest tests
