# Decisions

- **2026-05-08** — All Rate My Professors GraphQL fetches route through the `background.js`
  service worker rather than content scripts, because MV3 content scripts don't reliably
  bypass CORS and service workers do.
- **2026-05-09** — Matching is strict: lastName + firstInitial both required, no
  lastName-only fallback. A lastName-only fallback was matching the wrong professor on common
  surnames (e.g. matching an unrelated department's "Xu, X."); showing "no data" beats
  confidently showing the wrong person. A curated subject-code → department map disambiguates
  when multiple same-initial candidates remain.
- **2026-05-09** — Hover popover redesigned to show Rate My Professors' rating-distribution
  chart (Awesome→Awful with counts) instead of tag pills and review excerpts — a quick
  registration decision needs the shape of the distribution more than individual reviews.
- **2026-05-10** — Content script split into a per-SIS adapter architecture
  (`content/adapters/`): a shared registry in `common.js`, with each registration system as one
  self-registering file that detects itself by URL pattern. Chosen so a new SIS is one new file
  instead of branching the existing scan logic.
- **2026-05-10** — Added Oracle PeopleSoft Campus Solutions Class Search as a second supported
  system, using the adapter architecture above.
- **2026-05-10** — School picker deduplicates multi-campus universities down to one entry per
  school name (e.g. one "USF" instead of Tampa/St. Pete/Lakeland separately). Trades hiding
  small standalone branch campuses for a cleaner picker.
- **2026-05-10** — Repository renamed from `usf-rmp-extension` to `rmp-extension` (GitHub
  redirects the old URL) to reflect that the extension is no longer USF- or Banner-specific.
- **2026-05-11** — `PRIVACY.md` / `STORE_LISTING.md` URLs updated to the renamed repo slug,
  after discovering GitHub Pages does not auto-redirect on a repo rename the way `github.com`
  URLs do.
- **2026-05-13/14** — v2.0.0: added an ambiguity flag (surfaced as a warning on the badge and
  popover) when two or more same-initial candidates match and neither a firstName match nor a
  subject/department match resolves them; added a report-an-issue flow in the popup (a
  pre-filled diagnostic email plus a GitHub Issues link, no external infrastructure or
  telemetry); capped concurrent Rate My Professors requests at 6 in-flight to avoid hammering
  the public endpoint on large course-search pages.
- **2026-05-13/14** — Security hardening: replaced `innerHTML` template-literal interpolation
  in the popup and the popover's rating-distribution labels with DOM-building via `textContent`
  (defense against the pattern even though current inputs are safe); fixed a stale-update race
  in the hover popover with a monotonic request-id counter so only the latest hover ever
  writes.
- **2026-05-14** — Extension display name changed from "Professor Ratings for Banner" to
  "Professor Ratings for Course Search" to reflect multi-SIS scope.
- **2026-05-14** — Added an `isContextAlive()` guard before every message send to the
  background worker, and disconnect any `MutationObserver` once a dead context is detected.
  Reloading/auto-updating the extension while a registration page is open orphans that page's
  content script; the resulting `TypeError` is synchronous and thrown before any Promise, so a
  `.catch` can't intercept it — found on a live smoke test.
- **2026-06-30** — `screenshots/raw/` added to `.gitignore`. Raw listing-asset source captures
  show a logged-in registration page and can carry personal information; only processed,
  PII-free assets under `screenshots/listing/` are committed to this public repo.
