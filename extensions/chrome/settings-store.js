(() => {
  'use strict';
  const api = globalThis.browser || globalThis.chrome;
  const KEY = 'yoKoekoneImprovedSettingsV1';
  const LOCK = 'yo-koekone-improved:extension-settings:v1';
  const PATCH_MESSAGE = 'yo-koekone-improved:patch-settings';
  const REPLACE_MESSAGE = 'yo-koekone-improved:replace-settings';
  const DEFAULTS = Object.freeze({
    localDrafts: true,
    draftStatus: true,
    crossTabWarnings: true,
    studyHub: true,
    showQuestionPracticeInHub: true,
    singleQuestionPracticeRecent: true,
    exactQuestionSetRestore: true,
    subtaskLinks: true,
    hideHowItWorks: false,
    hideLoginIntro: false,
    hideExamDisclaimer: false,
    recentLimit: 5
  });
  let mutationQueue = Promise.resolve();

  function clean(raw) {
    const out = { ...DEFAULTS };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [key, fallback] of Object.entries(DEFAULTS)) {
      if (typeof fallback === 'boolean' && typeof raw[key] === 'boolean') out[key] = raw[key];
    }
    const recent = Number(raw.recentLimit);
    if (Number.isFinite(recent)) out.recentLimit = Math.min(10, Math.max(1, Math.round(recent)));
    return out;
  }

  async function get() {
    if (!api?.storage?.local) return { ...DEFAULTS };
    try {
      const result = await api.storage.local.get(KEY);
      return clean(result?.[KEY]);
    } catch {
      return { ...DEFAULTS };
    }
  }

  async function sendMutation(type, payload) {
    if (!api?.runtime?.sendMessage) return null;
    try {
      const response = await api.runtime.sendMessage({ type, ...payload });
      if (!response?.ok || !response.settings) return null;
      return clean(response.settings);
    } catch {
      return null;
    }
  }

  async function localSet(next) {
    const settings = clean(next);
    if (api?.storage?.local) await api.storage.local.set({ [KEY]: settings });
    return settings;
  }

  function fallbackMutate(mutator) {
    const run = async () => {
      const commit = async () => localSet(await mutator(await get()));
      if (globalThis.navigator?.locks?.request) {
        return globalThis.navigator.locks.request(LOCK, { mode: 'exclusive' }, commit);
      }
      return commit();
    };
    const next = mutationQueue.then(run, run);
    mutationQueue = next.catch(() => {});
    return next;
  }

  async function set(next) {
    const settings = clean(next);
    return (await sendMutation(REPLACE_MESSAGE, { settings })) || fallbackMutate(() => settings);
  }

  async function patch(patchValue) {
    const patch = {};
    for (const [key, value] of Object.entries(patchValue || {})) {
      if (!(key in DEFAULTS)) continue;
      if (typeof DEFAULTS[key] === 'boolean') patch[key] = Boolean(value);
      else patch[key] = clean({ ...DEFAULTS, [key]: value })[key];
    }
    const centralized = await sendMutation(PATCH_MESSAGE, { patch });
    if (centralized) return centralized;
    return fallbackMutate(current => ({ ...current, ...patch }));
  }

  function reset() {
    return set({ ...DEFAULTS });
  }

  globalThis.YOISettingsStore = {
    api, KEY, LOCK, PATCH_MESSAGE, REPLACE_MESSAGE,
    DEFAULTS, clean, get, set, patch, reset
  };
})();
