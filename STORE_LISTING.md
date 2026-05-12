# Chrome Web Store Listing Copy

Copy/paste each section into the Web Store Developer Dashboard at submission time.

---

## Name (max 75 chars)

```
Professor Ratings for Banner
```

## Short description (max 132 chars)

```
See Rate My Professors ratings inline while picking classes on Banner SSB9. Works at USF, UF, FSU, and most schools using Banner.
```

## Category

`Productivity`

## Detailed description

```
Professor Ratings for Banner injects Rate My Professors ratings directly into your Banner SSB9 course registration page — so you can compare instructors without leaving Banner.

WHAT YOU GET
• Compact rating card on every instructor: rating, difficulty, would-take-again %
• Color-coded by tier (green ≥ 4.0, gold 3.0–3.9, red < 3.0)
• Click any card to open the full RMP profile in a new tab
• Works on the Find Classes search results AND the Schedule Details panel
• Container-aware layout — the card fits whatever cell width Banner gives it

UNIVERSAL — PICK YOUR SCHOOL
Pre-configured for USF (Tampa, St. Petersburg, Lakeland), University of Florida, Florida State, UCF, and FIU. For any other school, paste your Rate My Professors school URL once and you're set. About 1,400 universities run Banner SSB9.

PRIVACY
No tracking. No analytics. No accounts. The only thing this extension stores is your chosen school. Source code is open at github.com/Konald58/rmp-extension.

DISCLAIMER
This is an independent project, not affiliated with any university or with Rate My Professors. Ratings come from RMP and may be inaccurate, outdated, or unrepresentative. Use them as one input, not a verdict.
```

## Single purpose (required)

```
Display Rate My Professors ratings inline on Ellucian Banner SSB9 course registration pages so students can evaluate instructors during registration without leaving the page.
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

### Content scripts on `https://*/StudentRegistrationSsb/*`
```
Banner SSB9 is hosted on different domains at every university (e.g. studentssb9.it.usf.edu, banner.fsu.edu, ssb.ufl.edu). The /StudentRegistrationSsb/ path is the universal Banner SSB9 application path. The wildcard host is required to support users at any institution; the path is narrow enough that the extension only runs on Banner registration pages, never on unrelated sites.
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

Use your GitHub issues page:
```
https://github.com/Konald58/rmp-extension/issues
```

---

## Screenshot prompts (you take these)

1. **Search results with badges** — 1280×800. Find Classes tab, ACG2021 results, badges visible
2. **Schedule Details with badges** — 1280×800. Schedule Details panel showing registered courses with instructor cards
3. **Popup** — 1280×800. Extension icon → school selector dropdown
4. *(Optional)* Comparison shot — same instructor, good vs bad rating, showing the color tiers
