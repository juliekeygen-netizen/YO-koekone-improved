import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pageSettings = read('src/features-v03/settings.js');
const extensionStore = read('src/extension-ui/settings-store.js');
const extensionBackground = read('src/extension-background.js');
const optionsHtml = read('src/extension-ui/options.html');
const popupHtml = read('src/extension-ui/popup.html');
const hub = read('src/features-v03/study-hub.js');
const pageBridge = read('src/page-bridge.js');

function assert(condition, message) { if (!condition) throw new Error(message); }

for (const key of ['showQuestionPracticeInHub', 'singleQuestionPracticeRecent']) {
  assert(pageSettings.includes(`${key}: true`), `page settings default missing ${key}`);
  assert(extensionStore.includes(`${key}: true`), `extension settings default missing ${key}`);
  assert(optionsHtml.includes(`data-setting="${key}"`), `extension Options control missing ${key}`);
  assert(hub.includes(`'${key}'`), `Study Hub does not consume ${key}`);
}

const alwaysOn = ['scrollTaskUrl', 'modifiedClicks', 'tabTitles'];
assert(pageSettings.includes("const ALWAYS_ON = new Set(['scrollTaskUrl', 'modifiedClicks', 'tabTitles'])"), 'always-on core setting list missing or reordered unexpectedly');
for (const key of alwaysOn) {
  assert(!pageSettings.includes(`    ${key}: true,`), `obsolete optional page default still exposes ${key}`);
  assert(!extensionStore.includes(`    ${key}: true,`), `obsolete extension default still exposes ${key}`);
  assert(!optionsHtml.includes(`data-setting="${key}"`), `Options still exposes always-on setting ${key}`);
  assert(!popupHtml.includes(`data-setting="${key}"`), `popup still exposes always-on setting ${key}`);
}
assert(pageSettings.includes('if (ALWAYS_ON.has(key)) return true;'), 'always-on core behaviors are not forced on by getSetting');

const pageOrder = [
  '<section><h3>Etusivu</h3>',
  '<section><h3>Vastaukset ja luonnokset</h3>',
  '<section><h3>Kokeet ja tehtävät</h3>',
  '<section><h3>Kysymysharjoittelu</h3>',
  '<section><h3>Sivun siistiminen</h3>',
  '<section><h3>Paikalliset tiedot</h3>'
].map(marker => pageSettings.indexOf(marker));
assert(pageOrder.every(index => index >= 0), 'in-page settings sections are incomplete');
assert(pageOrder.every((index, i) => i === 0 || index > pageOrder[i - 1]), 'in-page settings section order regressed');

const optionOrder = ['<h2>Etusivu</h2>', '<h2>Vastaukset ja luonnokset</h2>', '<h2>Kokeet ja tehtävät</h2>', '<h2>Kysymysharjoittelu</h2>', '<h2>Sivun siistiminen</h2>']
  .map(marker => optionsHtml.indexOf(marker));
assert(optionOrder.every(index => index >= 0), 'extension Options sections are incomplete');
assert(optionOrder.every((index, i) => i === 0 || index > optionOrder[i - 1]), 'extension Options section order regressed');

assert(pageSettings.includes('let extensionMutationQueue = Promise.resolve()'), 'in-page extension settings mutations are not serialized');
assert(pageSettings.includes("EXT_PATCH_MESSAGE = 'yo-koekone-improved:patch-settings'"), 'in-page settings do not use the centralized patch protocol');
assert(pageSettings.includes('extensionApi.runtime?.sendMessage'), 'in-page settings do not route mutations through the extension background');
assert(extensionStore.includes("const LOCK = 'yo-koekone-improved:extension-settings:v1'"), 'extension settings fallback is missing its lock id');
assert(extensionStore.includes('let mutationQueue = Promise.resolve()'), 'extension settings store is missing its fallback mutation queue');
assert(extensionStore.includes("PATCH_MESSAGE = 'yo-koekone-improved:patch-settings'"), 'extension UI store does not use the centralized patch protocol');
assert(extensionBackground.includes('let settingsQueue = Promise.resolve()'), 'extension background is missing its cross-context settings queue');
assert(extensionBackground.includes("SETTINGS_PATCH_MESSAGE = 'yo-koekone-improved:patch-settings'"), 'extension background is missing the settings patch handler');
assert(extensionBackground.includes("SETTINGS_REPLACE_MESSAGE = 'yo-koekone-improved:replace-settings'"), 'extension background is missing the settings replace handler');
assert(pageSettings.includes('existing?._yoiCleanup?.()'), 'reopening the in-page settings modal can leak old listeners');
assert(pageSettings.includes('offSettings = onSettingsChange(syncControls)'), 'open in-page settings do not follow cross-tab changes');
assert(pageSettings.includes('await rt.clearSavedQuestionSets?.()'), 'local-data clear UI does not await async question-set clearing');

