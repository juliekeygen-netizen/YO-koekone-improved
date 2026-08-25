(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;

  const {
    BASE_PATH,
    SELECTORS,
    normalizeSpaces,
    canonicalSubjectSlug,
    parseRoute
  } = rt;

  const MAP_KEY = 'yo-koekone-improved:mappings:v2';
  const SITE_SUFFIX = ' | Abitreenit';
  const DEFAULT_NATIVE_TITLE = normalizeSpaces(document.title) || 'Harjoittele yo-kokeilla | Abitreenit';
  let syncTimer = null;
  let settledTimers = [];
  let lastHref = location.href;
  let lastMappingsRaw = null;
  let mappingsCache = {};

  function uiText(key, fallback) {
    const value = rt.t?.(key);
    return typeof value === 'string' && value && value !== key ? value : fallback;
  }

  function loadMappings() {
    try {
      const raw = localStorage.getItem(MAP_KEY) || '{}';
      if (raw === lastMappingsRaw) return mappingsCache;
      lastMappingsRaw = raw;
      const parsed = JSON.parse(raw);
      mappingsCache = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
      return mappingsCache;
    } catch {
      lastMappingsRaw = null;
      mappingsCache = {};
      return mappingsCache;
    }
  }

  function titleCaseWords(value) {
    return normalizeSpaces(String(value || '').replace(/-/g, ' '))
      .replace(/\b\p{L}/gu, char => char.toLocaleUpperCase('fi-FI'));
  }

  function displaySeason(value) {
    const season = String(value || '').toLocaleLowerCase('fi-FI');
    return season === 'kevat' || season === 'kevät' ? 'kevät' : season;
  }

  function fallbackSubjectLabel(slug) {
    const known = {
      terveystieto: 'Terveystieto',
      biologia: 'Biologia',
      maantiede: 'Maantiede',
      historia: 'Historia',
      filosofia: 'Filosofia',
      fysiikka: 'Fysiikka',
      kemia: 'Kemia',
      psykologia: 'Psykologia',
      yhteiskuntaoppi: 'Yhteiskuntaoppi',
      elamankatsomustieto: 'Elämänkatsomustieto',
      'uskonto-evlut': 'Evankelisluterilainen uskonto',
      'uskonto-ortodoksinen': 'Ortodoksinen uskonto',
      'suomi-toisena-kielena': 'Suomi toisena kielenä'
    };
    if (known[slug]) return known[slug];

    let prefix = '';
    let rest = String(slug || '');
    if (rest.startsWith('nakovammaiset-')) {
      prefix = 'Näkövammaiset – ';
      rest = rest.slice('nakovammaiset-'.length);
    } else if (rest.startsWith('kuulovammaiset-')) {
      prefix = 'Kuulovammaiset – ';
      rest = rest.slice('kuulovammaiset-'.length);
    }

    return `${prefix}${known[rest] || titleCaseWords(rest)}`;
  }

  function resolveSubjectLabel(route) {
    if (!route?.subject) return '';

    const inputValue = normalizeSpaces(document.querySelector(SELECTORS.subjectInput)?.value || '');
    if (inputValue && canonicalSubjectSlug(inputValue) === route.subject) return inputValue;

    const remembered = normalizeSpaces(loadMappings().subjects?.[route.subject] || '');
    return remembered || fallbackSubjectLabel(route.subject);
  }

  function fallbackExamLabel(route, subject) {
    const match = String(route?.exam || '').match(/^(\d{4})-(kevat|kevät|syksy)(?:-(.+))?$/i);
    if (!match) {
      const rest = titleCaseWords(route?.exam || '');
      return normalizeSpaces(`${subject} ${rest}`);
    }

    const [, year, season, extra] = match;
    const suffix = extra ? ` – ${titleCaseWords(extra)}` : '';
    return `${subject} ${displaySeason(season)} ${year}${suffix}`;
  }

  function resolveExamLabel(route, subject) {
    const remembered = normalizeSpaces(loadMappings().exams?.[route?.subject]?.[route?.exam]?.label || '');
    if (remembered) return remembered;

    const year = String(route?.exam || '').match(/\b\d{4}\b/)?.[0] || '';
    const season = displaySeason(String(route?.exam || '').match(/(?:^|-)(kevat|kevät|syksy)(?:-|$)/i)?.[1] || '');
    const headings = [...document.querySelectorAll('h1, h2, h3, .yo-primary-header')]
      .map(el => normalizeSpaces(el.textContent || ''))
      .filter(Boolean);
    const fromDom = headings.find(text =>
      (!year || text.includes(year)) &&
      (!season || text.toLocaleLowerCase('fi-FI').includes(season.toLocaleLowerCase('fi-FI')))
    );

    return fromDom || fallbackExamLabel(route, subject);
  }

  function titleForRoute(route, subject = '', exam = '') {
    if (!route || route.kind === 'home') return `${uiText('homeTitle', 'Aloitussivu')}${SITE_SUFFIX}`;
    if (route.kind === 'questions') {
      return `${subject || fallbackSubjectLabel(route.subject)} ${uiText('questionsTitleWord', 'kysymykset')}${SITE_SUFFIX}`;
    }
    if (route.kind === 'subject') return `${subject || fallbackSubjectLabel(route.subject)}${SITE_SUFFIX}`;
    return `${exam || fallbackExamLabel(route, subject || fallbackSubjectLabel(route.subject))}${SITE_SUFFIX}`;
  }

  function desiredTitle() {
    if (location.pathname !== BASE_PATH) return null;
    if (rt.getSetting?.('tabTitles') === false) return DEFAULT_NATIVE_TITLE;

    const route = parseRoute(location.hash) || { kind: 'home' };
    if (route.kind === 'home') return titleForRoute(route);

    const subject = resolveSubjectLabel(route);
    if (route.kind === 'subject' || route.kind === 'questions') {
      return titleForRoute(route, subject);
    }

    return titleForRoute(route, subject, resolveExamLabel(route, subject));
  }

  function syncTitle() {
    syncTimer = null;
    const title = desiredTitle();
    if (title && document.title !== title) document.title = title;
  }

  function scheduleSync(delay = 0) {
    if (syncTimer != null) clearTimeout(syncTimer);
    syncTimer = setTimeout(syncTitle, delay);
  }

  function clearSettledTimers() {
    for (const timer of settledTimers) clearTimeout(timer);
    settledTimers = [];
  }

  function scheduleSettledSyncs() {
    scheduleSync(0);
    clearSettledTimers();
    settledTimers = [
      setTimeout(syncTitle, 350),
      setTimeout(syncTitle, 1200)
    ];
  }

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    if (typeof original !== 'function') continue;
    history[method] = function(...args) {
      const beforeHref = location.href;
      const result = original.apply(this, args);
      if (location.href !== beforeHref) scheduleSettledSyncs();
      return result;
    };
  }

  addEventListener('popstate', scheduleSettledSyncs, true);
  addEventListener('hashchange', scheduleSettledSyncs, true);
  addEventListener('pageshow', scheduleSettledSyncs, true);
  rt.onSettingsChange?.(() => scheduleSettledSyncs());
  rt.onLanguageChange?.(() => scheduleSettledSyncs());

  function mutationTouchesTitle(record) {
    const target = record.target;
    if (target && typeof target.closest === 'function' && target.closest('title')) return true;
    if (target?.parentElement?.tagName === 'TITLE') return true;
    return [...record.addedNodes, ...record.removedNodes].some(node =>
      node?.nodeName === 'TITLE' || node?.parentElement?.tagName === 'TITLE');
  }

  const headObserver = new MutationObserver(records => {
    if (records.some(mutationTouchesTitle)) scheduleSync(0);
  });

  function observeHead() {
    if (!document.head) return false;
    headObserver.observe(document.head, { subtree: true, childList: true, characterData: true });
    return true;
  }

  if (!observeHead()) {
    addEventListener('DOMContentLoaded', () => {
      observeHead();
      scheduleSettledSyncs();
    }, { once: true });
  }

  setInterval(() => {
    let mappingsChanged = false;
    try {
      mappingsChanged = (localStorage.getItem(MAP_KEY) || '{}') !== lastMappingsRaw;
    } catch {
      // Ignore storage access errors; title fallback still works.
    }
    if (location.href === lastHref && !mappingsChanged) return;
    lastHref = location.href;
    scheduleSettledSyncs();
  }, 1000);

  scheduleSettledSyncs();
})();
