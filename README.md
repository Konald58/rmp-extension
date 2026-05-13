# Professor Ratings for Course Search

A Chrome extension that injects [Rate My Professors](https://www.ratemyprofessors.com) ratings inline on university course-registration pages — no extra clicks, no copy-pasting professor names.

Works on:
- **Ellucian Banner SSB9** — ~1,400 universities including USF, UF, FSU, UCF, FIU, Penn State, Texas A&M
- **Oracle PeopleSoft Campus Solutions Class Search** — hundreds of universities including NAU, U Houston, FIU, Ohio State, SF State
- More systems planned (Workday Student, custom registration portals)

## What it does

- Scans your university's course-search page for instructor names — works automatically on Banner SSB9 and PeopleSoft Class Search
- Looks each professor up on Rate My Professors for your selected school
- Renders a compact card on each instructor showing **Rating · Difficulty · Retake %** with a tier-colored bar (green ≥4.0, gold 3.0–3.9, red <3.0)
- Hover any badge for the full rating distribution chart (Awesome → Awful breakdown)
- Click any badge to open the professor's full RMP profile
- Warns you when multiple professors share a name and the match is uncertain — so you don't pick the wrong "Mitchell, K."

## Install

### From Chrome Web Store

(Coming soon)

### From source (load unpacked)

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select this folder
5. Click the extension icon in the toolbar → search and pick your school
6. Visit your university's course-search page

## Configuration

Click the extension icon and search for your school — typeahead pulls from Rate My Professors' full directory of ~1,400 universities. Selection syncs across devices when signed into Chrome.

## Supported systems

| System | Match pattern | Example schools |
|---|---|---|
| **Ellucian Banner SSB9** | `*/StudentRegistrationSsb/*`, `*/ssb/*classRegistration*`, `*/ssb/*scheduleDetails*` | USF, UF, FSU, UCF, FIU, Penn State, Texas A&M (~1,400 total) |
| **Oracle PeopleSoft Campus Solutions** | `*COMMUNITY_ACCESS.CLASS_SEARCH.GBL*` (the public guest namespace) | NAU, U Houston, FIU, Ohio State, SF State (hundreds total) |
| **Workday Student** | (planned) | Cornell, USC, Yale, Brown, CMU, Duke, Georgetown, U Miami |

Each registration system is a separate **adapter** in `content/adapters/`. Adapters detect themselves based on URL pattern and only run on matching pages — so the Banner adapter never fires on PeopleSoft pages and vice versa. Adding a new system means writing one file.

## How it works

```
content/
├── name-parser.js         # Banner instructor pattern extractor
├── common.js              # shared: RMP search, badge inject, popover, walker
├── adapters/
│   ├── banner.js          # Banner SSB9 scan (walks "(Primary)"/"(Secondary)" text)
│   └── peoplesoft.js      # PeopleSoft scan (queries span[id^="MTG_INSTR$"])
└── index.js               # dispatcher — picks first matching adapter

background.js              # service worker; RMP GraphQL client (6 concurrent max)
popup.{html,js}            # school picker + report-an-issue link
styles.css                 # card + popover + dark mode
```

- **`background.js`** handles every RMP GraphQL fetch — service workers bypass CORS so requests to ratemyprofessors.com succeed from any university domain. Concurrent fetches capped at 6 to avoid hammering the public API on large class-search pages.
- **`common.js`** exposes `window.RMP` to adapters: `searchProfessor` (with department-aware disambiguation), `fetchDetails` (rating distribution), `injectBadge`, hover popover, course-context walker.
- **Adapters** are tiny — each one detects its SIS via URL pattern, scans the page DOM (Banner via TreeWalker, PeopleSoft via querySelector), and hands matches to `RMP.processInstructorElement`. MutationObserver re-scans on AJAX-loaded results.
- **`searchProfessor` returns `ambiguous: true`** when 2+ candidates matched and neither firstName match nor subject-dept match resolved them — UI surfaces this as a warning on the badge and popover.
- **`popup.js`** lets users search any RMP school via the live `newSearch.schools` GraphQL query; selection saved to `chrome.storage.sync`. Multi-campus universities are deduped by name.

Tests live under `tests/` (Jest with jsdom). Run with `npm test`.

## Testing

```bash
npm install
npm test
```

29 tests covering name parsing (Banner + PeopleSoft variants) and DOM scan against a live NAU PeopleSoft fixture. CI runs them on every push (`.github/workflows/test.yml`).

## Disclaimer

This is an independent open-source project. Not affiliated with, endorsed by, or sponsored by any university or by Rate My Professors.

Ratings shown are pulled from Rate My Professors and may be inaccurate, outdated, or unrepresentative. Use them as one input, not a verdict.

## Privacy

The extension stores only your selected school in Chrome's sync storage. It does not collect, transmit, or share any other data.

See [PRIVACY.md](PRIVACY.md) for the full policy.

## License

[MIT](LICENSE) — feel free to fork, adapt, and ship for your school.

## Contributing

Issues and PRs welcome. If you ship a fork for another school or registration system, open an issue and I'll link it from this README.