// Startup reads must never write the just-read full snapshot back to extension
// storage. That stale replace could clobber a sibling setting changed while the
// asynchronous read was in flight. Migration is an empty centralized patch
// against the background worker's latest snapshot; a fresh profile stays local
// defaults until the user actually changes a setting. A revision guard also
// prevents an in-flight old read from rolling back a newer storage.onChanged event.
assert(!pageSettings.includes('queueExtensionMutation(EXT_REPLACE_MESSAGE, { settings: cleaned })'), 'startup still replaces extension storage with a stale read snapshot');
assert(pageSettings.includes('queueExtensionMutation(EXT_PATCH_MESSAGE, { patch: {} })'), 'legacy-key startup migration is not using a latest-snapshot empty patch');
assert(pageSettings.includes('let extensionStorageRevision = 0;'), 'extension startup is missing its storage revision counter');
assert(pageSettings.includes('if (extensionStorageRevision === revisionAtRead)'), 'extension startup can apply a stale async read after a newer storage event');
assert(pageSettings.includes('else apply(DEFAULTS, { persistPage: true });'), 'fresh extension profile does not reset page-origin settings to extension defaults');

// Fallback path: if runtime messaging is unavailable, one extension page still
// serializes rapid changes and cleans obsolete settings.
{
  const state = {
    yoKoekoneImprovedSettingsV1: {
      localDrafts: true,
      studyHub: true,
      tabTitles: false,
      scrollTaskUrl: false,
      modifiedClicks: false
    }
  };
  const delay = () => new Promise(resolve => setTimeout(resolve, 2));
  let lockQueue = Promise.resolve();
  const context = {
    console,
    setTimeout,
    clearTimeout,
    chrome: {
      storage: {
        local: {
          async get(key) { await delay(); return { [key]: state[key] }; },
          async set(value) { await delay(); Object.assign(state, value); }
        }
      }
    },
    navigator: {
      locks: {
        request(_name, _options, callback) {
          const next = lockQueue.then(callback, callback);
          lockQueue = next.catch(() => {});
          return next;
        }
      }
    }
  };
  vm.runInNewContext(extensionStore, context, { filename: 'settings-store.js' });
  const store = context.YOISettingsStore;
  await Promise.all([
    store.patch({ localDrafts: false }),
    store.patch({ studyHub: false })
  ]);
  const saved = await store.get();
  assert(saved.localDrafts === false && saved.studyHub === false, 'rapid fallback settings patches lost a sibling change');
  for (const key of alwaysOn) {
    assert(!Object.prototype.hasOwnProperty.call(saved, key), `legacy always-on key ${key} survived settings migration`);
  }
}

// Normal packaged-extension path: popup, Options and Yle content scripts live in
// different extension/page contexts, so per-page queues alone are insufficient.
// Route two independent stores through one mocked background listener and prove
// simultaneous patches from separate contexts are merged instead of clobbered.
{
  const KEY = 'yoKoekoneImprovedSettingsV1';
  const state = { [KEY]: { localDrafts: true, studyHub: true, recentLimit: 5, tabTitles: false } };
  const delay = () => new Promise(resolve => setTimeout(resolve, 2));
  const listeners = [];
  const storage = {
    local: {
      async get(key) { await delay(); return { [key]: state[key] }; },
      async set(value) { await delay(); Object.assign(state, value); }
    }
  };
  const backgroundApi = {
    runtime: { onMessage: { addListener(listener) { listeners.push(listener); } } },
    storage,
    tabs: { create() { return Promise.resolve(); } }
  };
  vm.runInNewContext(extensionBackground, { console, URL, chrome: backgroundApi }, { filename: 'extension-background.js' });
  assert(listeners.length === 1, 'extension background did not register one message listener');

  const makeUiContext = () => {
    const chrome = {
      storage,
      runtime: {
        sendMessage(message) {
          return Promise.resolve(listeners[0](message));
        }
      }
    };
    const context = { console, setTimeout, clearTimeout, chrome, navigator: {} };
    vm.runInNewContext(extensionStore, context, { filename: 'settings-store.js' });
    return context.YOISettingsStore;
  };

  const storeA = makeUiContext();
  const storeB = makeUiContext();
  await Promise.all([
    storeA.patch({ localDrafts: false }),
    storeB.patch({ studyHub: false })
  ]);
  const saved = await storeA.get();
  assert(saved.localDrafts === false, 'background queue lost the settings mutation from context A');
  assert(saved.studyHub === false, 'background queue lost the settings mutation from context B');
  assert(!Object.prototype.hasOwnProperty.call(state[KEY], 'tabTitles'), 'background patch did not migrate an obsolete always-on key');
}

assert(hub.includes("kind: 'questions'"), 'Study Hub does not model question-practice activities');
assert(hub.includes('setIdFromHash'), 'Study Hub question session does not preserve exact set ids');
assert(hub.includes('navigator?.locks?.request'), 'Study Hub shared library is missing the cross-tab write lock');
assert(hub.includes("addEventListener('storage'"), 'Study Hub is missing cross-tab storage refresh');
assert(pageSettings.includes("addEventListener('storage'"), 'Tampermonkey settings are missing cross-tab storage sync');
assert(pageBridge.includes("QSET_LOCK = 'yo-koekone-improved:qsets-lock:v1'"), 'question-set bridge is missing its cross-tab lock id');
assert(pageBridge.includes('navigator?.locks?.request'), 'question-set writes are missing Web Locks serialization');
assert(pageBridge.includes('function writeSet(setId, incoming)'), 'question-set writes are missing single-set upsert');
assert(pageBridge.includes('const latest = loadStore();'), 'question-set writes are missing latest-snapshot read before upsert');
assert(pageBridge.includes('latest.sets[setId] = incoming'), 'question-set writes do not merge the touched set into the latest snapshot');

console.log('Settings / Study Hub wiring tests passed.');
