(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;

  // Core task URL tracking, modified-click handling and dynamic tab titles are
  // permanent product behavior as of v0.6.4. This layer now only arbitrates the
  // legacy top-level scroll tracker against the more precise optional subtask
  // tracker, plus genuinely optional warning UI.

  // The historical core has its own top-level scroll tracker. v0.6 adds a more
  // precise sub-question tracker, so prevent the old tracker from fighting it
  // for the hash while subtask links are enabled. The core tags only its
  // scroll-driven writes with yoKoekoneImproved.scrollTracked; other state
  // updates still pass through normally.
  const originalReplaceState = history.replaceState;
  if (typeof originalReplaceState === 'function') {
    history.replaceState = function(state, title, url) {
      try {
        const ns = state?.yoKoekoneImproved;
        const coreScrollWrite = Boolean(ns?.scrollTracked && !ns?.subtaskScrollTracked && url != null);
        if (coreScrollWrite) {
          const target = new URL(String(url), location.href);
          const changesUrl = target.href !== location.href;
          if (changesUrl && rt.getSetting?.('subtaskLinks') !== false) return undefined;
        }
      } catch { /* fail open */ }
      return originalReplaceState.call(this, state, title, url);
    };
  }

  const style = document.createElement('style');
  style.id = '__yo_improved_settings_effects_style__';
  function apply() {
    style.textContent = rt.getSetting?.('crossTabWarnings') === false
      ? '#__yo_improved_feature_toast__{display:none!important}'
      : '';
  }
  function mount() {
    if (!document.head) return setTimeout(mount, 20);
    if (!style.isConnected) document.head.appendChild(style);
    apply();
  }
  mount();
  rt.onSettingsChange?.(apply);
})();
