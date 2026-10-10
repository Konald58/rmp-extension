# Chrome Web Store Listing Copy

Copy/paste each section into the Web Store Developer Dashboard at submission time.

---

## Name (max 75 chars)

```
Professor Ratings for Course Search
```

## Short description (max 132 chars)

```
Rate My Professors ratings inline on Banner and PeopleSoft class search — no extra tabs, no copy-pasting names.
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
• Searchable school picker over Rate My Professors' full school directory
• Smart matching: warns you when multiple professors share the same name so you can verify

WORKS ON
• Ellucian Banner 9 Student Self-Service (Find Classes results and Schedule Details). Verified at the University of South Florida.
• Ellucian Banner 8 classic self-service (Class Schedule Listing, Detailed Class Information, Look Up Classes). Verified at the University of Oregon.
• Oracle PeopleSoft Campus Solutions Class Search. Verified at Northern Arizona University.
• University of Oregon DuckWeb class schedule.
Other schools on these systems should work; the extension is built per system, not per school. If yours does not, use the report link in the popup.

PRIVACY
No tracking. No analytics. No accounts. The only thing this extension stores is your chosen school. Source code is open at github.com/Konald58/rmp-extension.

DISCLAIMER
This is an independent project, not affiliated with any university or with Rate My Professors. Ratings come from RMP and may be inaccurate, outdated, or unrepresentative. Use them as one input, not a verdict.
```

## Single purpose (required)

```
Display Rate My Professors ratings inline on university course-registration pages (Ellucian Banner 9 and Banner 8 self-service, Oracle PeopleSoft Campus Solutions, University of Oregon DuckWeb) so students can evaluate instructors during registration without leaving the page.
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

### Content script on `https://duckweb.uoregon.edu/duckweb/hwskdhnt.*`

DuckWeb is the University of Oregon's own class-schedule application (a custom Banner 8 front end on a single, fixed host). The pattern is limited to that host and to the `hwskdhnt.` schedule procedures, so the extension runs only on UO class-schedule pages.

### Content scripts on `https://*/*bwckschd.p_get_crse_unsec*`, `https://*/*bwckschd.p_disp_detail_sched*`, `https://*/*bwckschd.p_disp_listcrse*`, `https://*/*bwskfcls.P_GetCrse*`

These are the fixed procedure names of Ellucian Banner 8 classic self-service's class schedule listing, detailed class information, and "Look Up Classes" results pages. Banner 8 is hosted on a different domain at every university that still runs it (e.g. duckweb.uoregon.edu), so the wildcard host is required; the paths name specific Banner procedures, so the extension only runs on those class pages, never on unrelated sites.

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
