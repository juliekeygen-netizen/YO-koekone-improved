(() => {
  'use strict';

  const BACKGROUND_TAB_MESSAGE = 'yo-koekone-improved:open-background-tab';
  const SETTINGS_PATCH_MESSAGE = 'yo-koekone-improved:patch-settings';
  const SETTINGS_REPLACE_MESSAGE = 'yo-koekone-improved:replace-settings';
  const SETTINGS_KEY = 'yoKoekoneImprovedSettingsV1';
  const OBSOLETE_SETTINGS = new Set(['scrollTaskUrl', 'modifiedClicks', 'tabTitles']);
  const ALLOWED_ORIGIN = 'https://yle.fi';
  const ALLOWED_PATH = '/abitreenit/harjoittele';
  const api = globalThis.browser || globalThis.chrome;
  let settingsQueue = Promise.resolve();

  if (!api?.runtime?.onMessage) return;

  function allowedUrl(value) {
    try {
      const url = new URL(String(value || ''));
      return url.origin === ALLOWED_ORIGIN && url.pathname === ALLOWED_PATH ? url.href : null;
    } catch {
      return null;
    }
  }

  function cleanedSettings(value) {
    const next = value && typeof value === 'object' && !Array.isArray(value) ? { ...value } : {};
    for (const key of OBSOLETE_SETTINGS) delete next[key];
    return next;
  }

  async function readSettings() {
    if (!api.storage?.local) return {};
    const result = await api.storage.local.get(SETTINGS_KEY);
    return cleanedSettings(result?.[SETTINGS_KEY]);
  }

  function mutateSettings(mode, value) {
    const run = async () => {
      if (!api.storage?.local) return { ok: false };
      const current = await readSettings();
      const incoming = cleanedSettings(value);
      const next = mode === 'replace' ? incoming : { ...current, ...incoming };
      await api.storage.local.set({ [SETTINGS_KEY]: next });
      return { ok: true, settings: next };
    };
    const next = settingsQueue.then(run, run);
    settingsQueue = next.catch(() => {});
    return next;
  }

  api.runtime.onMessage.addListener((message) => {
    if (!message || typeof message.type !== 'string') return undefined;

    if (message.type === BACKGROUND_TAB_MESSAGE) {
      const url = allowedUrl(message.url);
      if (!url || !api.tabs?.create) return Promise.resolve({ ok: false });
      try {
        return Promise.resolve(api.tabs.create({ url, active: false })).then(
          () => ({ ok: true }),
          error => {
            console.warn('[YO-koekone Improved] Could not create background tab.', error);
            return { ok: false };
          }
        );
      } catch (error) {
        console.warn('[YO-koekone Improved] Could not create background tab.', error);
        return Promise.resolve({ ok: false });
      }
    }

    if (message.type === SETTINGS_PATCH_MESSAGE) {
      return mutateSettings('patch', message.patch).catch(error => {
        console.warn('[YO-koekone Improved] Could not patch extension settings.', error);
        return { ok: false };
      });
    }

    if (message.type === SETTINGS_REPLACE_MESSAGE) {
      return mutateSettings('replace', message.settings).catch(error => {
        console.warn('[YO-koekone Improved] Could not replace extension settings.', error);
        return { ok: false };
      });
    }

    return undefined;
  });
})();
