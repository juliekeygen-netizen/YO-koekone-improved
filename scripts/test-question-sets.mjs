import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src', 'page-bridge.js'), 'utf8');

function assert(condition, message) { if (!condition) throw new Error(message); }
function same(actual, expected, label) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  assert(a === e, `${label}\nexpected ${e}\nactual   ${a}`);
}

class MemoryStorage {
  constructor() { this.map = new Map(); this.concurrentSet = null; this.blockQsetWrites = false; }
  getItem(key) {
    const value = this.map.has(key) ? this.map.get(key) : null;
    if (key === 'yo-koekone-improved:qsets:v1' && this.concurrentSet) {
      const injected = this.concurrentSet;
      this.concurrentSet = null;
      let parsed = {};
      try { parsed = JSON.parse(value || '{}'); } catch { parsed = {}; }
      const sets = parsed.sets && typeof parsed.sets === 'object' ? parsed.sets : {};
      this.map.set(key, JSON.stringify({ version: 1, sets: { ...sets, [injected.id]: injected.value } }));
    }
    return value;
  }
  setItem(key, value) {
    if (key === 'yo-koekone-improved:qsets:v1' && this.blockQsetWrites) throw new Error('simulated qset storage failure');
    this.map.set(String(key), String(value));
  }
  removeItem(key) { this.map.delete(String(key)); }
  injectConcurrentSetOnNextQsetRead(id, value) { this.concurrentSet = { id, value }; }
  setQsetWritesBlocked(value) { this.blockQsetWrites = Boolean(value); }
}

const storage = new MemoryStorage();
const messages = [];
const listeners = new Map();
let carouselCalls = 0;
let currentCarousel = null;
let failNextSearch = false;
const base = 'https://tehtava.api.yle.fi/v1/public/questions/carousel.json?lang=fi-FI&subject=terveystieto&exam_types=yo-koe&options=&question_types=';
const filteredBase = 'https://tehtava.api.yle.fi/v1/public/questions/carousel.json?lang=fi-FI&subject=terveystieto&exam_types=yo-koe&options=material,noMaterial&question_types=';
const searchBase = 'https://tehtava.api.yle.fi/v1/public/questions/search.json?uuids=';

const roots = [
  { uuid: 'A', child_ids: ['A1'] }, { uuid: 'A1', child_ids: [] },
  { uuid: 'B', child_ids: [] }, { uuid: 'C', child_ids: ['C1', 'C2'] },
  { uuid: 'C1', child_ids: [] }, { uuid: 'C2', child_ids: [] },
  { uuid: 'D', child_ids: [] }, { uuid: 'E', child_ids: [] }, { uuid: 'F', child_ids: [] }
];
currentCarousel = { data: roots, meta: { count: roots.length } };

