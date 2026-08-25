(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled || typeof rt.translateUiText !== 'function') return;

  const translate = value => rt.translateUiText(String(value ?? ''));

  // Some extension-owned text never enters our DOM tree (for example the
  // confirmation dialog used by local-data actions). Translate only strings
  // known by YO+'s dictionary; unknown/native Yle strings pass through unchanged.
  if (typeof globalThis.confirm === 'function' && !globalThis.confirm.__yoplusI18nWrapped) {
    const originalConfirm = globalThis.confirm.bind(globalThis);
    const wrappedConfirm = message => originalConfirm(translate(message));
    try { Object.defineProperty(wrappedConfirm, '__yoplusI18nWrapped', { value: true }); } catch { /* optional */ }
    try { globalThis.confirm = wrappedConfirm; } catch { /* fail open */ }
  }

  // Tampermonkey/Violentmonkey menu captions are also outside the page DOM.
  // Wrap registration in this userscript sandbox so our own known caption is
  // localized at registration time without touching other page/native UI.
  if (typeof globalThis.GM_registerMenuCommand === 'function' && !globalThis.GM_registerMenuCommand.__yoplusI18nWrapped) {
    const originalRegister = globalThis.GM_registerMenuCommand;
    const wrappedRegister = function(caption, ...args) {
      return originalRegister.call(this, translate(caption), ...args);
    };
    try { Object.defineProperty(wrappedRegister, '__yoplusI18nWrapped', { value: true }); } catch { /* optional */ }
    try { globalThis.GM_registerMenuCommand = wrappedRegister; } catch { /* fail open */ }
  }
})();

(() => {
  'use strict';

  // The i18n unit harness intentionally has no page DOM. Keep this independent
  // Study Hub gesture inert outside a real browser document.
  if (typeof document === 'undefined' || typeof localStorage === 'undefined') return;

  // Study Hub history gesture: left-click remains favorite toggle; right-click
  // forgets the exam from Recent only. Favorites are deliberately untouched.
  const LIBRARY_KEY = 'yo-koekone-improved:library:v1';
  const HUB_ID = '__yo_improved_study_hub__';
  const runtime = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__ || null;

  function readLibrary() {
    try {
      const value = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function examKey(entry) {
    return `${entry?.subject || ''}/${entry?.exam || ''}`;
  }

  function forgetRecentExam(key) {
    if (typeof runtime?.forgetRecentExam !== 'function') return false;
    Promise.resolve(runtime.forgetRecentExam(key)).catch(error => {
      console.warn('[YO+] Could not remove exam from Recent history', error);
    });
    return true;
  }

  function eventStar(event) {
    // Tampermonkey/content-script DOM objects can come from a different JS realm.
    // `event.target instanceof Element` is therefore not reliable even though the
    // target is a real page element. Walk the composed path using DOM duck-typing.
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    const nodes = path.length ? path : [event?.target];
    for (const node of nodes) {
      if (!node || typeof node.matches !== 'function') continue;
      if (!node.matches('.yoi-hub-star[data-favorite-key]')) continue;
      const hub = typeof node.closest === 'function' ? node.closest(`#${HUB_ID}`) : null;
      if (hub) return node;
    }

    const target = event?.target;
    if (target && typeof target.closest === 'function') {
      const star = target.closest(`#${HUB_ID} .yoi-hub-star[data-favorite-key]`);
      if (star) return star;
    }
    return null;
  }

  document.addEventListener('contextmenu', event => {
    const star = eventStar(event);
    if (!star) return;
    const key = String(star.getAttribute?.('data-favorite-key') || '');
    if (!key) return;

    // If this favorite is not in Recent, leave the browser context menu alone
    // and make no YO+ state change, exactly like a no-op.
    const library = readLibrary();
    if (!(Array.isArray(library.recent) && library.recent.some(entry => examKey(entry) === key))) return;
    if (typeof runtime?.forgetRecentExam !== 'function') return;

    // Suppress Chrome's normal context menu only for an action YO+ actually
    // handles. Capture-phase + stopImmediatePropagation avoids later handlers
    // reopening competing menus while preserving the no-op case above.
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    forgetRecentExam(key);
  }, true);
})();
