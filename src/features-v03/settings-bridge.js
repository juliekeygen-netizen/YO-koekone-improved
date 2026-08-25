(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;

  const SOURCE = 'yo-koekone-improved-settings';
  const extensionRuntime = globalThis.browser?.runtime?.id || globalThis.chrome?.runtime?.id;
  let lastValue = null;

  function post() {
    const value = rt.getSetting?.('exactQuestionSetRestore') !== false;
    if (value === lastValue) return;
    lastValue = value;
    try {
      window.postMessage({
        source: SOURCE,
        type: 'settings-sync',
        exactQuestionSetRestore: value
      }, '*');
    } catch { /* optional bridge; page storage remains a fallback */ }
  }

  // Packaged extensions read storage.local asynchronously. Do not announce the
  // page-origin fallback until that read has settled, otherwise a setting changed
  // from the extension Options page while Yle was closed could be stale for the
  // first carousel request after reopening. Userscripts resolve immediately.
  if (extensionRuntime && rt.settingsReady?.then) {
    rt.settingsReady.then(post, post);
  } else {
    post();
  }

  rt.onSettingsChange?.(post);
})();