(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;

  const SOURCE = 'yo-koekone-improved-page';
  const SET_ID_RE = /^[A-Za-z0-9_-]{4,24}$/;
  const QSET_KEY = 'yo-koekone-improved:qsets:v1';
  const QSET_LOCK = 'yo-koekone-improved:qsets-lock:v1';
  const SHUFFLE_SELECTOR = '[data-testid="shuffle-carousel-items"]';
  let explicitSetMutation = false;
  let pendingShuffleSetId = '';

  function isQuestionsHash(hash) {
    return /^#\/[^/]+\/kysymykset(?:\/|\?|$)/i.test(String(hash || ''));
  }

  function questionsHash() { return isQuestionsHash(location.hash); }

  function setIdFromHash(hash = location.hash) {
    if (!isQuestionsHash(hash)) return '';
    const qi = String(hash).indexOf('?');
    if (qi < 0) return '';
    const id = new URLSearchParams(String(hash).slice(qi + 1)).get('set') || '';
    return SET_ID_RE.test(id) ? id : '';
  }

  function withSetInHash(hash, setId) {
    const raw = String(hash || '');
    const qi = raw.indexOf('?');
    const path = qi >= 0 ? raw.slice(0, qi) : raw;
    const params = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
    if (setId && SET_ID_RE.test(setId)) params.set('set', setId);
    else params.delete('set');
    const query = params.toString();
    return `${path}${query ? `?${query}` : ''}`;
  }

  function replaceSetId(setId) {
    if (!questionsHash()) return;
    const nextHash = withSetInHash(location.hash, setId);
    if (nextHash === location.hash) return;
    explicitSetMutation = true;
    try {
      history.replaceState(history.state, '', `${location.pathname}${location.search}${nextHash}`);
    } finally {
      explicitSetMutation = false;
    }
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    if (typeof original !== 'function') continue;
    history[method] = function(state, title, url) {
      if (!explicitSetMutation && url != null && rt.getSetting?.('exactQuestionSetRestore') !== false) {
        const currentSet = setIdFromHash();
        if (currentSet) {
          try {
            const target = new URL(String(url), location.href);
            if (target.origin === location.origin && target.pathname === rt.BASE_PATH && isQuestionsHash(target.hash) && !setIdFromHash(target.hash)) {
              target.hash = withSetInHash(target.hash, currentSet);
              url = `${target.pathname}${target.search}${target.hash}`;
            }
          } catch { /* fail open */ }
        }
      }
      return original.call(this, state, title, url);
    };
  }

  function toast(message) {
    if (!document.body) return;
    const id = '__yo_improved_qset_toast__';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.textContent = message;
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483646;max-width:430px;padding:10px 12px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.32);background:#222426;color:#fff;border:1px solid #4a4c4f';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 5200);
  }

  addEventListener('message', event => {
    const pageSource = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (event.source && event.source !== window && event.source !== pageSource) return;
    const msg = event.data;
    if (!msg || msg.source !== SOURCE || typeof msg.type !== 'string') return;

    if (msg.type === 'question-set-captured' || msg.type === 'question-set-replayed') {
      pendingShuffleSetId = '';
      if (rt.getSetting?.('exactQuestionSetRestore') === false) return;
      const setId = String(msg.setId || '');
      if (SET_ID_RE.test(setId) && questionsHash()) replaceSetId(setId);
      return;
    }

    if (msg.type === 'question-set-capture-failed') {
      pendingShuffleSetId = '';
      if (questionsHash() && rt.getSetting?.('exactQuestionSetRestore') !== false) {
        toast('Kysymyssarjaa ei voitu tallentaa paikallisesti. Tämä harjoituskerta toimii normaalisti, mutta sitä ei voida palauttaa täsmälleen F5:n jälkeen.');
      }
      return;
    }

    if (msg.type === 'question-set-search-succeeded') {
      pendingShuffleSetId = '';
      return;
    }

    if (msg.type === 'question-set-search-failed') {
      const previous = pendingShuffleSetId;
      pendingShuffleSetId = '';
      if (
        previous && SET_ID_RE.test(previous) && questionsHash() &&
        rt.getSetting?.('exactQuestionSetRestore') !== false && !setIdFromHash()
      ) {
        replaceSetId(previous);
        toast('Kysymysten sekoitus epäonnistui. Edellinen tallennettu kysymyssarja säilytettiin.');
      }
      return;
    }

    if (msg.type === 'question-set-unavailable') {
      pendingShuffleSetId = '';
      const failed = String(msg.setId || '');
      if (failed && failed === setIdFromHash()) replaceSetId('');
      toast('Tallennettua kysymyssarjaa ei voitu palauttaa. Yle käyttää uutta kysymyssarjaa.');
    }
  }, true);

  function eventClosest(event, selector) {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    const nodes = path.length ? path : [event?.target];
    for (const node of nodes) {
      if (!node) continue;
      if (typeof node.matches === 'function' && node.matches(selector)) return node;
      if (typeof node.closest === 'function') {
        const match = node.closest(selector);
        if (match) return match;
      }
    }
    return null;
  }

  document.addEventListener('click', event => {
    if (rt.getSetting?.('exactQuestionSetRestore') === false) return;
    const previous = setIdFromHash();
    if (!previous) return;
    const shuffle = eventClosest(event, SHUFFLE_SELECTOR);
    if (!shuffle || shuffle.disabled || shuffle.getAttribute?.('aria-disabled') === 'true') return;
    pendingShuffleSetId = previous;
    replaceSetId('');
  }, true);

  rt.onSettingsChange?.(next => {
    if (!next.exactQuestionSetRestore) {
      pendingShuffleSetId = '';
      if (setIdFromHash()) replaceSetId('');
    }
  });

  rt.clearSavedQuestionSets = async () => {
    pendingShuffleSetId = '';
    const clear = () => {
      localStorage.removeItem(QSET_KEY);
      if (localStorage.getItem(QSET_KEY) !== null) {
        throw new Error('Saved question-set storage was not cleared');
      }
    };
    try {
      if (globalThis.navigator?.locks?.request) {
        await globalThis.navigator.locks.request(QSET_LOCK, { mode: 'exclusive' }, clear);
      } else {
        clear();
      }
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not clear saved question sets', error);
      throw error;
    }
    if (setIdFromHash()) replaceSetId('');
    return true;
  };
})();
