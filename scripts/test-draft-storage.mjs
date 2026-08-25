import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = path.resolve(import.meta.dirname, '..');
const source = fs.readFileSync(path.join(root, 'src/features-v03/runtime.js'), 'utf8');
const DRAFT_KEY = 'yo-koekone-improved:drafts:v1';

function assert(condition, message) { if (!condition) throw new Error(message); }

class MemoryStorage {
  constructor(raw = null) {
    this.map = new Map();
    if (raw != null) this.map.set(DRAFT_KEY, String(raw));
    this.failReads = false;
    this.failWrites = false;
    this.failRemoves = false;
  }
  getItem(key) {
    if (this.failReads) throw new Error('simulated read failure');
    return this.map.has(String(key)) ? this.map.get(String(key)) : null;
  }
  setItem(key, value) {
    if (this.failWrites) throw new Error('simulated write failure');
    this.map.set(String(key), String(value));
  }
  removeItem(key) {
    if (this.failRemoves) throw new Error('simulated remove failure');
    this.map.delete(String(key));
  }
  raw() { return this.map.get(DRAFT_KEY) ?? null; }
}

function makeRuntime(storage) {
  const attrs = new Map();
  const documentElement = {
    hasAttribute(name) { return attrs.has(name); },
    setAttribute(name, value) { attrs.set(name, String(value)); }
  };
  const context = {
    console,
    URLSearchParams,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    sessionStorage: storage,
    location: { pathname: '/abitreenit/harjoittele', hash: '' },
    document: { documentElement },
    crypto: { randomUUID: () => 'test-runtime-id' }
  };
  vm.runInNewContext(source, context, { filename: 'runtime-draft-storage.js' });
  return context.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
}

const essay = value => ({ type: 'controls', controls: { essay: { type: 'essay', value } } });

// Normal writes are persisted and readable.
{
  const storage = new MemoryStorage();
  const rt = makeRuntime(storage);
  assert(rt.setDraft('q1', essay('alpha')) === true, 'normal draft save failed');
  assert(rt.getDraft('q1')?.controls?.essay?.value === 'alpha', 'saved draft was not readable');
}

// If the base store cannot be read, never treat it as an empty snapshot and
// overwrite an unseen valid draft with a new partial store.
{
  const original = JSON.stringify({ q1: { ...essay('existing'), updatedAt: 1 } });
  const storage = new MemoryStorage(original);
  storage.failReads = true;
  const rt = makeRuntime(storage);
  assert(rt.setDraft('q2', essay('new')) === false, 'unreadable base store must make save fail safe');
  storage.failReads = false;
  assert(storage.raw() === original, 'unreadable base store was overwritten');
  assert(rt.setDraft('q2', essay('new')) === true, 'save did not recover after storage became readable');
  const stored = JSON.parse(storage.raw());
  assert(stored.q1 && stored.q2, 'recovered save did not preserve the previously unseen draft');
}

// Corrupt extension-owned JSON is recoverable rather than permanently blocking
// all future local draft saves.
{
  const storage = new MemoryStorage('{ definitely-not-json');
  const rt = makeRuntime(storage);
  assert(rt.setDraft('q1', essay('repaired')) === true, 'corrupt draft JSON should be repairable by a new save');
  assert(JSON.parse(storage.raw()).q1, 'new save did not replace corrupt draft JSON');
}

// Failed writes must not update the authoritative in-memory cache or claim that
// a sibling draft exists.
{
  const storage = new MemoryStorage();
  const rt = makeRuntime(storage);
  assert(rt.setDraft('q1', essay('stable')) === true, 'fixture save failed');
  storage.failWrites = true;
  assert(rt.setDraft('q2', essay('blocked')) === false, 'blocked write incorrectly reported success');
  assert(rt.getDraft('q1')?.controls?.essay?.value === 'stable', 'failed write damaged existing cached draft');
  assert(rt.getDraft('q2') === null, 'failed write leaked into authoritative cache');
}

// Failed persistent deletion keeps both the stored fallback and any pending
// in-memory value instead of claiming the draft was discarded.
{
  const storage = new MemoryStorage();
  const rt = makeRuntime(storage);
  assert(rt.setDraft('q1', essay('keep')) === true, 'fixture save failed');
  rt.pendingDrafts.set('q1', essay('newer-pending'));
  storage.failRemoves = true;
  assert(rt.discardDrafts(['q1']) === false, 'failed remove incorrectly reported success');
  assert(rt.pendingDrafts.has('q1'), 'failed remove discarded the only pending copy');
  storage.failRemoves = false;
  assert(rt.discardDrafts(['q1']) === true, 'discard did not recover after remove became available');
  assert(!rt.pendingDrafts.has('q1') && storage.raw() === null, 'successful retry did not fully discard draft');
}

console.log('Draft storage failure/recovery tests passed.');
