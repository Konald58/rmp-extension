# Professor Ratings for Banner

A Chrome extension that injects [Rate My Professors](https://www.ratemyprofessors.com) ratings inline on Ellucian Banner SSB9 course registration pages.

Used by ~1,400 universities, including USF, UF, FSU, UCF, FIU, Penn State, Texas A&M, and many others.

![Badge example](docs/screenshot-search.png)

## What it does

- Scans the **Find Classes** results, the **Schedule Details** panel, and any other Banner page that lists instructors
- Looks each professor up on Rate My Professors for your configured school
- Renders a compact card showing **Rating · Difficulty · Retake %** and a tier-colored bar
- Click the card to open the professor's full RMP profile

## Install

### From Chrome Web Store

(Coming soon)

### From source (load unpacked)

1. Clone or download this repo
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** → select this folder
5. Click the extension icon in the toolbar → pick your school
6. Visit your university's Banner SSB9 registration page

## Configuration

Click the extension icon and choose your school from the dropdown. Pre-configured:

- USF (Tampa / Sarasota), USF St. Petersburg, USF Lakeland
- University of Florida
- Florida State University
- University of Central Florida
- Florida International University
- **Other** — paste any RMP school URL (e.g. `https://www.ratemyprofessors.com/school/1262`)

Selection syncs across devices when signed into Chrome.

## How it works

- **`content.js`** scans the page for `Lastname, F. (Primary|Secondary)` patterns and walks up to find the smallest containing element
- **`background.js`** (service worker) handles all RMP GraphQL fetches — service workers bypass CORS so the required `Authorization` header can be sent
- **`name-parser.js`** extracts last name + first initial from common Banner formats (incl. multi-word last names like "De La Cruz")
- **`popup.html` / `popup.js`** lets the user pick a school; setting saved to `chrome.storage.sync`
- Container queries in CSS adapt the card layout to the cell width

Tests for the parser live under `tests/`. Run with `npm test`.

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
