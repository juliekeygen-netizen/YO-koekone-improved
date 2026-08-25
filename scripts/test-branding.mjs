import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const i18n = read('src/i18n.js');
const settings = read('src/features-v03/settings.js');
const studyHub = read('src/features-v03/study-hub.js');
const userscript = read('YO-koekone-improved.user.js');
const chromeContent = read('extensions/chrome/content.js');
const firefoxContent = read('extensions/firefox/content.js');

assert(i18n.includes("fi: 'Nämä poistavat vain YO+:n omia navigointi-/kysymyssarjatietoja."), 'Finnish local-data copy still uses the legacy product name');
assert(i18n.includes("fi: 'Tyhjennetäänkö kaikki YO+:n suosikit?'"), 'Finnish Favorites confirmation still uses the legacy product name');
assert(i18n.includes("hubAria: { fi: 'YO+ pikavalinnat'"), 'Finnish Study Hub accessibility name still uses the legacy product name');

assert(settings.includes('<div class="yoi-settings-kicker">YO+</div>'), 'in-page settings kicker is not YO+');
assert(settings.includes('Nämä poistavat vain YO+:n omia navigointi-/kysymyssarjatietoja.'), 'in-page local-data note is not YO+ branded');
assert(settings.includes("favorites: 'Tyhjennetäänkö kaikki YO+:n suosikit?'"), 'in-page Favorites confirmation is not YO+ branded');
assert(settings.includes("GM_registerMenuCommand('YO+ – Asetukset', renderSettingsModal)"), 'userscript settings menu caption is not YO+ branded');
assert(studyHub.includes("hub.setAttribute('aria-label', 'YO+ pikavalinnat');"), 'Study Hub aria-label is not YO+ branded');

const forbiddenVisibleLegacy = [
  '<div class="yoi-settings-kicker">YO-koekone Improved</div>',
  'YO-koekone Improvedin omia navigointi-/kysymyssarjatietoja',
  'Tyhjennetäänkö kaikki YO-koekone Improvedin suosikit?',
  "hub.setAttribute('aria-label', 'YO-koekone Improved pikavalinnat');",
  "GM_registerMenuCommand('YO-koekone Improved – Asetukset', renderSettingsModal)"
];

for (const [name, source] of [
  ['source settings', settings],
  ['source Study Hub', studyHub],
  ['generated userscript', userscript],
  ['generated Chrome content', chromeContent],
  ['generated Firefox content', firefoxContent]
]) {
  for (const legacy of forbiddenVisibleLegacy) {
    assert(!source.includes(legacy), `${name} still contains visible legacy branding: ${legacy}`);
  }
}

// Technical compatibility identifiers and diagnostic log prefixes intentionally
// keep the old repository/runtime name; this guard is only for user-facing copy.
assert(settings.includes('[YO-koekone Improved]'), 'technical compatibility/log naming unexpectedly changed');

console.log('YO+ user-facing branding checks passed.');
