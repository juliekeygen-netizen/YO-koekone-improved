# YO+ browser extension distributions

Both browser-extension folders are generated from the same modular source as the userscript, and each installed extension is fully standalone at runtime.

User-facing product name: **YO+ for Abitreenit**  
Short name: **YO+**  
Technical repository/storage/Firefox IDs intentionally retain `YO-koekone-improved` naming for upgrade compatibility.

> Unofficial extension for Yle Abitreenit. Not affiliated with or endorsed by Yle.

## Source of truth

Important inputs include:

- `../src/core.js` — routing/restoration core;
- `../src/i18n.js` — FI/EN/SV YO+-owned UI localization;
- `../src/i18n-nondom.js` — YO+ browser-dialog/userscript-menu localization;
- `../src/features-v03/runtime.js` — shared runtime/answer model;
- `../src/features-v03/settings.js` — settings + in-page Options UI;
- `../src/features-v03/question-sets.js` — exact randomized-set UI/state;
- `../src/features-v03/new-tabs.js` — modified-click/background-tab integration;
- `../src/features-v03/title-sync.js` — route-aware/localized browser-tab titles;
- `../src/features-v03/study-hub.js` — Continue/Recent/Favorites;
- `../src/features-v03/drafts.js` — unchecked draft recovery;
- `../src/features-v03/answer-sync.js` — Review/Clear and cross-tab synchronization;
- `../src/extension-background.js` — extension-only background-tab/settings helper;
- `../src/extension-ui/*` — popup and Options pages;
- `../assets/icons/*` — committed YO+ PNG icon set.

Generated layout includes:

```text
extensions/chrome/
  manifest.json
  content.js
  page-bridge.js
  background.js
  i18n.js
  popup.*
  options.*
  settings-store.js
  icons/*.png

extensions/firefox/
  manifest.json
  content.js
  page-bridge.js
  background.js
  i18n.js
  popup.*
  options.*
  settings-store.js
  icons/*.png
```

`content.js` is the complete isolated-world generated page bundle. `page-bridge.js` is the locally packaged MAIN-world public-question bridge. Neither extension downloads executable project JavaScript from GitHub when it runs.

Do not edit generated files directly. Edit sources and run:

```bash
npm run build
npm run check
```

## Chrome / Chromium development install

Folder: `extensions/chrome`

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select `extensions/chrome`.

The generated extension is Manifest V3. Its API permission list is only:

```json
["storage"]
```

Content scripts match only:

```text
https://yle.fi/abitreenit/harjoittele*
```

The local service worker handles extension settings mutations and the internal background-tab request. `tabs.create({ active: false })` is used without requesting a broad tab-reading permission.

## Firefox development install

Folder: `extensions/firefox`

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on...**.
3. Select `extensions/firefox/manifest.json`.

Firefox uses the same local runtime and background helper. The stable Gecko ID is preserved for signing/update continuity, Firefox 140+ is required by the packaged extension, and the manifest declares `data_collection_permissions.required: ["none"]`.

A temporary add-on disappears when Firefox restarts. Permanent normal installation requires a signed package / AMO distribution unless the Firefox build/policy allows unsigned add-ons.

For AMO/source review build instructions, see the **Source review / build** section in `../README.md`.

## Language behavior

YO+ UI supports Finnish, English and Swedish. The language selector lives in YO+ settings.

Only YO+-owned UI is translated. Native Yle content remains unchanged. Packaged language state is kept in extension `storage.local` and mirrored to the injected YO+ page layer.

## Background-tab behavior

Modified-click navigation is intentionally browser-like:

- normal left click navigates the current tab;
- middle click opens the destination in a new background tab and keeps focus on the current tab;
- Ctrl+click / Cmd+click uses the same background-tab behavior.

The userscript uses `GM_openInTab(..., { active: false })`. Browser extensions use their bundled `background.js` helper. A `window.open()` fallback exists only for unsupported environments.

## Offline / repository independence

Once either extension folder has been downloaded and loaded, the installed build does not need this GitHub repository to remain online. All executable project code is local to the extension folder.

The userscript likewise contains its standalone page runtime; GitHub URLs in its metadata are for homepage/support and install/update checks.

## Multiple Yo-koekone tabs vs multiple distributions

Several browser tabs may run the same distribution at once; that is intentional.

Inside a single tab, use only one distribution:

- userscript; or
- Chrome extension; or
- Firefox extension.

DOM/runtime guards protect against accidental double activation, but one distribution per tab is the supported configuration.

## Store material

- Privacy Policy: `../PRIVACY.md`
- source/build review instructions: `../README.md`
