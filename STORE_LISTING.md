# Chrome Web Store Listing Copy

Copy/paste each section into the Web Store Developer Dashboard at submission time.

---

## Name (max 75 chars)

```
Professor Ratings for Course Search
```

## Short description (max 132 chars)

```
See Rate My Professors ratings inline on Banner, PeopleSoft, and other course registration systems — no extra clicks.
```

## Category

`Productivity`

## Detailed description

```
Professor Ratings for Course Search injects Rate My Professors ratings directly into your university's course registration page — so you can compare instructors without leaving the page or copy-pasting names into a new tab.

WHAT YOU GET
• Compact rating card on every instructor: rating, difficulty, would-take-again %
• Color-coded by tier (green ≥ 4.0, gold 3.0–3.9, red < 3.0)
• Hover a card to see the full rating distribution (Awesome → Awful)
• Click any card to open the full RMP profile in a new tab
• Searchable school picker — works at any of the ~1,400 schools listed on Rate My Professors
• Smart matching: warns you when multiple professors share the same name so you can verify

WORKS ON
• Ellucian Banner SSB9 (USF, UF, FSU, UCF, FIU, Penn State, Texas A&M, and ~1,400 more)
• Oracle PeopleSoft Campus Solutions Class Search (NAU, U Houston, FIU, Ohio State, SF State, and hundreds more)
• Find Classes search results AND Schedule Details panel on supported systems

PRIVACY
No tracking. No analytics. No accounts. The only thing this extension stores is your chosen school. Source code is open at github.com/Konald58/rmp-extension.

DISCLAIMER
This is an independent project, not affiliated with any university or with Rate My Professors. Ratings come from RMP and may be inaccurate, outdated, or unrepresentative. Use them as one input, not a verdict.
```

## Single purpose (required)

```
Display Rate My Professors ratings inline on university course-registration pages (Ellucian Banner SSB9, Oracle PeopleSoft Campus Solutions) so students can evaluate instructors during registration without leaving the page.
```

## Permissions justifications

### `storage`
```
Used to save the user's selected school (Rate My Professors school ID) so they don't have to re-select it every session. Synced across devices via chrome.storage.sync.
```

### Host access to `*.ratemyprofessors.com`
```
Required so the service worker can fetch professor rating data from the Rate My Professors GraphQL API. Without it, the extension cannot retrieve any ratings.
```

### Content scripts on `https://*/StudentRegistrationSsb/*` (and `*/ssb/*classRegistration*`, `*/ssb/*scheduleDetails*`)
```
Banner SSB9 is hosted on different domains at every university (e.g. studentssb9.it.usf.edu, banner.fsu.edu, ssb.ufl.edu). The /StudentRegistrationSsb/ path is the universal Banner SSB9 application path. The wildcard host is required to support users at any institution; the path is narrow enough that the extension only runs on Banner registration pages, never on unrelated sites.
```

### Content scripts on `https://*/*COMMUNITY_ACCESS.CLASS_SEARCH.GBL*`
```
This is Oracle PeopleSoft Campus Solutions' universal public Class Search component path, used by hundreds of universities (NAU, U Houston, Ohio State, SF State, and more), each on its own domain. The wildcard host is required to support users at any institution; the path is narrow enough that the extension only runs on PeopleSoft class-search pages, never on unrelated sites.
```

## Privacy practices declarations

- **Personally identifiable information**: No
- **Health information**: No
- **Financial and payment information**: No
- **Authentication information**: No
- **Personal communications**: No
- **Location**: No
- **Web history**: No
- **User activity**: No
- **Website content**: Yes — reads instructor names from the page (necessary for the core function; not stored or transmitted to anywhere except Rate My Professors)
- **Sells or transfers user data to third parties**: No
- **Uses or transfers data for purposes unrelated to single purpose**: No
- **Determines creditworthiness or lending purposes**: No

## Privacy policy URL

```
https://konald58.github.io/rmp-extension/PRIVACY
```
(or wherever you host PRIVACY.md once GitHub Pages is enabled)

## Support email / website

Support email (DuckDuckGo alias forwarding to developer inbox — strips trackers, can be rotated):
```
konstantind@duck.com
```

Website / additional reporting channel (for technical reports):
```
https://github.com/Konald58/rmp-extension/issues
```

---

## Screenshot prompts (you take these)

1. **Search results with badges** — 1280×800. Find Classes tab, ACG2021 results, badges visible
2. **Schedule Details with badges** — 1280×800. Schedule Details panel showing registered courses with instructor cards
3. **Popup** — 1280×800. Extension icon → school selector dropdown
4. *(Optional)* Comparison shot — same instructor, good vs bad rating, showing the color tiers
