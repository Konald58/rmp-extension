# Privacy Policy

**Last updated:** 2026-05-08

## Summary

This extension does not collect, store, or transmit any personally identifiable information. The only data it stores is your chosen school, kept locally in Chrome's sync storage.

## What the extension does

When you visit a Banner SSB9 course registration page, the extension:

1. **Reads instructor names** that are already visible on the page
2. **Sends only the instructor's last name and first initial** to Rate My Professors' GraphQL endpoint (`https://www.ratemyprofessors.com/graphql`) along with your configured school identifier
3. **Displays the result inline** on the page

No other data leaves your browser.

## What is stored

In `chrome.storage.sync`:
- `schoolId` — the numeric Rate My Professors school ID you selected
- `schoolName` — the display name of that school
- `schoolGraphqlId` — the encoded form used in API calls

That's it. No browsing history, no instructor lists, no analytics, no telemetry.

## What is **not** done

- No tracking pixels, analytics, or telemetry
- No data sold or shared with third parties
- No advertising
- No account creation or login
- No persistent identifiers
- No data is sent to any server operated by the extension author

## Third-party service

The extension queries Rate My Professors' public GraphQL endpoint. Your interactions with that endpoint are subject to Rate My Professors' own privacy policy: https://www.ratemyprofessors.com/privacy

## Permissions

| Permission | Why |
|---|---|
| `storage` | Save your selected school |
| Host access to `*.ratemyprofessors.com` | Fetch professor ratings |
| Content script on Banner SSB9 pages (`*/StudentRegistrationSsb/*`) | Read instructor names from the page and inject the rating cards |

## Source code

This extension is open source. You can audit every line at: https://github.com/Konald58/rmp-extension

## Contact

Issues, questions, or concerns: https://github.com/Konald58/rmp-extension/issues
