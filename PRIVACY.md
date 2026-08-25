# YO+ for Abitreenit — Privacy Policy

_Last updated: 2026-08-23_

YO+ for Abitreenit ("YO+") is an unofficial browser extension/userscript for the Yle Abitreenit Yo-koekone. It is not affiliated with or endorsed by Yle.

## Summary

YO+ does not run a developer-operated server, does not contain analytics or advertising, does not sell or share user data, and does not transmit YO+ data to the developer or to third-party services.

YO+ operates only on:

```text
https://yle.fi/abitreenit/harjoittele*
```

The extension adds navigation, local recovery and study-workflow features on top of Yle's existing page. Yle continues to provide the underlying site, login, exams, grading and checked-answer storage under Yle's own terms and privacy practices.

## Data YO+ stores locally

Depending on the features you use, YO+ can store the following data in your browser:

- **Extension settings and interface language.** Packaged Chrome/Firefox versions use browser extension `storage.local`; the page also keeps a small same-origin language/settings mirror needed by the injected feature layer.
- **Unchecked answer safety drafts.** Supported unfinished answers are kept in that tab's `sessionStorage` so a refresh/navigation mistake can be recovered without turning drafts into a shared cloud document.
- **Study Hub metadata.** Recent exams, favorites, resumable question-practice sessions and related timestamps are kept in browser `localStorage` for the Abitreenit origin.
- **Readable-route mappings.** Subject/exam labels and compact routing metadata learned from the current Abitreenit UI/API traffic are kept locally so readable URLs can be restored.
- **Exact question-practice set metadata.** When exact randomized-set restoration is enabled, YO+ stores the locally selected root question identifiers, expanded question order, request/filter key and bounded timestamps needed to reproduce the same set when it still matches Yle's current public question data.

These stores remain on the user's device/browser profile. YO+ does not provide its own synchronization or cloud backup service.

## Data YO+ does not intentionally collect or transmit

YO+ does not intentionally collect or transmit to the developer:

- names, email addresses or account profiles;
- passwords, authentication tokens or cookies;
- Authorization headers;
- analytics/telemetry or browsing-history feeds;
- advertising identifiers;
- checked-answer request payloads sent to Yle;
- payment information;
- location information.

The exact-question-set feature observes only the public question carousel/search flow required for that feature. It does not intercept Yle login, grading or answer-submission endpoints.

## Communication between tabs

YO+ may use browser-local mechanisms such as `storage` events, `BroadcastChannel` and Web Locks to keep YO+ metadata/settings consistent between tabs. These are local browser mechanisms; YO+ does not send those messages to a YO+ server.

## Yle remains authoritative

YO+ does not replace Yle's checked-answer system. In particular:

```text
unchecked/editable answer -> optional local YO+ safety draft
checked/reviewed answer   -> Yle remains authoritative
```

Using Yle's own **Tarkista**, **Tyhjennä**, login or grading functionality is interaction with Yle's service, not data collection by YO+.

## Deleting local YO+ data

YO+ includes controls for deleting its local data:

- a supported question's draft status menu can remove that question's local safety draft;
- the YO+ settings screen can clear recent activity, favorites and saved randomized question sets;
- tab-scoped `sessionStorage` drafts disappear when that tab/session is closed by the browser;
- packaged-extension settings can be removed by uninstalling the extension or clearing extension storage.

Some YO+ data is deliberately stored in Yle's page-origin `localStorage` so the injected page layer and different distribution types can use it. Browser extension uninstall does not necessarily remove that site-origin storage. Clear it from YO+ before uninstalling, or clear site data for `yle.fi` in your browser if you want to remove all remaining page-origin YO+ data.

## Permissions and site access

Packaged Chrome and Firefox versions request only the `storage` extension API permission. Their content-script access is restricted to the Abitreenit practice URL shown above. YO+ does not request `<all_urls>` access.

The extension contains its executable code inside the distributed package. It does not download and execute remote JavaScript.

## Changes to this policy

If YO+ gains functionality that changes its data handling, this policy will be updated with the project release.

## Contact

Questions or privacy reports can be opened in the project's GitHub Issues:

https://github.com/juliekeygen-netizen/YO-koekone-improved/issues
