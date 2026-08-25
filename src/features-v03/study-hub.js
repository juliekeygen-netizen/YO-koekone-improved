(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const { BASE_PATH, SELECTORS, normalizeSpaces, parseRoute, routeToHash } = rt;

  const LIBRARY_KEY = 'yo-koekone-improved:library:v1';
  const MAP_KEY = 'yo-koekone-improved:mappings:v2';
  const HUB_ID = '__yo_improved_study_hub__';
  const FAVORITE_ID = '__yo_improved_exam_favorite__';
  const LIBRARY_LOCK = 'yo-koekone-improved:library-lock:v1';
  const CHANNEL_NAME = 'yo-koekone-improved:library:v1';
  const SET_ID_RE = /^[A-Za-z0-9_-]{4,24}$/;
  let renderTimer = null;
  let lastRecorded = '';
  let lastHubSignature = '';
  let favoriteResizeObserver = null;
  let localMutationQueue = Promise.resolve();
  let libraryChannel = null;
  try {
    if (typeof BroadcastChannel === 'function') libraryChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch { /* storage events remain the cross-tab fallback */ }

  function currentRoute() {
    const route = parseRoute();
    if (route) return route;
    return !location.hash ? { kind: 'home' } : null;
  }

  function elementActuallyVisible(element) {
    if (!element?.isConnected) return false;
    const style = globalThis.getComputedStyle ? getComputedStyle(element) : null;
    if (style && (style.display === 'none' || style.visibility === 'hidden')) return false;
    // getClientRects() also becomes empty when an ancestor is display:none,
    // which computed style on the input itself does not reveal.
    if (typeof element.getClientRects === 'function' && element.getClientRects().length === 0) return false;
    return true;
  }

  function isSelectionView(route = currentRoute()) {
    // During a direct/F5 deep-link restore the hash already says exam while
    // Yle can still be visibly rendering the selector UI. Treat the real
    // visible selector DOM as authoritative while restoration settles.
    const input = document.querySelector(SELECTORS.subjectInput);
    const selectorVisible = elementActuallyVisible(input);
    return route?.kind === 'home' || route?.kind === 'subject' || selectorVisible;
  }

  function readObject(key, fallback = {}) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || '');
      return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
    } catch { return fallback; }
  }

  function normalizeExamEntry(entry) {
    if (!entry || typeof entry !== 'object' || !entry.subject || !entry.exam) return null;
    return { ...entry, kind: 'exam', task: String(entry.task || '') };
  }

  function normalizeQuestionEntry(entry) {
    if (!entry || typeof entry !== 'object' || entry.kind !== 'questions' || !entry.subject) return null;
    const setId = SET_ID_RE.test(String(entry.setId || '')) ? String(entry.setId) : '';
    return {
      ...entry,
      kind: 'questions',
      setId,
      question: Math.max(1, Number(entry.question || 1) || 1),
      material: Boolean(entry.material),
      noMaterial: Boolean(entry.noMaterial)
    };
  }

  function normalizeActivity(entry) {
    return entry?.kind === 'questions' ? normalizeQuestionEntry(entry) : normalizeExamEntry(entry);
  }

  function loadLibrary() {
    const raw = readObject(LIBRARY_KEY, {});
    const recent = Array.isArray(raw.recent) ? raw.recent.map(normalizeExamEntry).filter(Boolean).slice(0, 20) : [];
    const questionSessions = Array.isArray(raw.questionSessions)
      ? raw.questionSessions.map(normalizeQuestionEntry).filter(Boolean).slice(0, 30)
      : [];
    const favorites = Array.isArray(raw.favorites) ? raw.favorites.map(normalizeExamEntry).filter(Boolean).slice(0, 50) : [];
    const lastExam = normalizeExamEntry(raw.lastExam);
    const lastActivity = normalizeActivity(raw.lastActivity) || lastExam;
    return { lastExam, lastActivity, recent, questionSessions, favorites };
  }

  function saveLibrary(library) {
    try {
      const serialized = JSON.stringify(library);
      localStorage.setItem(LIBRARY_KEY, serialized);
      if (localStorage.getItem(LIBRARY_KEY) !== serialized) {
        throw new Error('Practice library storage did not retain the written value');
      }
      return true;
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not save practice library', error);
      throw error;
    }
  }

  function broadcastLibrary() {
    try { libraryChannel?.postMessage({ type: 'library-changed', at: Date.now() }); } catch { /* optional */ }
  }

  function mutateLibrary(mutator) {
    const run = async () => {
      const commit = async () => {
        const library = loadLibrary();
        const result = await mutator(library);
        saveLibrary(library);
        broadcastLibrary();
        lastHubSignature = '';
        scheduleRender(0);
        return result;
      };
      if (globalThis.navigator?.locks?.request) {
        return globalThis.navigator.locks.request(LIBRARY_LOCK, { mode: 'exclusive' }, commit);
      }
      return commit();
    };
    const next = localMutationQueue.then(run, run);
    localMutationQueue = next.catch(() => {});
    return next;
  }

  function isSameExam(entry, key) {
    return Boolean(entry && entry.kind !== 'questions' && examKey(entry) === key);
  }

  function newestActivity(library) {
    return [...library.recent, ...library.questionSessions]
      .sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0))[0] || null;
  }

  function forgetRecentExam(key) {
    if (!key) return Promise.resolve(false);
    return mutateLibrary(library => {
      if (!library.recent.some(entry => examKey(entry) === key)) return false;
      library.recent = library.recent.filter(entry => examKey(entry) !== key);
      if (isSameExam(library.lastExam, key)) {
        library.lastExam = [...library.recent]
          .sort((a, b) => Number(b?.updatedAt || 0) - Number(a?.updatedAt || 0))[0] || null;
      }
      if (isSameExam(library.lastActivity, key)) library.lastActivity = newestActivity(library);
      return true;
    });
  }

  function examKey(entry) { return `${entry?.subject || ''}/${entry?.exam || ''}`; }
  function questionSessionKey(entry) {
    if (!entry?.subject) return '';
    if (entry.setId) return `questions/${entry.subject}/${entry.setId}`;
    return `questions/${entry.subject}/${entry.material ? 1 : 0}/${entry.noMaterial ? 1 : 0}`;
  }
  function titleCase(value) { return String(value || '').replace(/-/g, ' ').replace(/\b\p{L}/gu, c => c.toLocaleUpperCase('fi-FI')); }
  function displaySeason(value) {
    const season = String(value || '').toLocaleLowerCase('fi-FI');
    return season === 'kevat' || season === 'kevät' ? 'kevät' : season;
  }

  function subjectLabel(subject) {
    const mappings = readObject(MAP_KEY, {});
    return normalizeSpaces(mappings.subjects?.[subject] || '') || titleCase(subject);
  }

  function fallbackExamLabel(subject, exam) {
    const subjectName = subjectLabel(subject);
    const match = String(exam || '').match(/^(\d{4})-(kevat|kevät|syksy)(?:-(.+))?$/i);
    if (!match) return normalizeSpaces(`${subjectName} ${titleCase(exam)}`);
    return normalizeSpaces(`${subjectName} ${displaySeason(match[2])} ${match[1]}${match[3] ? ` – ${titleCase(match[3])}` : ''}`);
  }

  function examLabel(subject, exam) {
    const mappings = readObject(MAP_KEY, {});
    const remembered = normalizeSpaces(mappings.exams?.[subject]?.[exam]?.label || '');
    if (remembered) return remembered;
    const title = normalizeSpaces(document.title.replace(/\s*\|\s*Abitreenit\s*$/i, ''));
    const year = String(exam || '').match(/\b\d{4}\b/)?.[0] || '';
    const season = displaySeason(String(exam || '').match(/(?:^|-)(kevat|kevät|syksy)(?:-|$)/i)?.[1] || '');
    if (title && (!year || title.includes(year)) && (!season || title.toLocaleLowerCase('fi-FI').includes(season))) return title;
    return fallbackExamLabel(subject, exam);
  }

  function setIdFromHash(hash = location.hash) {
    try {
      const raw = String(hash || '');
      if (!/^#\/[^/]+\/kysymykset(?:\/|\?|$)/i.test(raw)) return '';
      const qi = raw.indexOf('?');
      if (qi < 0) return '';
      const id = new URLSearchParams(raw.slice(qi + 1)).get('set') || '';
      return SET_ID_RE.test(id) ? id : '';
    } catch { return ''; }
  }

  function entryFromRoute(route) {
    if (!route) return null;
    if (route.kind === 'exam' || route.kind === 'task') {
      return {
        kind: 'exam',
        subject: route.subject,
        exam: route.exam,
        task: route.kind === 'task' ? String(route.task || '') : '',
        label: examLabel(route.subject, route.exam),
        subjectLabel: subjectLabel(route.subject),
        updatedAt: Date.now()
      };
    }
    if (route.kind === 'questions') {
      const setId = setIdFromHash();
      if (rt.getSetting?.('exactQuestionSetRestore') !== false && !setId) return null;
      return {
        kind: 'questions',
        subject: route.subject,
        setId,
        question: Math.max(1, Number(route.question || 1) || 1),
        material: Boolean(route.material),
        noMaterial: Boolean(route.noMaterial),
        label: `${subjectLabel(route.subject)} – kysymysharjoittelu`,
        subjectLabel: subjectLabel(route.subject),
        updatedAt: Date.now()
      };
    }
    return null;
  }

  function recordCurrentActivity() {
    const entry = entryFromRoute(parseRoute());
    if (!entry) {
      // Leaving a recordable exam/session arms the same route to count as a new
      // visit when it is opened again later. Without this reset, returning to the
      // exact same task/session could fail to move it back to the front of Recent.
      lastRecorded = '';
      return;
    }
    const identity = entry.kind === 'questions'
      ? `${questionSessionKey(entry)}|${entry.question}`
      : `${examKey(entry)}|${entry.task}`;
    if (identity === lastRecorded) return;
    lastRecorded = identity;

    mutateLibrary(library => {
      if (entry.kind === 'questions') {
        const key = questionSessionKey(entry);
        const existing = library.questionSessions.find(item => questionSessionKey(item) === key) || {};
        const merged = { ...existing, ...entry };
        library.lastActivity = merged;
        library.questionSessions = [merged, ...library.questionSessions.filter(item => questionSessionKey(item) !== key)].slice(0, 30);
        return;
      }
      const key = examKey(entry);
      const existing = library.recent.find(item => examKey(item) === key) || {};
      const merged = { ...existing, ...entry };
      library.lastExam = merged;
      library.lastActivity = merged;
      library.recent = [merged, ...library.recent.filter(item => examKey(item) !== key)].slice(0, 20);
    }).catch(() => {
      // The save helper already logged the storage failure. Re-arm this route so
      // a later navigation/render can retry instead of permanently deduping a
      // visit that never made it to persistent storage.
      lastRecorded = '';
    });
  }

  function withSetInHash(hash, setId) {
    const raw = String(hash || '');
    const qi = raw.indexOf('?');
    const path = qi >= 0 ? raw.slice(0, qi) : raw;
    const params = new URLSearchParams(qi >= 0 ? raw.slice(qi + 1) : '');
    if (setId && SET_ID_RE.test(setId)) params.set('set', setId);
    const query = params.toString();
    return `${path}${query ? `?${query}` : ''}`;
  }

  function hrefForEntry(entry, includePosition = true) {
    if (!entry?.subject) return BASE_PATH;
    if (entry.kind === 'questions') {
      let hash = routeToHash({
        kind: 'questions',
        subject: entry.subject,
        question: includePosition ? Math.max(1, Number(entry.question || 1) || 1) : 1,
        material: Boolean(entry.material),
        noMaterial: Boolean(entry.noMaterial)
      });
      if (entry.setId && rt.getSetting?.('exactQuestionSetRestore') !== false) hash = withSetInHash(hash, entry.setId);
      return `${BASE_PATH}${hash}`;
    }
    if (!entry.exam) return BASE_PATH;
    const route = includePosition && entry.task
      ? { kind: 'task', subject: entry.subject, exam: entry.exam, task: entry.task }
      : { kind: 'exam', subject: entry.subject, exam: entry.exam };
    return `${BASE_PATH}${routeToHash(route)}`;
  }

  function isFavorite(entry, library = loadLibrary()) {
    if (!entry || entry.kind === 'questions') return false;
    const key = examKey(entry);
    return Boolean(key && library.favorites.some(item => examKey(item) === key));
  }

  function toggleFavorite(entry) {
    if (!entry?.subject || !entry?.exam || entry.kind === 'questions') return Promise.resolve(false);
    return mutateLibrary(library => {
      const key = examKey(entry);
      const index = library.favorites.findIndex(item => examKey(item) === key);
      if (index >= 0) {
        library.favorites.splice(index, 1);
        return false;
      }
      const recent = library.recent.find(item => examKey(item) === key);
      library.favorites.unshift({ ...(recent || entry), ...entry, kind: 'exam', task: entry.task || recent?.task || '', updatedAt: Date.now() });
      library.favorites = library.favorites.slice(0, 50);
      return true;
    });
  }

  function visibleQuestionSessions(library) {
    if (rt.getSetting?.('showQuestionPracticeInHub') === false) return [];
    const sorted = [...library.questionSessions].sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return rt.getSetting?.('singleQuestionPracticeRecent') === false ? sorted : sorted.slice(0, 1);
  }

  function recentActivities(library, limit) {
    const rows = [...library.recent, ...visibleQuestionSessions(library)]
      .sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
    return rows.slice(0, Math.min(10, Math.max(1, limit)));
  }

  function continueActivity(library) {
    const allowQuestions = rt.getSetting?.('showQuestionPracticeInHub') !== false;
    const last = normalizeActivity(library.lastActivity);
    if (last && (last.kind !== 'questions' || allowQuestions)) return last;
    if (library.lastExam) return library.lastExam;
    return recentActivities(library, 1)[0] || null;
  }

  function starSvg(filled) {
    return `<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><path d="m12 2.7 2.83 5.74 6.34.92-4.59 4.47 1.08 6.31L12 17.16l-5.66 2.98 1.08-6.31-4.59-4.47 6.34-.92L12 2.7Z" ${filled ? 'fill="#f5c84c" stroke="#f5c84c"' : 'fill="none" stroke="currentColor"'} stroke-width="1.8" stroke-linejoin="round"/></svg>`;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function rowLabel(entry) {
    const base = entry.label || (entry.kind === 'questions' ? `${subjectLabel(entry.subject)} – kysymysharjoittelu` : fallbackExamLabel(entry.subject, entry.exam));
    if (entry.kind === 'questions' && entry.question > 1) return `${base} — kysymys ${entry.question}`;
    return base;
  }

  function listRows(items, library, emptyText) {
    if (!items.length) return `<div class="yoi-hub-empty">${escapeHtml(emptyText)}</div>`;
    return items.map(entry => {
      if (entry.kind === 'questions') {
        return `<div class="yoi-hub-row yoi-hub-row--questions">
          <a href="${escapeHtml(hrefForEntry(entry, true))}" class="yoi-hub-link"><span>${escapeHtml(rowLabel(entry))}</span></a>
          <span class="yoi-hub-session-label">Kysymykset</span>
        </div>`;
      }
      const favorite = isFavorite(entry, library);
      return `<div class="yoi-hub-row">
        <a href="${escapeHtml(hrefForEntry(entry, false))}" class="yoi-hub-link"><span>${escapeHtml(rowLabel(entry))}</span></a>
        <button type="button" class="yoi-hub-star" data-favorite-key="${escapeHtml(examKey(entry))}" aria-pressed="${favorite}" aria-label="${favorite ? 'Poista suosikeista' : 'Lisää suosikiksi'}" title="${favorite ? 'Poista suosikeista' : 'Lisää suosikiksi'}">${starSvg(favorite)}</button>
      </div>`;
    }).join('');
  }

  function subjectFieldBlock() {
    const input = document.querySelector(SELECTORS.subjectInput);
    if (!input) return null;
    const label = [...document.querySelectorAll('label')].find(el => /valitse oppiaine/i.test(normalizeSpaces(el.textContent)));
    let block = input.parentElement;
    for (let depth = 0; block?.parentElement && depth < 6; depth++) {
      const parent = block.parentElement;
      const text = normalizeSpaces(parent.textContent);
      if (!parent.contains(input) || text.length > 1800) break;
      block = parent;
      if (label && block.contains(label) && block.querySelectorAll(SELECTORS.subjectInput).length === 1) break;
    }
    if (label && !block?.contains(label)) {
      let common = label.parentElement;
      for (let depth = 0; common?.parentElement && depth < 5 && !common.contains(input); depth++) common = common.parentElement;
      if (common?.contains(input) && normalizeSpaces(common.textContent).length < 1800) block = common;
    }
    return block;
  }

  function insertionPoint() {
    const block = subjectFieldBlock();
    return block?.parentElement ? { parent: block.parentElement, before: block } : null;
  }

  function hubMarkup(library, recentLimit) {
    const recent = recentActivities(library, recentLimit);
    const favorites = library.favorites.slice(0, 12);
    const continuing = continueActivity(library);
    const continueMarkup = continuing
      ? `<a class="yoi-hub-continue" href="${escapeHtml(hrefForEntry(continuing, true))}"><span class="yoi-hub-continue-copy"><strong>Jatka viimeisintä</strong><span>${escapeHtml(rowLabel(continuing))}${continuing.kind === 'exam' && continuing.task ? ` — Tehtävä ${escapeHtml(continuing.task)}` : ''}</span></span><span class="yoi-hub-arrow" aria-hidden="true">→</span></a>`
      : '';

    return `<style>
#${HUB_ID}{margin:28px 0 30px;padding:0 0 30px;border-bottom:1px solid rgba(255,255,255,.14);color:inherit;font:inherit}
#${HUB_ID} *{box-sizing:border-box}
.yoi-hub-top{display:flex;align-items:baseline;justify-content:space-between;gap:18px;margin-bottom:12px}
.yoi-hub-top h2{margin:0;font:inherit;font-size:1.22rem;font-weight:800;letter-spacing:-.01em}
.yoi-hub-settings{appearance:none;border:0;background:transparent;color:inherit;padding:3px 0;font:inherit;font-size:.86rem;font-weight:700;text-decoration:underline;text-underline-offset:3px;cursor:pointer;opacity:.84}
.yoi-hub-settings:hover{opacity:1}
.yoi-hub-continue{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:18px;color:inherit;text-decoration:none;padding:13px 2px 15px;border-top:1px solid rgba(255,255,255,.16);border-bottom:1px solid rgba(255,255,255,.16);transition:background-color .12s ease}
.yoi-hub-continue:hover{background:rgba(255,255,255,.04)}
.yoi-hub-continue-copy{display:flex;min-width:0;flex-direction:column;gap:3px}
.yoi-hub-continue strong{font-size:.8rem;font-weight:800;color:#ff9d8f}
.yoi-hub-continue-copy>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.98rem;font-weight:760}
.yoi-hub-arrow{font-size:1.25rem;line-height:1;opacity:.8;padding-right:4px}
.yoi-hub-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:30px;margin-top:20px}
.yoi-hub-column h3{margin:0 0 6px;font:inherit;font-size:.94rem;font-weight:800;color:inherit}
.yoi-hub-row{display:flex;min-height:42px;align-items:center;gap:6px;border-top:1px solid rgba(255,255,255,.14)}
.yoi-hub-row:last-child{border-bottom:1px solid rgba(255,255,255,.14)}
.yoi-hub-link{display:flex;min-width:0;flex:1;align-items:center;color:inherit;text-decoration:none;padding:10px 2px;font:inherit}
.yoi-hub-link:hover{text-decoration:underline;text-underline-offset:2px}
.yoi-hub-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;font-weight:650}
.yoi-hub-session-label{flex:0 0 auto;font-size:.72rem;color:#aaa;padding:0 3px;text-transform:uppercase;letter-spacing:.035em}
.yoi-hub-star{display:grid;width:34px;height:34px;flex:0 0 34px;place-items:center;border:0;background:transparent;color:#aaa;font-size:19px;padding:0;cursor:pointer;border-radius:50%}
.yoi-hub-star:hover{background:rgba(255,255,255,.07);color:#fff}
.yoi-hub-empty{min-height:42px;padding:10px 2px;border-top:1px solid rgba(255,255,255,.14);border-bottom:1px solid rgba(255,255,255,.14);font-size:.86rem;color:#aaa}
.yoi-hub-link:focus-visible,.yoi-hub-star:focus-visible,.yoi-hub-settings:focus-visible,.yoi-hub-continue:focus-visible{outline:2px solid #ff9d8f;outline-offset:3px}
@media(max-width:650px){#${HUB_ID}{margin-top:24px;padding-bottom:26px}.yoi-hub-grid{grid-template-columns:1fr;gap:20px}.yoi-hub-top{align-items:flex-start}.yoi-hub-continue-copy>span{white-space:normal}.yoi-hub-session-label{display:none}}
</style><div class="yoi-hub-top"><h2>Harjoittelun pikavalinnat</h2><button type="button" class="yoi-hub-settings">Asetukset</button></div>${continueMarkup}<div class="yoi-hub-grid"><div class="yoi-hub-column"><h3>Viimeksi avatut</h3>${listRows(recent, library, 'Ei vielä avattuja harjoituksia.')}</div><div class="yoi-hub-column"><h3>Suosikit</h3>${listRows(favorites, library, 'Lisää kokeita suosikeiksi tähtipainikkeella.')}</div></div>`;
  }

  function ensureHub() {
    const route = currentRoute();
    const existing = document.getElementById(HUB_ID);
    if (rt.getSetting?.('studyHub') === false || !isSelectionView(route)) {
      existing?.remove();
      lastHubSignature = '';
      return;
    }
    const point = insertionPoint();
    if (!point) return;

    const library = loadLibrary();
    const recentLimit = Math.min(10, Math.max(1, Number(rt.getSetting?.('recentLimit') || 5)));
    const recent = recentActivities(library, recentLimit);
    const continuing = continueActivity(library);
    if (!continuing && !recent.length && !library.favorites.length) {
      existing?.remove();
      lastHubSignature = '';
      return;
    }

    const signature = JSON.stringify({
      library,
      recentLimit,
      showQuestionPracticeInHub: rt.getSetting?.('showQuestionPracticeInHub') !== false,
      singleQuestionPracticeRecent: rt.getSetting?.('singleQuestionPracticeRecent') !== false,
      exactQuestionSetRestore: rt.getSetting?.('exactQuestionSetRestore') !== false
    });
    const hub = existing || document.createElement('section');
    hub.id = HUB_ID;
    hub.setAttribute('aria-label', 'YO+ pikavalinnat');

    if (!existing || signature !== lastHubSignature) {
      hub.innerHTML = hubMarkup(library, recentLimit);
      lastHubSignature = signature;
      hub.querySelector('.yoi-hub-settings')?.addEventListener('click', () => rt.openSettings?.());
      for (const button of hub.querySelectorAll('[data-favorite-key]')) {
        button.addEventListener('click', async event => {
          event.preventDefault();
          event.stopPropagation();
          const key = button.getAttribute('data-favorite-key');
          const source = [...library.recent, ...library.favorites].find(item => examKey(item) === key);
          if (!source) return;
          try { await toggleFavorite(source); }
          catch { /* saveLibrary already logged the persistent-storage failure */ }
        });
      }
    }
    if (hub.parentElement !== point.parent || hub.nextSibling !== point.before) point.parent.insertBefore(hub, point.before);
  }

  function currentExamHeading(route) {
    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) return null;
    const label = examLabel(route.subject, route.exam);
    const year = String(route.exam || '').match(/\b\d{4}\b/)?.[0] || '';
    const season = displaySeason(String(route.exam || '').match(/(?:^|-)(kevat|kevät|syksy)(?:-|$)/i)?.[1] || '');
    const headings = [...document.querySelectorAll('h1,h2,h3')];
    return headings.find(h => normalizeSpaces(h.textContent) === label) || headings.find(h => {
      const value = normalizeSpaces(h.textContent).toLocaleLowerCase('fi-FI');
      return (!year || value.includes(year)) && (!season || value.includes(season));
    }) || null;
  }

  function cleanupFavoriteButton() {
    favoriteResizeObserver?.disconnect?.();
    favoriteResizeObserver = null;
    const button = document.getElementById(FAVORITE_ID);
    const heading = button?._yoiHeading;
    const parent = heading?.parentElement;
    if (heading) heading.style.removeProperty('padding-right');
    if (parent?.dataset.yoiPositionWasStatic === '1') {
      parent.style.removeProperty('position');
      delete parent.dataset.yoiPositionWasStatic;
    }
    button?.remove();
  }

  function ensureFavoriteButton() {
    const route = parseRoute();
    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) return cleanupFavoriteButton();
    const entry = entryFromRoute(route);
    const heading = currentExamHeading(route);
    if (!entry || !heading?.parentElement) return;

    let button = document.getElementById(FAVORITE_ID);
    if (button && button._yoiHeading !== heading) {
      cleanupFavoriteButton();
      button = null;
    }
    if (!button) {
      const parent = heading.parentElement;
      if (getComputedStyle(parent).position === 'static' && !parent.style.position) {
        parent.style.position = 'relative';
        parent.dataset.yoiPositionWasStatic = '1';
      }
      button = document.createElement('button');
      button.id = FAVORITE_ID;
      button.type = 'button';
      button._yoiHeading = heading;
      button.style.cssText = 'position:absolute;right:0;z-index:2;display:flex;align-items:center;gap:.38em;border:0;background:transparent;color:#aaa;padding:.15em 0;cursor:pointer;font-family:inherit;font-weight:700;white-space:nowrap;border-radius:6px';
      parent.appendChild(button);
      button.addEventListener('click', async () => {
        try {
          await toggleFavorite(entryFromRoute(parseRoute()) || entry);
          ensureFavoriteButton();
        } catch { /* saveLibrary already logged the persistent-storage failure */ }
      });
    }

    const favorite = isFavorite(entry);
    const html = `${starSvg(favorite)}<span>${favorite ? 'Poista suosikeista' : 'Lisää suosikiksi'}</span>`;
    if (button.innerHTML !== html) button.innerHTML = html;
    button.setAttribute('aria-pressed', String(favorite));
    button.setAttribute('aria-label', favorite ? 'Poista koe suosikeista' : 'Lisää koe suosikiksi');

    const position = () => {
      if (!button?.isConnected || !heading?.isConnected) return;
      const computed = getComputedStyle(heading);
      button.style.fontSize = computed.fontSize;
      button.style.lineHeight = computed.lineHeight === 'normal' ? '1.2' : computed.lineHeight;
      const parent = heading.parentElement;
      button.style.top = `${heading.offsetTop + Math.max(0, (heading.offsetHeight - button.offsetHeight) / 2)}px`;
      const label = button.querySelector('span');
      if (parent.clientWidth > 650) {
        if (label) label.style.display = '';
        heading.style.paddingRight = `${Math.min(button.offsetWidth + 24, parent.clientWidth * .5)}px`;
      } else {
        if (label) label.style.display = 'none';
        heading.style.paddingRight = `${button.offsetHeight + 14}px`;
      }
    };
    position();
    if (!favoriteResizeObserver && 'ResizeObserver' in window) {
      favoriteResizeObserver = new ResizeObserver(position);
      favoriteResizeObserver.observe(heading.parentElement);
    }
  }

  function render() {
    renderTimer = null;
    ensureHub();
    ensureFavoriteButton();
  }

  function scheduleRender(delay = 80) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, delay);
  }

  function scheduleHubSettle() {
    // Avoid five delayed timers for every task/scroll URL update after the exam
    // view is already stable. Only selector/Hub transition states need settling.
    if (!isSelectionView() && !document.getElementById(HUB_ID)) return;

    for (const delay of [0, 250, 750, 1500, 3000]) {
      setTimeout(() => {
        const visibleSelection = isSelectionView();
        const existing = document.getElementById(HUB_ID);
        if (!visibleSelection && !existing) return;
        lastHubSignature = '';
        // If the selector just disappeared, rendering once more lets ensureHub()
        // remove a Hub left behind by the transition.
        scheduleRender(0);
      }, delay);
    }
  }

  function navigationChanged() {
    setTimeout(recordCurrentActivity, 160);
    scheduleRender(100);
    scheduleHubSettle();
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    if (typeof original !== 'function') continue;
    history[method] = function(...args) {
      const before = location.href;
      const result = original.apply(this, args);
      if (location.href !== before) navigationChanged();
      return result;
    };
  }
  addEventListener('popstate', navigationChanged, true);
  addEventListener('hashchange', navigationChanged, true);
  addEventListener('pageshow', navigationChanged, true);

  function elementLike(node) {
    return Boolean(node && typeof node.matches === 'function');
  }

  function ownMutation(record) {
    const target = elementLike(record?.target) ? record.target : null;
    if (target && typeof target.closest === 'function' && target.closest(`#${HUB_ID},#${FAVORITE_ID}`)) return true;
    const nodes = [...record.addedNodes, ...record.removedNodes].filter(elementLike);
    return nodes.length > 0 && nodes.every(node =>
      node.id === HUB_ID || node.id === FAVORITE_ID ||
      (typeof node.closest === 'function' && node.closest(`#${HUB_ID},#${FAVORITE_ID}`))
    );
  }

  function mutationTouches(selector, records) {
    return records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => {
      if (!elementLike(node)) return false;
      if (node.matches(selector)) return true;
      return typeof node.querySelector === 'function' && Boolean(node.querySelector(selector));
    }));
  }

  const observer = new MutationObserver(records => {
    if (records.every(ownMutation)) return;
    const route = currentRoute();
    if (isSelectionView(route)) {
      const hub = document.getElementById(HUB_ID);
      if (hub?.isConnected && !mutationTouches(SELECTORS.subjectInput, records)) return;
    } else if (route?.kind === 'exam' || route?.kind === 'task') {
      const favorite = document.getElementById(FAVORITE_ID);
      if (favorite?.isConnected && favorite._yoiHeading?.isConnected && !mutationTouches('h1,h2,h3', records)) return;
    } else if (!document.getElementById(HUB_ID) && !document.getElementById(FAVORITE_ID)) {
      return;
    }
    if (records.some(record => record.addedNodes.length || record.removedNodes.length)) scheduleRender(120);
  });

  function startObserver() {
    if (!document.documentElement) return setTimeout(startObserver, 20);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  startObserver();
  scheduleHubSettle();

  addEventListener('storage', event => {
    if (event.storageArea !== localStorage) return;
    if (event.key === LIBRARY_KEY || event.key === MAP_KEY) {
      lastHubSignature = '';
      scheduleRender(0);
      ensureFavoriteButton();
    }
  });
  if (libraryChannel) {
    libraryChannel.addEventListener('message', event => {
      if (event.data?.type !== 'library-changed') return;
      lastHubSignature = '';
      scheduleRender(0);
      ensureFavoriteButton();
    });
  }

  rt.onSettingsChange?.(() => { lastHubSignature = ''; scheduleRender(0); });
  rt.toggleFavoriteExam = toggleFavorite;
  rt.getExamLibrary = loadLibrary;
  rt.forgetRecentExam = forgetRecentExam;
  rt.clearExamRecents = () => mutateLibrary(lib => {
    lib.lastExam = null;
    lib.lastActivity = null;
    lib.recent = [];
    lib.questionSessions = [];
  });
  rt.clearExamFavorites = () => mutateLibrary(lib => {
    lib.favorites = [];
  }).then(() => ensureFavoriteButton());

  navigationChanged();
})();