const originalFetch = async input => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes('/carousel.json')) {
    carouselCalls++;
    return new Response(JSON.stringify(currentCarousel), {
      status: 200,
      headers: {
        'content-type': 'application/json;charset=utf-8',
        'content-length': '9999',
        'content-encoding': 'br',
        etag: 'network-payload-etag'
      }
    });
  }
  if (url.includes('/search.json') && failNextSearch) {
    failNextSearch = false;
    return new Response(JSON.stringify({ error: true }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
  return new Response(JSON.stringify({ data: [] }), { status: 200, headers: { 'content-type': 'application/json;charset=utf-8' } });
};

function addEventListener(type, listener) {
  if (typeof listener !== 'function') return;
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(listener);
}
function removeEventListener(type, listener) {
  listeners.get(type)?.delete(listener);
}
function dispatch(type, event) {
  for (const listener of [...(listeners.get(type) || [])]) listener.call(globalThis, event);
}
function postMessage(message) {
  messages.push(message);
  dispatch('message', { source: globalThis, data: message });
}
function syncExactSetting(value) {
  postMessage({
    source: 'yo-koekone-improved-settings',
    type: 'settings-sync',
    exactQuestionSetRestore: Boolean(value)
  });
}

Object.assign(globalThis, {
  window: globalThis,
  localStorage: storage,
  location: { href: 'https://yle.fi/abitreenit/harjoittele', hash: '#/terveystieto/kysymykset' },
  fetch: originalFetch,
  addEventListener,
  removeEventListener,
  postMessage
});

vm.runInThisContext(source, { filename: 'src/page-bridge.js' });
syncExactSetting(true);

// Initial normal load: the page receives Yle's untouched candidate pool, then
// requests exactly five roots (expanded with children). The bridge captures it.
const firstCarousel = await globalThis.fetch(base);
const firstJson = await firstCarousel.json();
same(firstJson, currentCarousel, 'normal carousel stays untouched without set id');
const selectedUuids = ['A', 'A1', 'B', 'C', 'C1', 'C2', 'D', 'E'];
await globalThis.fetch(searchBase + selectedUuids.join(','));
const captured = messages.find(message => message.type === 'question-set-captured');
assert(captured?.setId, 'initial search should produce a saved set id');
same(captured.roots, ['A', 'B', 'C', 'D', 'E'], 'five root questions are derived from expanded UUID order');
same(captured.uuids, selectedUuids, 'expanded UUID order is preserved');

// Refresh equivalent: Yle returns the same candidate records in a different
// random order. A saved set id must reorder only the public carousel pool so the
// normal Yle selector chooses the same five roots again.
globalThis.location.hash = `#/terveystieto/kysymykset?set=${captured.setId}`;
currentCarousel = {
  data: [roots[8], roots[6], roots[3], roots[4], roots[5], roots[0], roots[1], roots[2], roots[7]],
  meta: { count: roots.length }
};
const beforeReplayCalls = carouselCalls;
const replayResponse = await globalThis.fetch(base);
const replayJson = await replayResponse.json();
assert(carouselCalls === beforeReplayCalls + 1, 'replay must never issue a duplicate carousel request');
const replayChildIds = new Set(replayJson.data.flatMap(item => item.child_ids || []));
const replayRoots = replayJson.data.filter(item => !replayChildIds.has(item.uuid)).slice(0, 5).map(item => item.uuid);
same(replayRoots, ['A', 'B', 'C', 'D', 'E'], 'saved five roots are first after replay');
same(replayJson.meta, { count: roots.length }, 'carousel metadata is preserved');
assert(!replayResponse.headers.has('content-length'), 'synthetic replay strips stale content-length');
assert(!replayResponse.headers.has('content-encoding'), 'synthetic replay strips stale content-encoding');
assert(!replayResponse.headers.has('etag'), 'synthetic replay strips stale network etag');
assert(messages.some(message => message.type === 'question-set-replayed' && message.setId === captured.setId), 'replay event is emitted');

// Extension settings arrive from an isolated-world bridge. Turning exact replay
// off must make a URL containing a valid saved set id behave like native Yle.
syncExactSetting(false);
currentCarousel = {
  data: [roots[8], roots[7], roots[6], roots[3], roots[4], roots[5], roots[0], roots[1], roots[2]],
  meta: { count: roots.length }
};
const disabledResponse = await globalThis.fetch(base);
same(await disabledResponse.json(), currentCarousel, 'disabled exact restore leaves carousel untouched');
syncExactSetting(true);

// The real HAR contains another valid carousel shape where child UUIDs are only
// mentioned in parent.child_ids and are NOT standalone data rows. Capture must
// still accept the expanded search UUID list in that shape.
globalThis.location.hash = '#/terveystieto/kysymykset';
const compoundOnlyRows = [
  { uuid: 'A', child_ids: ['A1'] }, { uuid: 'B', child_ids: [] },
  { uuid: 'C', child_ids: ['C1', 'C2'] }, { uuid: 'D', child_ids: [] },
  { uuid: 'E', child_ids: [] }, { uuid: 'F', child_ids: [] }
];
currentCarousel = { data: compoundOnlyRows, meta: { count: compoundOnlyRows.length } };
await globalThis.fetch(filteredBase);
const beforeCompoundCapture = messages.filter(message => message.type === 'question-set-captured').length;
await globalThis.fetch(searchBase + selectedUuids.join(','));
const compoundCaptures = messages.filter(message => message.type === 'question-set-captured');
assert(compoundCaptures.length === beforeCompoundCapture + 1, 'child-only-in-parent carousel shape is captured');
same(compoundCaptures.at(-1).roots, ['A', 'B', 'C', 'D', 'E'], 'compound carousel roots are derived correctly');

// A failed search must never create a persistent set id just because its UUIDs
// looked structurally valid. It also emits a failure signal so a just-cleared
// Shuffle set id can be restored by the isolated-world coordinator.
const beforeFailedSearch = messages.filter(message => message.type === 'question-set-captured').length;
failNextSearch = true;
const failed = await globalThis.fetch(searchBase + selectedUuids.join(','));
assert(failed.status === 500, 'failed search response is returned unchanged');
assert(messages.filter(message => message.type === 'question-set-captured').length === beforeFailedSearch, 'failed search is not captured');
assert(messages.some(message => message.type === 'question-set-search-failed'), 'failed search emits recovery signal');

// A successful Yle search must not be advertised as resumable when browser
// storage rejected the local set write. This is different from a network failure:
// the current questions remain usable, but there must be no fake set id/shortcut.
globalThis.location.hash = '#/terveystieto/kysymykset';
currentCarousel = { data: roots, meta: { count: roots.length } };
await globalThis.fetch(base);
const beforeStorageFailureCapture = messages.filter(message => message.type === 'question-set-captured').length;
const beforeStorageFailureSignal = messages.filter(message => message.type === 'question-set-capture-failed').length;
storage.setQsetWritesBlocked(true);
await globalThis.fetch(searchBase + selectedUuids.join(','));
storage.setQsetWritesBlocked(false);
assert(messages.filter(message => message.type === 'question-set-captured').length === beforeStorageFailureCapture, 'failed local persistence must not emit a captured set id');
assert(messages.filter(message => message.type === 'question-set-capture-failed').length === beforeStorageFailureSignal + 1, 'failed local persistence emits a dedicated warning signal');

// Two tabs can both capture different sessions. Simulate another tab writing a
// set after this tab has read its old snapshot but before saveStore commits. The
// second read/merge inside saveStore must preserve both entries.
globalThis.location.hash = '#/terveystieto/kysymykset';
currentCarousel = { data: roots, meta: { count: roots.length } };
await globalThis.fetch(base);
const concurrentId = 'OTHER_TAB';
const concurrentValue = {
  roots: ['F'], uuids: ['F'], requestKey: 'external-tab',
  createdAt: Date.now() + 1, lastUsedAt: Date.now() + 1
};
storage.injectConcurrentSetOnNextQsetRead(concurrentId, concurrentValue);
const secondSelection = ['B', 'C', 'C1', 'C2', 'D', 'E', 'F'];
await globalThis.fetch(searchBase + secondSelection.join(','));
const latestCapture = messages.filter(message => message.type === 'question-set-captured').at(-1);
const persistedAfterRace = JSON.parse(storage.getItem('yo-koekone-improved:qsets:v1') || '{}').sets || {};
assert(persistedAfterRace[concurrentId], 'concurrent set written by another tab is preserved');
assert(latestCapture?.setId && persistedAfterRace[latestCapture.setId], 'this tab capture is also preserved after concurrent merge');

// If Yle no longer contains a saved root, the bridge must fail open and return
// the untouched new carousel rather than fabricating stale question data.
globalThis.location.hash = `#/terveystieto/kysymykset?set=${captured.setId}`;
currentCarousel = { data: roots.filter(item => item.uuid !== 'E'), meta: { count: roots.length - 1 } };
const failOpen = await globalThis.fetch(base);
const failOpenJson = await failOpen.json();
same(failOpenJson, currentCarousel, 'missing saved root fails open to current Yle response');
assert(messages.some(message => message.type === 'question-set-unavailable'), 'unavailable set event is emitted');

assert(!source.includes('input instanceof pageWindow.Request'), 'page bridge must not depend on Request wrapper identity');
assert(source.includes("typeof input.url === 'string'"), 'page bridge must recognize Request-like fetch inputs by capability');
assert(source.includes("typeof input.clone === 'function'"), 'Request-like detection must not hijack arbitrary URL-bearing objects');

console.log('Question-set replay tests passed.');
