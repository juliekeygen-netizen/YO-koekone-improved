import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const i18nSource = read('src/i18n.js');
const nonDomSource = read('src/i18n-nondom.js');
const titleSync = read('src/features-v03/title-sync.js');
const build = read('scripts/build.mjs');
const popupHtml = read('src/extension-ui/popup.html');
const optionsHtml = read('src/extension-ui/options.html');

// Pure translation API: no DOM is needed for dictionary/phrase behavior.
{
  const context = {
    console,
    setTimeout,
    clearTimeout,
    addEventListener() {}
  };
  vm.runInNewContext(i18nSource, context, { filename: 'i18n.js' });
  const api = context.YOPlusI18n;
  assert(api, 'i18n API was not exposed');
  assert(JSON.stringify([...api.SUPPORTED_LANGUAGES]) === JSON.stringify(['fi', 'en', 'sv']), 'supported languages must be fi/en/sv');
  assert(api.normalizeLanguage('EN') === 'en', 'language normalization does not accept uppercase EN');
  assert(api.normalizeLanguage('de') === 'fi', 'unsupported languages must fail safely to Finnish');
  assert(api.t('settingsTitle', null, 'en') === 'Settings', 'English settings title missing');
  assert(api.t('settingsTitle', null, 'sv') === 'Inställningar', 'Swedish settings title missing');
  assert(api.translate('Harjoittelun pikavalinnat', 'en') === 'Practice shortcuts', 'known YO+ UI text is not translated');
  assert(api.translate('Valitse oppiaine', 'en') === 'Valitse oppiaine', 'unknown/native Yle text must remain untouched');

  const dynamic = api.translate('Terveystieto – kysymysharjoittelu — kysymys 3', 'en');
  assert(dynamic.includes('question practice') && dynamic.includes('question 3'), 'dynamic question-practice label is not translated');
}

// Extension language startup must not let a stale async read overwrite a newer
// storage.onChanged event, and rapid writes must be serialized in user order.
{
  let resolveInitialRead;
  let storageChanged = null;
  const writes = [];
  const writeResolvers = [];
  const local = new Map([['yo-koekone-improved:language:v1', 'fi']]);
  const context = {
    console,
    setTimeout,
    clearTimeout,
    addEventListener() {},
    localStorage: {
      getItem(key) { return local.has(key) ? local.get(key) : null; },
      setItem(key, value) { local.set(key, String(value)); }
    },
    browser: {
      runtime: { id: 'test-extension' },
      storage: {
        local: {
          get() { return new Promise(resolve => { resolveInitialRead = resolve; }); },
          set(value) {
            writes.push(value.yoPlusLanguageV1);
            return new Promise(resolve => writeResolvers.push(resolve));
          }
        },
        onChanged: { addListener(listener) { storageChanged = listener; } }
      }
    }
  };
  vm.runInNewContext(i18nSource, context, { filename: 'i18n-extension-race.js' });
  assert(typeof storageChanged === 'function', 'extension language storage listener was not registered');
  storageChanged({ yoPlusLanguageV1: { newValue: 'sv' } }, 'local');
  resolveInitialRead({ yoPlusLanguageV1: 'en' });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert(context.YOPlusI18n.getLanguage() === 'sv', 'stale startup language read overwrote a newer storage event');

  context.YOPlusI18n.setLanguage('en');
  context.YOPlusI18n.setLanguage('sv');
  await Promise.resolve();
  assert(JSON.stringify(writes) === JSON.stringify(['en']), 'rapid language writes started concurrently');
  storageChanged({ yoPlusLanguageV1: { newValue: 'en' } }, 'local');
  assert(context.YOPlusI18n.getLanguage() === 'sv', 'older queued language storage echo rolled back a newer local choice');
  writeResolvers.shift()?.();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert(JSON.stringify(writes) === JSON.stringify(['en', 'sv']), 'queued second language write did not start after the first');
  writeResolvers.shift()?.();
  await new Promise(resolve => setTimeout(resolve, 0));

  context.YOPlusI18n.setLanguage('en');
  await Promise.resolve();
  storageChanged({ yoPlusLanguageV1: { newValue: 'sv' } }, 'local');
  assert(context.YOPlusI18n.getLanguage() === 'sv', 'new external language change was swallowed while a local write was pending');
  writeResolvers.shift()?.();
}

// Non-DOM extension-owned surfaces (confirm + userscript menu) are translated,
// while the translator itself remains the authority on whether a string is ours.
{
  let confirmed = '';
  let menuCaption = '';
  const context = {
    console,
    __YO_KOEKONE_IMPROVED_V03_RUNTIME__: {
      translateUiText(value) {
        if (value === 'known prompt') return 'translated prompt';
        if (value === 'known menu') return 'translated menu';
        return value;
      }
    },
    confirm(message) { confirmed = message; return true; },
    GM_registerMenuCommand(caption) { menuCaption = caption; return 1; }
  };
  vm.runInNewContext(nonDomSource, context, { filename: 'i18n-nondom.js' });
  assert(context.confirm('known prompt') === true && confirmed === 'translated prompt', 'confirm wrapper did not localize extension prompt');
  context.GM_registerMenuCommand('known menu');
  assert(menuCaption === 'translated menu', 'userscript menu wrapper did not localize caption');
  context.confirm('native Yle prompt');
  assert(confirmed === 'native Yle prompt', 'non-dictionary prompt should pass through unchanged');
}

// Wiring and scope guards.
assert(i18nSource.includes("const SUPPORTED_LANGUAGES = Object.freeze(['fi', 'en', 'sv'])"), 'language allowlist changed unexpectedly');
assert(i18nSource.includes("const EXTENSION_KEY = 'yoPlusLanguageV1'"), 'packaged language persistence key missing');
assert(i18nSource.includes("const PAGE_KEY = 'yo-koekone-improved:language:v1'"), 'page language mirror key missing');
assert(i18nSource.includes('OWNED_PAGE_SELECTOR'), 'page localization is missing its owned-UI boundary');
assert(i18nSource.includes("#__yo_improved_study_hub__"), 'Study Hub is not included in owned localization UI');
assert(i18nSource.includes("[data-yoplus-i18n-owned]"), 'owned injected localization selector missing');
assert(!i18nSource.includes("document.body.innerText"), 'localization must not rewrite the full Yle page');
assert(titleSync.includes("uiText('homeTitle'"), 'home browser-tab title is not localized by title-sync');
assert(titleSync.includes("uiText('questionsTitleWord'"), 'question browser-tab title is not localized by title-sync');
assert(titleSync.includes('rt.onLanguageChange?.(() => scheduleSettledSyncs())'), 'tab title does not react to language changes');

const order = [
  build.indexOf("'src/features-v03/runtime.js'"),
  build.indexOf("'src/i18n.js'"),
  build.indexOf("'src/i18n-nondom.js'"),
  build.indexOf("'src/features-v03/settings.js'")
];
assert(order.every(index => index >= 0), 'build is missing localization source files');
assert(order.every((index, i) => i === 0 || index > order[i - 1]), 'localization must load after runtime and before settings/UI producers');

for (const [name, html, finalScript] of [
  ['popup', popupHtml, 'popup.js'],
  ['options', optionsHtml, 'options.js']
]) {
  const settingsPos = html.indexOf('settings-store.js');
  const i18nPos = html.indexOf('i18n.js');
  const finalPos = html.indexOf(finalScript);
  assert(settingsPos >= 0 && i18nPos > settingsPos && finalPos > i18nPos, `${name} must load i18n before its controller`);
}

console.log('YO+ localization tests passed.');
