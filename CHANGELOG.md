# Changelog

## [Unreleased]

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
