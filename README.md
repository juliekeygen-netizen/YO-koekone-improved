# YO+ for Abitreenit

**[Install / update with Tampermonkey](https://www.tampermonkey.net/script_installation.php#url=https://raw.githubusercontent.com/juliekeygen-netizen/YO-koekone-improved/main/YO-koekone-improved.user.js)**  
**[GitHub repository](https://github.com/juliekeygen-netizen/YO-koekone-improved)**  
**[Privacy Policy](PRIVACY.md)**

YO+ is a navigation, recovery and study-workflow companion for Yle Abitreenit' Yo-koekone.

> **Unofficial extension for Yle Abitreenit. Not affiliated with or endorsed by Yle.**

YO+ stays on top of Yle's existing React application instead of replacing it. Yle still renders exams and remains responsible for login, grading and checked answers. YO+ adds browser-friendly routes/history, local recovery for unchecked answers, multi-tab navigation and optional study UI.

The repository/technical identifiers intentionally still use `YO-koekone-improved` so existing upgrades, storage and Firefox signing identity remain compatible after the YO+ rebrand.

## Highlights

- readable subject, exam, task, decimal sub-task and question-practice URLs;
- Refresh plus real browser Back/Forward restoration;
- route-aware browser-tab titles;
- background middle/Ctrl/Cmd-click navigation;
- independent multi-tab use;
- local same-tab recovery for supported unchecked essay, radio, short-text and dropdown answers;
- per-question local-draft status and local-draft removal;
- exact restoration of randomized **Harjoittele kysymyksillä** sets when they still match Yle's current public question data;
- resumable question-practice sessions with filters, compact exact `set=` id and carousel position;
- **Harjoittelun pikavalinnat** / Study Hub with Continue, Recent and Favorites;
- Study Hub exam stars: left-click toggles Favorite, while right-click can forget only the matching Recent-history entry without removing the Favorite;
- exam-title Favorite control;
- optional hiding of selected Yle informational UI;
- YO+ interface language: **Suomi / English / Svenska**;
- Chrome/Firefox toolbar popup plus full Options page;
- standalone Tampermonkey, Chrome and Firefox distributions;
- store-ready icon/Privacy/source-review packaging.

## Languages

YO+ includes an interface language selector:

```text
Suomi
English
Svenska
```

The setting changes **only text added by YO+**. It does not translate Yle's native page labels, questions, answer content or other Yle UI.

The language applies to YO+-owned surfaces including the popup, Options page, in-page settings, Study Hub, Favorites, draft/status UI, warnings/toasts, confirmation prompts and the YO+-generated parts of browser-tab titles.

Chrome/Firefox keep the language in extension `storage.local` and mirror it to the injected Abitreenit layer. The userscript keeps its language locally under the Abitreenit origin.

## Readable routes

Examples:

```text
https://yle.fi/abitreenit/harjoittele
https://yle.fi/abitreenit/harjoittele#/terveystieto
https://yle.fi/abitreenit/harjoittele#/terveystieto/2025-syksy
https://yle.fi/abitreenit/harjoittele#/terveystieto/2025-syksy/tehtava-2
https://yle.fi/abitreenit/harjoittele#/terveystieto/2025-syksy/tehtava-1.2
https://yle.fi/abitreenit/harjoittele#/terveystieto/kysymykset
https://yle.fi/abitreenit/harjoittele#/terveystieto/kysymykset/kysymys-3?aineisto=1&set=ABC123
```

Long Yle UUIDs stay internal. Subject/exam mappings are learned from Yle's current selector/API traffic rather than hard-coded to one subject. When Yle's exact subject API value contains Finnish characters, YO+ preserves that learned value instead of assuming an ASCII spelling.

Task/sub-task scrolling can update the readable URL passively without causing reciprocal scroll-restoration jumps. Direct F5/Back/Forward restoration is handled separately.

## Browser tab titles

Examples in Finnish:

```text
Aloitussivu | Abitreenit
Terveystieto | Abitreenit
Terveystieto syksy 2025 | Abitreenit
Terveystieto kysymykset | Abitreenit
```

The YO+-generated `Aloitussivu` / `kysymykset` words follow the selected YO+ interface language. Subject/exam labels learned from Yle stay as Yle supplied them.

## Middle-click and multiple tabs

Modified-click targets include subject options, exam options, task-list entries, **Hae kysymyksiä**, **Takaisin koevalintaan** and Study Hub links.

Middle-click / Ctrl/Cmd-click opens the managed target in a background tab and leaves the current tab focused. Packaged extensions use the bundled background helper with `tabs.create({ active: false })`; this does **not** require YO+ to request the broad `tabs` permission. The userscript uses `GM_openInTab(..., { active: false })`.

### State model

YO+ deliberately separates tab-local unfinished work from shared convenience metadata:

- unchecked answer drafts: `sessionStorage`, one editable safety copy per tab;
- Study Hub Recent/Favorites/question sessions: same-origin `localStorage`;
- exact randomized question-set metadata: same-origin `localStorage`;
- packaged extension settings/language: extension `storage.local`;
- page/settings mirrors and route mappings: local browser storage;
- cross-tab refresh uses local mechanisms such as `storage` events, BroadcastChannel and Web Locks where available.

YO+ has no developer-operated sync/cloud service.

## Local drafts vs Yle checked answers

YO+ does **not** replace Yle's answer API:

```text
unchecked/editable answer -> optional local same-tab YO+ safety draft
checked/reviewed answer   -> Yle remains authoritative
```

Supported local control families currently include:

- essay textareas;
- radio choices keyed by stable option id;
- short/fill-in text inputs keyed by option index;
- inline/dropdown fill-ins keyed by option index.

A local status can show states equivalent to Saving locally / Saved locally / Draft restored / Checked by Yle. Removing a YO+ local draft removes only YO+'s safety copy; it does not clear the visible answer and does not call Yle's answer API.

During Yle **Tarkista / Tyhjennä / Tarkista kaikki / Tyhjennä kaikki** transitions, local restoration is held until the resulting Yle state is proven so an old fallback cannot immediately resurrect a cleared/reviewed answer.

## Exact randomized question-set restore

Observed public flow:

```text
GET /v1/public/questions/carousel.json?...filters...
GET /v1/public/questions/search.json?uuids=<ordered UUIDs>
```

After a successful search, YO+ can store locally:

- selected root question UUIDs;
- exact expanded UUID order including child questions;
- canonical subject/filter request metadata;
- bounded timestamps/retention.

The route contains only a compact local `set=` id.

On Refresh, the bundled MAIN-world bridge performs Yle's normal current carousel request. If the saved roots/children/request configuration still match that **current** Yle response, YO+ reorders it so Yle's own selector chooses the same roots. It never restores stale cached question objects as if they were current Yle data.

Safety properties include:

- only public question carousel/search `GET` endpoints are involved;
- login, grading and answer-submission endpoints are not part of this feature;
- cookies, Authorization values and checked-answer payloads are not stored by the exact-set feature;
- changed/missing Yle data fails open to native current data;
- failed search/capture cannot advertise a fake resumable `set=` id;
- failed Shuffle preserves the last-known-good set id; successful Shuffle gets a new one;
- shared set writes use serialized/latest-snapshot logic to avoid ordinary multi-tab clobbering.

## Study Hub

The optional **Harjoittelun pikavalinnat** section appears before Yle's normal subject selection once useful local history exists.

It provides:

- **Jatka viimeisintä** — latest eligible exam/task or question-practice session;
- **Viimeksi avatut** — configurable combined activity list;
- **Suosikit** — explicitly starred historical exams;
- **Asetukset** shortcut.

For exam rows, normal left-click on the star still toggles Favorite. Right-clicking that star removes the exam only from **Viimeksi avatut** if it is currently present there. If **Jatka viimeisintä** pointed to the removed exam, YO+ falls to the next newest eligible activity. The Favorite itself is preserved. Right-clicking a Favorite-only entry that is no longer in Recent does not mutate YO+ data. The gesture is hardened for Tampermonkey/content-script cross-realm DOM events by using `composedPath()` rather than realm-sensitive DOM constructor checks.

Question-practice entries preserve subject, filters, current carousel position and exact saved `set=` id when available. Favorites remain exam shortcuts rather than random question-session bookmarks.

Study Hub navigation rows are real anchors, preserving native/background-tab link behavior.

## Settings

Chrome/Firefox include a compact toolbar popup and a full Options page. The userscript exposes equivalent in-page settings and a menu command where supported.

Three navigation behaviors are intentionally always on:

- task/sub-task URL tracking while scrolling;
- modified-click/background-tab enhancement;
- route-aware browser-tab titles.

Optional settings cover:

- **Home:** Study Hub, question-session visibility/policy and Recent count;
- **Answers and drafts:** local drafts, draft status and cross-tab warnings;
- **Exams and tasks:** decimal sub-task links;
- **Question practice:** exact randomized-set restore;
- **Page cleanup:** selected Yle informational elements.

The in-page settings UI also contains local-data clear actions for Recents, Favorites and saved question sets. These do not clear Yle's checked answers.

## Privacy

See **[PRIVACY.md](PRIVACY.md)** for the complete policy.

In short:

- no YO+ developer server;
- no analytics/telemetry;
- no advertising;
- no sale/sharing of YO+ user data;
- settings, unfinished safety drafts and study metadata are stored locally in the browser;
- Yle remains responsible for its own website/account/checked-answer data.

## Packaged browser extensions

### Chrome / Chromium

Development install: load `extensions/chrome/` as an unpacked extension.

Generated manifest:

- Manifest V3;
- store name `YO+ for Abitreenit`;
- short name `YO+`;
- API permissions: only `storage`;
- content scripts: only `https://yle.fi/abitreenit/harjoittele*`;
- packaged 16/32/48/64/96/128 PNG icons.

### Firefox

Development install: load `extensions/firefox/manifest.json` from `about:debugging#/runtime/this-firefox`.

The existing stable Gecko ID is retained for update/signing continuity. Firefox 140+ is required by the packaged extension so the manifest privacy declaration and supported browser APIs stay aligned. The manifest declares no data collection/transmission outside the extension/browser.

Both extension directories are self-contained. Enable only one YO+ distribution on a page during normal testing/use.

### Tampermonkey / Violentmonkey

`YO-koekone-improved.user.js` contains the generated standalone runtime with no remote `@require`. GitHub is used for install/update metadata, not to execute remote code in an already installed copy.

## Store publication material

- Privacy Policy: `PRIVACY.md`

The store listing must remain explicit that YO+ is unofficial and not affiliated with or endorsed by Yle.

## Release packaging

A release tag must exactly match `package.json` as `v<version>`, and the committed tree must already pass `npm run check` before packaging.

Suggested release artifacts:

```text
YO-koekone-improved.user.js
YO-koekone-improved-chrome.zip
YO-koekone-improved-firefox.zip
YO-plus-source.zip
SHA256SUMS.txt
```

`YO-plus-source.zip` is for Firefox AMO source review; it is **not** the installable Firefox extension.

## Source layout

Important sources:

```text
src/core.js
src/page-bridge.js
src/extension-background.js
src/i18n.js
src/i18n-nondom.js
src/features-v03/runtime.js
src/features-v03/settings.js
src/features-v03/settings-bridge.js
src/features-v03/settings-effects.js
src/features-v03/question-sets.js
src/features-v03/new-tabs.js
src/features-v03/subtask-links.js
src/features-v03/title-sync.js
src/features-v03/study-hub.js
src/features-v03/ui-customizations.js
src/features-v03/draft-ui.js
src/features-v03/drafts.js
src/features-v03/answer-sync.js
src/extension-ui/*
assets/icons/*
scripts/build.mjs
scripts/test-routing.mjs
scripts/test-features.mjs
scripts/test-question-sets.mjs
scripts/test-settings.mjs
scripts/test-i18n.mjs
scripts/test-study-hub-history.mjs
scripts/test-repo-health.mjs
```

Generated content order:

```text
runtime -> i18n -> i18n-nondom -> settings -> settings-bridge ->
settings-effects -> question-sets -> new-tabs -> subtask-links -> core ->
title-sync -> study-hub -> ui-customizations -> draft-ui -> drafts -> answer-sync
```


## Source review / build

The build uses Node.js built-ins and the committed source tree. For store/source review, use **Node.js 24.x** on Windows, macOS or Linux.

From the repository root:

```bash
npm run build
npm run check
```

`npm run build` regenerates the standalone userscript plus the Chrome and Firefox extension folders. `npm run check` verifies generated/source parity, runs the regression suite and syntax-checks the shipped JavaScript. No minifier, bundler package, remote code download or external npm dependency is required.


## Maintenance

YO+ is considered feature-complete for what I wanted it to do, so I probably will not keep adding features just for the sake of it. If a browser update or a major Abitreenit change breaks the extension badly, I may try to fix it. Issues and pull requests are still welcome as reports or suggestions, but I cannot promise a response, a fix, or that a pull request will be merged.
