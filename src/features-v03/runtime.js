(() => {
  'use strict';

  // The release build replaces this marker with package.json's version.
  const FEATURE_VERSION = 'dev';
  const BASE_PATH = '/abitreenit/harjoittele';
  const NS = '__YO_KOEKONE_IMPROVED_V03_RUNTIME__';
  const FEATURE_ATTR = 'data-yo-koekone-improved-v03-features';
  const DRAFT_KEY = 'yo-koekone-improved:drafts:v1';
  const CHANNEL_NAME = 'yo-koekone-improved:answer-state:v1';

  const SELECTORS = {
    subjectInput: 'input[data-testid="select-exam-subject"]',
    submitQuestions: '[data-testid="submit-default-carousel"]',
    filterMaterial: '[data-testid="meta-option--material"]',
    filterNoMaterial: '[data-testid="meta-option--noMaterial"]',
    tocItem: '.yo-toc-item__text[role="button"]',
    backToExamSelection: '[aria-label="Takaisin koevalintaan"]',
    question: '.yo-exam-question[id]',
    essay: 'textarea[data-testid="input__ESSAY_QUESTION"]',
    radio: 'input[type="radio"][data-option-id]',
    gapText: 'input[data-testid="gap-option"][data-option-index]',
    gapSelect: 'select[data-testid="gap-select"][data-option-index]',
    review: 'button[data-testid="button-review"], button[aria-label="Tarkista"]',
    clear: 'button[data-testid="button-review-clear"], button[aria-label="Tyhjennä"]',
    reviewAll: 'button[data-testid="review-all"], button[aria-label="Tarkista kaikki"]',
    clearAll: 'button[data-testid="review-clear-all"], button[aria-label="Tyhjennä kaikki"]',
    edit: 'button[aria-label="Muokkaa"]'
  };

  function normalizeSpaces(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function fold(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fi-FI')
      .replace(/[’']/g, '')
      .replace(/&/g, ' ja ')
      .replace(/[^a-z0-9åäö]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function asciiRouteSlug(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fi-FI')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function canonicalSubjectSlug(label) {
    const lower = normalizeSpaces(label).toLocaleLowerCase('fi-FI');
    const isVisual = /näkövammaiset/.test(lower);
    const isHearing = /kuulovammaisten koe/.test(lower);
    let core = lower
      .replace(/,\s*näkövammaiset/g, '')
      .replace(/^näkövammaiset[,:;\s-]*/g, '')
      .replace(/^kuulovammaisten koe[,:;\s-]*/g, '')
      .trim();

    const aliases = [
      [/^terveystieto$/, 'terveystieto'], [/^biologia$/, 'biologia'],
      [/^maantiede$/, 'maantiede'], [/^historia$/, 'historia'],
      [/^filosofia$/, 'filosofia'], [/^fysiikka$/, 'fysiikka'],
      [/^kemia$/, 'kemia'], [/^psykologia$/, 'psykologia'],
      [/^yhteiskuntaoppi$/, 'yhteiskuntaoppi'],
      [/^elämänkatsomustieto$/, 'elamankatsomustieto']
    ];
    const alias = aliases.find(([re]) => re.test(core));
    if (alias) return `${isHearing ? 'kuulovammaiset-' : ''}${isVisual ? 'nakovammaiset-' : ''}${alias[1]}`;
    if (/evankelisluterilainen uskonto/.test(core)) return `${isVisual ? 'nakovammaiset-' : ''}uskonto-evlut`;
    if (/ortodoksinen uskonto/.test(core)) return `${isVisual ? 'nakovammaiset-' : ''}uskonto-ortodoksinen`;
    if (/suomi toisena kielenä/.test(core)) return `${isHearing ? 'kuulovammaiset-' : ''}suomi-toisena-kielena`;

    core = core
      .replace(/,\s*(lyhyt|pitkä|keskipitkä|pidempi)\s+oppimäärä/g, '-$1')
      .replace(/\s+oppimäärä/g, '')
      .replace(/,\s*äidinkieli ja kirjallisuus/g, '-aidinkieli-ja-kirjallisuus');
    let slug = fold(core);
    if (isHearing) slug = `kuulovammaiset-${slug}`;
    if (isVisual) slug = `nakovammaiset-${slug}`;
    return slug;
  }

  function canonicalExamSlug(examLabel, subjectLabel = '') {
    let text = normalizeSpaces(examLabel);
    const subject = normalizeSpaces(subjectLabel);
    if (subject && text.toLocaleLowerCase('fi-FI').startsWith(subject.toLocaleLowerCase('fi-FI'))) {
      text = normalizeSpaces(text.slice(subject.length).replace(/^[-–—,:]\s*/, ''));
    }
    const match = text.match(/\b(kevät|syksy)\s+(\d{4})\b/i);
    if (!match) return fold(text);
    const rest = normalizeSpaces(`${text.slice(0, match.index)} ${text.slice((match.index || 0) + match[0].length)}`);
    const extra = fold(rest);
    const season = match[1].toLocaleLowerCase('fi-FI') === 'kevät' ? 'kevat' : 'syksy';
    return `${match[2]}-${season}${extra ? `-${extra}` : ''}`;
  }

  function parseRoute(hash = globalThis.location?.hash || '') {
    if (!hash.startsWith('#/')) return null;
    const raw = hash.slice(2);
    const qi = raw.indexOf('?');
    const path = qi >= 0 ? raw.slice(0, qi) : raw;
    const query = qi >= 0 ? raw.slice(qi + 1) : '';
    const parts = path.split('/').filter(Boolean).map(part => {
      try { return decodeURIComponent(part); } catch { return part; }
    });
    const params = new URLSearchParams(query);
    if (!parts.length) return { kind: 'home' };
    if (parts[1] === 'kysymykset') {
      const q = parts[2]?.match(/^kysymys-(\d+)$/i);
      return { kind: 'questions', subject: asciiRouteSlug(parts[0]), question: q ? Math.max(1, Number(q[1])) : 1,
        material: params.get('aineisto') === '1', noMaterial: params.get('ei-aineistoa') === '1' };
    }
    if (!parts[1]) return { kind: 'subject', subject: asciiRouteSlug(parts[0]) };
    const task = parts[2]?.match(/^tehtava-(\d+(?:\.\d+)?)$/i);
    return { kind: task ? 'task' : 'exam', subject: asciiRouteSlug(parts[0]), exam: asciiRouteSlug(parts[1]), task: task?.[1] || null };
  }

  function encodeSegment(value) {
    return encodeURIComponent(String(value ?? ''));
  }

  function routeToHash(route) {
    if (!route || route.kind === 'home') return '';
    const subject = encodeSegment(asciiRouteSlug(route.subject));
    if (route.kind === 'subject') return `#/${subject}`;
    if (route.kind === 'questions') {
      const params = new URLSearchParams();
      if (route.material) params.set('aineisto', '1');
      if (route.noMaterial) params.set('ei-aineistoa', '1');
      const q = route.question && route.question > 1 ? `/kysymys-${route.question}` : '';
      return `#/${subject}/kysymykset${q}${params.toString() ? `?${params}` : ''}`;
    }
    const exam = encodeSegment(asciiRouteSlug(route.exam));
    return route.kind === 'task' && route.task
      ? `#/${subject}/${exam}/tehtava-${encodeSegment(route.task)}`
      : `#/${subject}/${exam}`;
  }

  function isNewTabGesture(event) {
    return Boolean(event.button === 1 || event.ctrlKey || event.metaKey);
  }

  function backToSelectionRoute(route, fallbackSubject = '') {
    const subject = String(route?.subject || fallbackSubject || '').trim();
    return subject ? { kind: 'subject', subject } : null;
  }

  function normalizeDraft(draft) {
    if (!draft || typeof draft !== 'object' || Array.isArray(draft)) return null;

    if (draft.type === 'essay') {
      return {
        type: 'controls',
        controls: { essay: { type: 'essay', value: String(draft.value ?? '') } },
        updatedAt: Number(draft.updatedAt || 0)
      };
    }
    if (draft.type === 'radio') {
      const optionId = String(draft.optionId ?? '');
      if (!optionId) return null;
      return {
        type: 'controls',
        controls: { radio: { type: 'radio', optionId } },
        updatedAt: Number(draft.updatedAt || 0)
      };
    }

    if (draft.type !== 'controls' || !draft.controls || typeof draft.controls !== 'object' || Array.isArray(draft.controls)) {
      return null;
    }

    const controls = {};
    for (const [key, value] of Object.entries(draft.controls)) {
      if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
      if (value.type === 'essay') controls[key] = { type: 'essay', value: String(value.value ?? '') };
      else if (value.type === 'radio' && value.optionId != null) controls[key] = { type: 'radio', optionId: String(value.optionId) };
      else if (value.type === 'gap-text') controls[key] = {
        type: 'gap-text', optionIndex: String(value.optionIndex ?? ''), value: String(value.value ?? '')
      };
      else if (value.type === 'gap-select') controls[key] = {
        type: 'gap-select', optionIndex: String(value.optionIndex ?? ''), value: String(value.value ?? ''),
        selectedIndex: Number.isInteger(value.selectedIndex) ? value.selectedIndex : Number(value.selectedIndex || 0),
        selectedText: String(value.selectedText ?? '')
      };
    }
    if (!Object.keys(controls).length) return null;
    return { type: 'controls', controls, updatedAt: Number(draft.updatedAt || 0) };
  }

  function mergeDraftControl(draft, key, controlDraft) {
    const normalized = normalizeDraft(draft) || { type: 'controls', controls: {}, updatedAt: 0 };
    const controls = { ...normalized.controls };
    if (controlDraft) controls[key] = controlDraft;
    else delete controls[key];
    if (!Object.keys(controls).length) return null;
    return { type: 'controls', controls, updatedAt: Number(normalized.updatedAt || 0) };
  }

  function createIdRefCounter() {
    const counts = new Map();
    const uniqueIds = ids => [...new Set((ids || []).filter(Boolean).map(String))];

    return {
      add(ids) {
        for (const id of uniqueIds(ids)) counts.set(id, (counts.get(id) || 0) + 1);
      },
      remove(ids) {
        for (const id of uniqueIds(ids)) {
          const next = (counts.get(id) || 0) - 1;
          if (next > 0) counts.set(id, next);
          else counts.delete(id);
        }
      },
      has(id) {
        return Boolean(id && (counts.get(String(id)) || 0) > 0);
      },
      ids() {
        return [...counts.keys()];
      },
      clear() {
        counts.clear();
      }
    };
  }

  const testHook = globalThis.__YO_KOEKONE_IMPROVED_FEATURE_TEST_HOOK__;
  if (testHook && typeof testHook === 'object') {
    Object.assign(testHook, {
      canonicalSubjectSlug, canonicalExamSlug, asciiRouteSlug, parseRoute, routeToHash, isNewTabGesture,
      backToSelectionRoute, normalizeDraft, mergeDraftControl, createIdRefCounter
    });
    return;
  }

  if (typeof document === 'undefined' || typeof location === 'undefined' || location.pathname !== BASE_PATH) return;
  if (globalThis[NS]) return;

  const root = document.documentElement;
  if (root?.hasAttribute(FEATURE_ATTR)) {
    globalThis[NS] = { disabled: true };
    return;
  }
  root?.setAttribute(FEATURE_ATTR, FEATURE_VERSION);

  // sessionStorage belongs to this tab. Cache it in memory so restoring a page
  // with many questions does not repeatedly parse the same JSON once per control.
  let draftCache = null;
  let draftStorageReadFailed = false;

  function loadDrafts() {
    if (draftCache) return draftCache;
    let raw = '';
    try {
      raw = sessionStorage.getItem(DRAFT_KEY) || '{}';
    } catch {
      // Do not cache an access failure as an authoritative empty store. The next
      // save/delete can retry instead of overwriting unseen valid drafts.
      draftStorageReadFailed = true;
      return {};
    }

    try {
      const value = JSON.parse(raw);
      draftCache = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    } catch (error) {
      // Corrupt YO+ JSON is not a hidden valid snapshot. Fail open to an empty
      // cache so the next successful write can repair this extension-owned key.
      console.warn('[YO-koekone Improved] Ignoring corrupt local draft data', error);
      draftCache = {};
    }
    draftStorageReadFailed = false;
    return draftCache;
  }

  function writeDrafts(drafts = loadDrafts()) {
    const snapshot = drafts && typeof drafts === 'object' && !Array.isArray(drafts) ? { ...drafts } : {};
    try {
      if (Object.keys(snapshot).length) {
        const serialized = JSON.stringify(snapshot);
        sessionStorage.setItem(DRAFT_KEY, serialized);
        if (sessionStorage.getItem(DRAFT_KEY) !== serialized) {
          throw new Error('Local draft storage did not retain the written value');
        }
      } else {
        sessionStorage.removeItem(DRAFT_KEY);
        if (sessionStorage.getItem(DRAFT_KEY) !== null) {
          throw new Error('Local draft storage did not clear the stored value');
        }
      }
      // Commit the in-memory cache only after persistent storage succeeded.
      draftCache = snapshot;
      draftStorageReadFailed = false;
      return true;
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not save local draft', error);
      return false;
    }
  }

  function setDraft(id, draft) {
    if (!id) return false;
    const current = loadDrafts();
    if (draftStorageReadFailed) return false;
    const drafts = { ...current };
    const normalized = normalizeDraft(draft);
    if (normalized) drafts[id] = { ...normalized, updatedAt: Date.now() };
    else delete drafts[id];
    return writeDrafts(drafts);
  }

  function getDraft(id) {
    if (!id) return null;
    return normalizeDraft(loadDrafts()[id]);
  }

  function draftIds() {
    return Object.keys(loadDrafts());
  }

  function deleteDrafts(ids) {
    const wanted = new Set(ids.filter(Boolean).map(String));
    if (!wanted.size) return true;
    const current = loadDrafts();
    if (draftStorageReadFailed) return false;
    const drafts = { ...current };
    let changed = false;
    for (const id of wanted) if (id in drafts) { delete drafts[id]; changed = true; }
    return !changed || writeDrafts(drafts);
  }

  function questionFor(el) { return el?.closest?.(SELECTORS.question) || null; }
  function supportedControls(container) {
    if (!container) return [];
    return [...container.querySelectorAll(`${SELECTORS.essay}, ${SELECTORS.radio}, ${SELECTORS.gapText}, ${SELECTORS.gapSelect}`)]
      .filter(control => questionFor(control) === container);
  }
  function isDisabled(control) {
    return Boolean(control?.disabled || control?.getAttribute?.('aria-disabled') === 'true' || control?.hasAttribute?.('disabled'));
  }
  function isReviewed(container) {
    return Boolean(container && [...container.querySelectorAll(SELECTORS.edit)]
      .some(button => questionFor(button) === container));
  }
  function controlTag(control) {
    return String(control?.tagName || '').toUpperCase();
  }
  function isGapSelectEmpty(select) {
    if (controlTag(select) !== 'SELECT') return true;
    const text = normalizeSpaces(select.selectedOptions?.[0]?.textContent || '');
    return select.selectedIndex <= 0 || /^valitse(?:\s+tästä)?$/i.test(text);
  }
  function isControlEmpty(control) {
    const tag = controlTag(control);
    if (tag === 'TEXTAREA') return !control.value;
    if (tag === 'SELECT' && control.matches?.(SELECTORS.gapSelect)) return isGapSelectEmpty(control);
    if (tag === 'INPUT') {
      if (control.matches?.(SELECTORS.radio)) return !control.checked;
      if (control.matches?.(SELECTORS.gapText)) return !control.value;
    }
    return true;
  }
  function isEmpty(container) {
    const controls = supportedControls(container);
    if (!controls.length) return true;
    const radios = controls.filter(control => controlTag(control) === 'INPUT' && control.matches?.(SELECTORS.radio));
    const nonRadios = controls.filter(control => !radios.includes(control));
    if (radios.some(radio => radio.checked)) return false;
    return nonRadios.every(isControlEmpty);
  }

  function getRuntimeId() {
    try { return crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
    catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  }

  const pendingDrafts = new Map();
  const draftTimers = new Map();
  const draftRestoreSuppression = createIdRefCounter();

  function suppressDraftRestore(ids) {
    draftRestoreSuppression.add(ids);
  }

  function releaseDraftRestore(ids) {
    draftRestoreSuppression.remove(ids);
  }

  function isDraftRestoreSuppressed(id) {
    return draftRestoreSuppression.has(id);
  }

  function suppressedDraftIds() {
    return draftRestoreSuppression.ids();
  }

  function discardDrafts(ids) {
    const wanted = new Set(ids.filter(Boolean).map(String));
    if (!deleteDrafts([...wanted])) return false;
    for (const id of wanted) {
      const timer = draftTimers.get(id);
      if (timer) clearTimeout(timer);
      draftTimers.delete(id);
      pendingDrafts.delete(id);
    }
    return true;
  }

  globalThis[NS] = {
    disabled: false, FEATURE_VERSION, BASE_PATH, SELECTORS, DRAFT_KEY, CHANNEL_NAME,
    normalizeSpaces, canonicalSubjectSlug, canonicalExamSlug, asciiRouteSlug, parseRoute, routeToHash,
    isNewTabGesture, backToSelectionRoute, normalizeDraft, mergeDraftControl,
    loadDrafts, writeDrafts, setDraft, getDraft, draftIds, deleteDrafts, discardDrafts,
    questionFor, supportedControls, isDisabled, isReviewed, isGapSelectEmpty, isControlEmpty, isEmpty,
    suppressDraftRestore, releaseDraftRestore, isDraftRestoreSuppressed, suppressedDraftIds,
    tabId: getRuntimeId(), pendingDrafts, draftTimers
  };
})();
