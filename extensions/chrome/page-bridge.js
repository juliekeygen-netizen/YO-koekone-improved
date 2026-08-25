(() => {
  'use strict';

  const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
  const MARKER = '__YO_KOEKONE_IMPROVED_PAGE_BRIDGE_V1__';
  if (!pageWindow || pageWindow[MARKER]) return;
  pageWindow[MARKER] = true;

  const QSET_KEY = 'yo-koekone-improved:qsets:v1';
  const QSET_LOCK = 'yo-koekone-improved:qsets-lock:v1';
  const SETTINGS_KEY = 'yo-koekone-improved:settings:v1';
  const MESSAGE_SOURCE = 'yo-koekone-improved-page';
  const SETTINGS_SOURCE = 'yo-koekone-improved-settings';
  const CAROUSEL_PATH = '/v1/public/questions/carousel.json';
  const SEARCH_PATH = '/v1/public/questions/search.json';
  const API_HOST = 'tehtava.api.yle.fi';
  const MAX_SETS = 30;
  const MAX_ROOTS = 20;
  const SET_TTL = 1000 * 60 * 60 * 24 * 30;
  const SETTINGS_WAIT_MS = 120;
  const SET_ID_RE = /^[A-Za-z0-9_-]{4,24}$/;
  const originalFetch = pageWindow.fetch;
  if (typeof originalFetch !== 'function') return;

  let lastCarousel = null;
  let replayingSetId = '';
  let exactSettingOverride = null;
  let settingsReadyResolve = null;
  let storeWriteQueue = Promise.resolve();
  const settingsReady = new Promise(resolve => { settingsReadyResolve = resolve; });

  function readJsonStorage(key, fallback) {
    try {
      const value = JSON.parse(pageWindow.localStorage.getItem(key) || '');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
    } catch { return fallback; }
  }

  function exactRestoreEnabled() {
    if (typeof exactSettingOverride === 'boolean') return exactSettingOverride;
    const settings = readJsonStorage(SETTINGS_KEY, {});
    return settings.exactQuestionSetRestore !== false;
  }

  function settingsMessage(event) {
    if (event.source && event.source !== pageWindow) return;
    const msg = event.data;
    if (!msg || msg.source !== SETTINGS_SOURCE || msg.type !== 'settings-sync') return;
    if (typeof msg.exactQuestionSetRestore !== 'boolean') return;
    exactSettingOverride = msg.exactQuestionSetRestore;
    settingsReadyResolve?.();
    settingsReadyResolve = null;
  }
  pageWindow.addEventListener('message', settingsMessage, true);

  async function waitForSettingsSync() {
    if (typeof exactSettingOverride === 'boolean') return;
    await Promise.race([
      settingsReady,
      new Promise(resolve => pageWindow.setTimeout(resolve, SETTINGS_WAIT_MS))
    ]);
  }

  function loadStore() {
    const raw = readJsonStorage(QSET_KEY, {});
    const sets = raw.sets && typeof raw.sets === 'object' && !Array.isArray(raw.sets) ? raw.sets : {};
    const now = Date.now();
    for (const [id, set] of Object.entries(sets)) {
      const at = Number(set?.lastUsedAt || set?.createdAt || 0);
      if (!at || now - at > SET_TTL) delete sets[id];
    }
    return { version: 1, sets };
  }

  function setStamp(set) {
    return Number(set?.lastUsedAt || set?.createdAt || 0);
  }

  function writeSet(setId, incoming) {
    try {
      const latest = loadStore();
      const current = latest.sets[setId];
      if (!current || setStamp(incoming) >= setStamp(current)) latest.sets[setId] = incoming;
      const entries = Object.entries(latest.sets)
        .sort((a, b) => setStamp(b[1]) - setStamp(a[1]))
        .slice(0, MAX_SETS);
      const saved = { version: 1, sets: Object.fromEntries(entries) };
      pageWindow.localStorage.setItem(QSET_KEY, JSON.stringify(saved));
      return saved;
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not persist question set', error);
      return null;
    }
  }

  function saveSet(setId, incoming) {
    const run = async () => {
      const commit = () => writeSet(setId, incoming);
      if (pageWindow.navigator?.locks?.request) {
        // Same-origin Web Locks serialize capture/replay metadata updates from
        // separate Yo-koekone tabs/windows. Only the touched set is upserted, so
        // a stale pre-lock snapshot cannot resurrect unrelated sets after Clear.
        return pageWindow.navigator.locks.request(QSET_LOCK, { mode: 'exclusive' }, commit);
      }
      // Best-effort fallback for browsers without Web Locks: merge once against
      // the latest snapshot, yield, then repair only if another writer removed
      // this just-written id in the same turn.
      let result = commit();
      await Promise.resolve();
      if (!loadStore().sets[setId]) result = commit();
      return result;
    };
    const next = storeWriteQueue.then(run, run);
    storeWriteQueue = Promise.resolve(next).catch(() => {});
    return next;
  }

  function isQuestionPracticeHash() {
    return /^#\/[^/]+\/kysymykset(?:\/|\?|$)/i.test(String(pageWindow.location.hash || ''));
  }

  function activeSetId() {
    try {
      const raw = String(pageWindow.location.hash || '');
      const qi = raw.indexOf('?');
      if (qi < 0) return '';
      const id = new URLSearchParams(raw.slice(qi + 1)).get('set') || '';
      return SET_ID_RE.test(id) ? id : '';
    } catch { return ''; }
  }

  function makeSetId(store) {
    for (let attempt = 0; attempt < 10; attempt++) {
      let id = '';
      try {
        const bytes = new Uint8Array(6);
        pageWindow.crypto.getRandomValues(bytes);
        id = [...bytes].map(v => v.toString(36).padStart(2, '0')).join('').slice(0, 10).toUpperCase();
      } catch {
        id = Math.random().toString(36).slice(2, 10).toUpperCase();
      }
      if (SET_ID_RE.test(id) && !store.sets[id]) return id;
    }
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`.slice(-12);
  }

  function canonicalList(value) {
    return String(value || '').split(',').map(v => v.trim()).filter(Boolean).sort().join(',');
  }

  function requestKey(url) {
    const params = new URLSearchParams();
    for (const key of ['lang', 'subject', 'exam_types', 'options', 'question_types']) {
      let value = url.searchParams.get(key) || '';
      if (key === 'options' || key === 'question_types' || key === 'exam_types') value = canonicalList(value);
      params.set(key, value);
    }
    return `${url.pathname}?${params.toString()}`;
  }

  function responseFromJson(response, body) {
    const headers = new pageWindow.Headers(response.headers);
    for (const name of ['content-length', 'content-encoding', 'content-range', 'etag']) {
      try { headers.delete(name); } catch { /* optional */ }
    }
    headers.set('content-type', 'application/json;charset=utf-8');
    const synthetic = new pageWindow.Response(JSON.stringify(body), {
      status: response.status,
      statusText: response.statusText,
      headers
    });
    for (const prop of ['url', 'redirected', 'type']) {
      try { Object.defineProperty(synthetic, prop, { value: response[prop], configurable: true }); }
      catch { /* optional */ }
    }
    return synthetic;
  }

  function carouselModel(body, key) {
    const data = Array.isArray(body?.data) ? body.data.filter(item => item && typeof item.uuid === 'string') : [];
    const byId = new Map(data.map(item => [String(item.uuid), item]));
    const childIds = new Set();
    for (const item of data) {
      for (const child of Array.isArray(item.child_ids) ? item.child_ids : []) childIds.add(String(child));
    }
    return { body, data, byId, childIds, requestKey: key, at: Date.now() };
  }

  function expansionForRoots(model, roots) {
    const ids = [];
    for (const rawRoot of roots) {
      const root = String(rawRoot);
      const item = model.byId.get(root);
      if (!item || model.childIds.has(root)) return null;
      ids.push(root);
      for (const child of Array.isArray(item.child_ids) ? item.child_ids : []) ids.push(String(child));
    }
    return ids;
  }

  function sameList(a, b) {
    return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((value, index) => String(value) === String(b[index]));
  }

  function validRootCount(count) {
    return Number.isInteger(count) && count > 0 && count <= MAX_ROOTS;
  }

  function reorderForSet(model, saved) {
    const roots = Array.isArray(saved?.roots) ? saved.roots.map(String) : [];
    const uuids = Array.isArray(saved?.uuids) ? saved.uuids.map(String) : [];
    if (!validRootCount(roots.length) || saved?.requestKey !== model.requestKey) return null;
    const expanded = expansionForRoots(model, roots);
    if (!expanded || !sameList(expanded, uuids)) return null;

    const selected = new Set(roots);
    const rootObjects = roots.map(id => model.byId.get(id));
    if (rootObjects.some(item => !item)) return null;
    const rest = model.data.filter(item => !selected.has(String(item.uuid)));
    return { ...model.body, data: [...rootObjects, ...rest] };
  }

  function post(type, detail = {}) {
    try { pageWindow.postMessage({ source: MESSAGE_SOURCE, type, ...detail }, '*'); }
    catch { /* optional */ }
  }

  async function handleCarousel(thisArg, args, url) {
    const response = await originalFetch.apply(thisArg, args);
    if (!response?.ok) return response;

    try {
      const body = await response.clone().json();
      const model = carouselModel(body, requestKey(url));
      lastCarousel = model;
      replayingSetId = '';

      await waitForSettingsSync();
      if (!exactRestoreEnabled() || !isQuestionPracticeHash()) return response;
      const setId = activeSetId();
      if (!setId) return response;

      const store = loadStore();
      const saved = store.sets[setId];
      const replayBody = reorderForSet(model, saved);
      if (!replayBody) {
        post('question-set-unavailable', { setId });
        return response;
      }

      const touched = { ...saved, lastUsedAt: Date.now() };
      await saveSet(setId, touched);
      replayingSetId = setId;
      lastCarousel = carouselModel(replayBody, model.requestKey);
      post('question-set-replayed', { setId, roots: touched.roots, uuids: touched.uuids });
      return responseFromJson(response, replayBody);
    } catch (error) {
      console.warn('[YO-koekone Improved] Exact question-set replay failed open', error);
      return response;
    }
  }

  async function captureSearch(url) {
    if (!exactRestoreEnabled() || !isQuestionPracticeHash() || !lastCarousel) return null;
    const raw = url.searchParams.get('uuids') || '';
    const uuids = raw.split(',').map(v => v.trim()).filter(Boolean);
    if (!uuids.length) return null;
    if (!uuids.every(id => lastCarousel.byId.has(id) || lastCarousel.childIds.has(id))) return null;

    const roots = uuids.filter(id => lastCarousel.byId.has(id) && !lastCarousel.childIds.has(id));
    if (!validRootCount(roots.length)) return null;
    const expanded = expansionForRoots(lastCarousel, roots);
    if (!expanded || !sameList(expanded, uuids)) return null;

    const store = loadStore();
    const currentId = activeSetId();
    const current = currentId ? store.sets[currentId] : null;
    let setId = '';
    let saved = null;

    if (
      currentId && current &&
      current.requestKey === lastCarousel.requestKey &&
      sameList(current.roots, roots) && sameList(current.uuids, uuids)
    ) {
      setId = currentId;
      saved = { ...current };
    } else if (
      replayingSetId && store.sets[replayingSetId] &&
      store.sets[replayingSetId].requestKey === lastCarousel.requestKey &&
      sameList(store.sets[replayingSetId].roots, roots) && sameList(store.sets[replayingSetId].uuids, uuids)
    ) {
      setId = replayingSetId;
      saved = { ...store.sets[replayingSetId] };
    } else {
      setId = makeSetId(store);
      saved = {
        roots,
        uuids,
        requestKey: lastCarousel.requestKey,
        createdAt: Date.now(),
        lastUsedAt: Date.now()
      };
    }

    saved.lastUsedAt = Date.now();
    const persisted = await saveSet(setId, saved);
    if (!persisted?.sets?.[setId]) {
      post('question-set-capture-failed', { reason: 'storage' });
      return false;
    }
    replayingSetId = setId;
    post('question-set-captured', { setId, roots, uuids });
    return true;
  }

  async function handleSearch(thisArg, args, url) {
    const response = await originalFetch.apply(thisArg, args);
    if (response?.ok) {
      try {
        await captureSearch(url);
      } catch (error) {
        console.warn('[YO-koekone Improved] Could not persist captured question set', error);
        post('question-set-capture-failed', { reason: 'storage' });
      }
      post('question-set-search-succeeded', { status: Number(response.status || 200) });
    } else if (isQuestionPracticeHash()) {
      post('question-set-search-failed', { status: Number(response?.status || 0) });
    }
    return response;
  }

  pageWindow.fetch = async function(input, init) {
    let url;
    let method = 'GET';
    try {
      const requestLike = Boolean(
        input && typeof input === 'object' &&
        typeof input.url === 'string' && typeof input.method === 'string' &&
        typeof input.clone === 'function'
      );
      const rawUrl = requestLike ? input.url : String(input);
      url = new pageWindow.URL(rawUrl, pageWindow.location.href);
      method = String(init?.method || (requestLike ? input.method : 'GET') || 'GET').toUpperCase();
    } catch {
      return originalFetch.apply(this, arguments);
    }

    if (method !== 'GET' || url.hostname !== API_HOST) return originalFetch.apply(this, arguments);
    if (url.pathname === CAROUSEL_PATH) return handleCarousel(this, arguments, url);
    if (url.pathname === SEARCH_PATH) return handleSearch(this, arguments, url);
    return originalFetch.apply(this, arguments);
  };
})();
