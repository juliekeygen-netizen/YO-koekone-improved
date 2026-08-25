// ==UserScript==
// @name         YO-koekone Improved
// @namespace    https://github.com/juliekeygen-netizen/YO-koekone-improved
// @version      0.2.0
// @description  Adds readable deep links, refresh restoration, and real Back/Forward navigation to Yle Abitreenit Yo-koekone.
// @author       juliekeygen-netizen + ChatGPT
// @match        https://yle.fi/abitreenit/harjoittele*
// @run-at       document-start
// @grant        none
// @homepageURL  https://github.com/juliekeygen-netizen/YO-koekone-improved
// @supportURL   https://github.com/juliekeygen-netizen/YO-koekone-improved/issues
// @downloadURL  https://raw.githubusercontent.com/juliekeygen-netizen/YO-koekone-improved/main/YO-koekone-improved.user.js
// @updateURL    https://raw.githubusercontent.com/juliekeygen-netizen/YO-koekone-improved/main/YO-koekone-improved.user.js
// ==/UserScript==

(() => {
  'use strict';

  const APP = 'YO-koekone Improved';
  const VERSION = '0.2.0';
  const BASE_PATH = '/abitreenit/harjoittele';
  const ROUTE_PREFIX = '#/';
  const STATE_NS = 'yoKoekoneImproved';
  const MAP_KEY = 'yo-koekone-improved:mappings:v2';
  const UI_KEY = 'yo-koekone-improved:ui:v2';
  const OLD_UI_KEY = 'yo-koekone-improved:ui:v1';
  const ACTIVE_ATTR = 'data-yo-koekone-improved-active';

  const SELECTORS = {
    root: '#yo-tehtava-body #root, #root',
    subjectInput: 'input[data-testid="select-exam-subject"]',
    submitQuestions: '[data-testid="submit-default-carousel"]',
    filterMaterial: '[data-testid="meta-option--material"]',
    filterNoMaterial: '[data-testid="meta-option--noMaterial"]',
    prevQuestion: '[data-testid="prev-carousel-item"]',
    nextQuestion: '[data-testid="next-carousel-item"]',
    shuffleQuestions: '[data-testid="shuffle-carousel-items"]',
    tocItem: '.yo-toc-item__text[role="button"]',
    tocHeader: '.yo-toc-header[role="button"], .yo-toc-header, .yo-toc-header__text',
    examRoot: '.yo-exam-root',
    examHeader: '.yo-primary-header',
    examQuestion: '.yo-exam-question',
    backToExamSelection: '[aria-label="Takaisin koevalintaan"]'
  };

  let applyingRoute = false;
  let routeApplyToken = 0;
  let routeEventTimer = null;
  let lastSelectedSubjectLabel = '';
  let lastSelectedSubjectSlug = '';
  let currentQuestionIndex = 1;
  let activeExamKey = '';
  let activeQuestionSubject = '';
  let pendingExam = null;
  let scrollTimer = null;
  let suppressScrollUntil = 0;
  let taskAnchors = [];
  let taskAnchorExamKey = '';

  function log(...args) {
    console.debug(`[${APP}]`, ...args);
  }

  function warn(...args) {
    console.warn(`[${APP}]`, ...args);
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

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

  // Readable YO+ route slugs are deliberately ASCII even when Yle's exact
  // machine value or Finnish label contains å/ä/ö. Exact Yle API values stay
  // internal and are stored separately from the public hash route.
  function asciiRouteSlug(value) {
    return String(value ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('fi-FI')
      .replace(/[^a-z0-9_-]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');
  }

  function decodeSegment(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function encodeSegment(value) {
    return encodeURIComponent(String(value ?? ''));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  function loadStorage(storage, key, fallback) {
    try {
      const parsed = JSON.parse(storage.getItem(key) || '');
      return isPlainObject(parsed) ? parsed : fallback;
    } catch {
      return fallback;
    }
  }

  function saveStorage(storage, key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
    } catch (error) {
      warn('Could not persist state', error);
    }
  }

  function getMappings() {
    const data = loadStorage(localStorage, MAP_KEY, {});
    if (!isPlainObject(data.subjects)) data.subjects = {};
    if (!isPlainObject(data.subjectApi)) data.subjectApi = {};
    if (!isPlainObject(data.exams)) data.exams = {};
    return data;
  }

  function rememberSubject(slug, label) {
    if (!slug || !label) return;
    const mappings = getMappings();
    mappings.subjects[slug] = label;
    saveStorage(localStorage, MAP_KEY, mappings);
  }

  function rememberExam(subjectSlug, examSlug, info) {
    if (!subjectSlug || !examSlug) return;
    const mappings = getMappings();
    if (!isPlainObject(mappings.exams[subjectSlug])) mappings.exams[subjectSlug] = {};
    mappings.exams[subjectSlug][examSlug] = {
      ...(mappings.exams[subjectSlug][examSlug] || {}),
      ...info
    };
    saveStorage(localStorage, MAP_KEY, mappings);
  }

  function readRememberedSubject(slug) {
    return getMappings().subjects[slug] || '';
  }

  function readRememberedExam(subjectSlug, examSlug) {
    return getMappings().exams?.[subjectSlug]?.[examSlug] || null;
  }

  function getUIState() {
    return loadStorage(sessionStorage, UI_KEY, {});
  }

  function saveUIState(patch) {
    const next = { ...getUIState(), ...patch };
    saveStorage(sessionStorage, UI_KEY, next);
    return next;
  }

  function canonicalSubjectSlug(label) {
    const raw = normalizeSpaces(label);
    const lower = raw.toLocaleLowerCase('fi-FI');
    const isVisual = /näkövammaiset/.test(lower);
    const isHearing = /kuulovammaisten koe/.test(lower);

    let core = lower
      .replace(/,\s*näkövammaiset/g, '')
      .replace(/^näkövammaiset[,:;\s-]*/g, '')
      .replace(/^kuulovammaisten koe[,:;\s-]*/g, '')
      .trim();

    const exactAliases = [
      [/^terveystieto$/, 'terveystieto'],
      [/^biologia$/, 'biologia'],
      [/^maantiede$/, 'maantiede'],
      [/^historia$/, 'historia'],
      [/^filosofia$/, 'filosofia'],
      [/^fysiikka$/, 'fysiikka'],
      [/^kemia$/, 'kemia'],
      [/^psykologia$/, 'psykologia'],
      [/^yhteiskuntaoppi$/, 'yhteiskuntaoppi'],
      [/^elämänkatsomustieto$/, 'elamankatsomustieto']
    ];

    const alias = exactAliases.find(([re]) => re.test(core));
    if (alias) {
      return `${isHearing ? 'kuulovammaiset-' : ''}${isVisual ? 'nakovammaiset-' : ''}${alias[1]}`;
    }

    if (/evankelisluterilainen uskonto/.test(core)) {
      return `${isVisual ? 'nakovammaiset-' : ''}uskonto-evlut`;
    }
    if (/ortodoksinen uskonto/.test(core)) {
      return `${isVisual ? 'nakovammaiset-' : ''}uskonto-ortodoksinen`;
    }
    if (/suomi toisena kielenä/.test(core)) {
      return `${isHearing ? 'kuulovammaiset-' : ''}suomi-toisena-kielena`;
    }

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

    const seasonMatch = text.match(/\b(kevät|syksy)\s+(\d{4})\b/i);
    if (seasonMatch) {
      const season = seasonMatch[1].toLocaleLowerCase('fi-FI') === 'kevät' ? 'kevat' : 'syksy';
      const year = seasonMatch[2];
      const rest = normalizeSpaces(
        `${text.slice(0, seasonMatch.index)} ${text.slice((seasonMatch.index || 0) + seasonMatch[0].length)}`
      );
      const extra = fold(rest);
      return extra ? `${year}-${season}-${extra}` : `${year}-${season}`;
    }

    return fold(text);
  }

  function parseHashRoute(hash = location.hash) {
    if (!hash) return { kind: 'home' };
    if (!hash.startsWith(ROUTE_PREFIX)) return null;

    const raw = hash.slice(ROUTE_PREFIX.length);
    const queryIndex = raw.indexOf('?');
    const pathPart = queryIndex >= 0 ? raw.slice(0, queryIndex) : raw;
    const queryPart = queryIndex >= 0 ? raw.slice(queryIndex + 1) : '';
    const parts = pathPart.split('/').filter(Boolean).map(decodeSegment);
    const params = new URLSearchParams(queryPart);

    if (!parts.length) return { kind: 'home' };

    const subject = asciiRouteSlug(parts[0]);
    if (!subject) return { kind: 'home' };

    if (parts[1] === 'kysymykset') {
      const q = parts[2]?.match(/^kysymys-(\d+)$/i);
      return {
        kind: 'questions',
        subject,
        question: q ? Math.max(1, Number(q[1])) : 1,
        material: params.get('aineisto') === '1',
        noMaterial: params.get('ei-aineistoa') === '1'
      };
    }

    if (!parts[1]) return { kind: 'subject', subject };

    const task = parts[2]?.match(/^tehtava-(\d+(?:\.\d+)?)$/i);
    return {
      kind: task ? 'task' : 'exam',
      subject,
      exam: asciiRouteSlug(parts[1]),
      task: task?.[1] || null
    };
  }

  function routeToHash(route) {
    if (!route || route.kind === 'home') return '';

    const subject = encodeSegment(asciiRouteSlug(route.subject));
    if (route.kind === 'subject') return `#/${subject}`;

    if (route.kind === 'questions') {
      const params = new URLSearchParams();
      if (route.material) params.set('aineisto', '1');
      if (route.noMaterial) params.set('ei-aineistoa', '1');
      const suffix = route.question && route.question > 1 ? `/kysymys-${route.question}` : '';
      const query = params.toString();
      return `#/${subject}/kysymykset${suffix}${query ? `?${query}` : ''}`;
    }

    const exam = encodeSegment(asciiRouteSlug(route.exam));
    if (route.kind === 'task' && route.task) {
      return `#/${subject}/${exam}/tehtava-${encodeSegment(route.task)}`;
    }
    return `#/${subject}/${exam}`;
  }

  function routeIdentity(route) {
    if (!route) return 'native';
    return routeToHash(route) || 'home';
  }

  function routesEqual(a, b) {
    return routeIdentity(a) === routeIdentity(b);
  }

  function currentBaseHistoryState() {
    return isPlainObject(history.state) ? history.state : {};
  }

  function currentNamespace() {
    const ns = currentBaseHistoryState()[STATE_NS];
    return isPlainObject(ns) ? ns : {};
  }

  function makeHistoryState(route, extra = {}) {
    const base = currentBaseHistoryState();
    const previous = currentNamespace();
    const nextNamespace = {
      version: VERSION,
      ui: previous.ui || getUIState(),
      route,
      ...extra
    };

    if (
      (route.kind === 'exam' || route.kind === 'task') &&
      (previous.route?.kind === 'exam' || previous.route?.kind === 'task') &&
      previous.route?.subject === route.subject &&
      previous.route?.exam === route.exam &&
      previous.examUuid
    ) {
      nextNamespace.examUuid = previous.examUuid;
    }

    if (
      route.kind === 'questions' &&
      previous.route?.kind === 'questions' &&
      previous.route?.subject === route.subject &&
      previous.questionUuids
    ) {
      nextNamespace.questionUuids = previous.questionUuids;
    }

    return {
      ...base,
      [STATE_NS]: nextNamespace
    };
  }

  function targetUrlForRoute(route) {
    return `${location.pathname}${location.search}${routeToHash(route)}`;
  }

  function writeRoute(route, mode = 'push', extra = {}) {
    if (!route) return;
    const url = targetUrlForRoute(route);
    const state = makeHistoryState(route, extra);
    const currentUrl = `${location.pathname}${location.search}${location.hash}`;

    if (mode === 'replace' || currentUrl === url) {
      history.replaceState(state, '', url);
      log('replace route', route);
      return;
    }

    history.pushState(state, '', url);
    log('push route', route);
  }

  function replaceNamespace(patch) {
    const base = currentBaseHistoryState();
    const ns = currentNamespace();
    history.replaceState(
      {
        ...base,
        [STATE_NS]: {
          ...ns,
          version: VERSION,
          ...patch
        }
      },
      '',
      location.href
    );
  }

  function persistUIState(patch) {
    const next = saveUIState(patch);
    replaceNamespace({ ui: next });
  }

  function managedRouteFromLocation() {
    return parseHashRoute();
  }

  function hasManagedState(state = history.state) {
    return isPlainObject(state) && isPlainObject(state[STATE_NS]);
  }

  function shouldHandleLocation(state = history.state) {
    if (location.pathname !== BASE_PATH) return false;
    if (location.hash && !location.hash.startsWith(ROUTE_PREFIX)) return false;
    return Boolean(location.hash.startsWith(ROUTE_PREFIX) || hasManagedState(state) || !location.hash);
  }

  function assertToken(token) {
    if (token !== routeApplyToken) throw new Error('Route restoration was superseded');
  }

  function waitFor(getter, { timeout = 12000, interval = 80, description = 'condition', token = null } = {}) {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const tick = () => {
        if (token != null && token !== routeApplyToken) {
          reject(new Error(`Cancelled while waiting for ${description}`));
          return;
        }

        let value = null;
        try {
          value = getter();
        } catch {
          value = null;
        }

        if (value) {
          resolve(value);
          return;
        }

        if (Date.now() - started >= timeout) {
          reject(new Error(`Timed out waiting for ${description}`));
          return;
        }
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  function dispatchInput(el, value) {
    if (!el) return;

    // Userscript/content-script DOM nodes can come from a different JS realm.
    // Resolve the value setter from the element's own prototype instead of
    // relying on instanceof against this realm's constructors.
    let descriptor = null;
    try {
      const proto = Object.getPrototypeOf(el);
      descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
    } catch {
      descriptor = null;
    }

    if (!descriptor?.set) {
      const view = el.ownerDocument?.defaultView;
      const tag = String(el.tagName || '').toUpperCase();
      const fallbackProto = tag === 'TEXTAREA'
        ? view?.HTMLTextAreaElement?.prototype
        : view?.HTMLInputElement?.prototype;
      descriptor = fallbackProto ? Object.getOwnPropertyDescriptor(fallbackProto, 'value') : null;
    }

    if (descriptor?.set) descriptor.set.call(el, value);
    else el.value = value;
    const EventCtor = el.ownerDocument?.defaultView?.Event || globalThis.Event;
    el.dispatchEvent(new EventCtor('input', { bubbles: true }));
    el.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }

  function menuForInput(input) {
    if (!input) return null;
    const menuId = input.getAttribute('aria-controls');
    return menuId ? document.getElementById(menuId) : null;
  }

  function optionText(option) {
    return normalizeSpaces(option?.textContent || '');
  }

  function subjectInput() {
    return document.querySelector(SELECTORS.subjectInput);
  }

  function examInput() {
    const subject = subjectInput();
    return [...document.querySelectorAll('input[role="combobox"][aria-controls]')]
      .find(input => input !== subject) || null;
  }

  function listboxInputForOption(option) {
    const menu = option?.closest('[role="listbox"]');
    if (!menu?.id) return null;
    try {
      return document.querySelector(`input[aria-controls="${CSS.escape(menu.id)}"]`);
    } catch {
      return [...document.querySelectorAll('input[aria-controls]')]
        .find(input => input.getAttribute('aria-controls') === menu.id) || null;
    }
  }

  async function openCombobox(input, token) {
    if (!input) throw new Error('Combobox input not found');

    if (input.getAttribute('aria-expanded') !== 'true') {
      input.click();
    }

    try {
      return await waitFor(() => {
        const menu = menuForInput(input);
        return menu?.querySelector('[role="option"]') ? menu : null;
      }, { timeout: 1800, description: 'combobox options', token });
    } catch {
      assertToken(token);
      const menuId = input.getAttribute('aria-controls');
      const toggle = menuId
        ? document.querySelector(`button[aria-controls="${menuId}"]`)
        : null;
      toggle?.click();

      return waitFor(() => {
        const menu = menuForInput(input);
        return menu?.querySelector('[role="option"]') ? menu : null;
      }, { description: 'combobox options after toggle', token });
    }
  }

  function findSubjectOption(menu, subjectSlug) {
    const options = [...menu.querySelectorAll('[role="option"]')];
    const remembered = readRememberedSubject(subjectSlug);

    return (
      (remembered && options.find(option => optionText(option) === remembered)) ||
      options.find(option => canonicalSubjectSlug(optionText(option)) === subjectSlug) ||
      options.find(option => fold(optionText(option)) === fold(subjectSlug))
    );
  }

  function findExamOption(menu, subjectSlug, examSlug) {
    const options = [...menu.querySelectorAll('[role="option"]')];
    const remembered = readRememberedExam(subjectSlug, examSlug);
    const subjectLabel = readRememberedSubject(subjectSlug) || lastSelectedSubjectLabel;

    return (
      (remembered?.label && options.find(option => optionText(option) === remembered.label)) ||
      options.find(option => canonicalExamSlug(optionText(option), subjectLabel) === examSlug) ||
      options.find(option => fold(optionText(option)) === fold(examSlug))
    );
  }

  function isDisabled(el) {
    if (!el) return true;
    return Boolean(
      el.disabled ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.getAttribute('disabled') != null
    );
  }

  function filterChecked(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    if ('checked' in el) return Boolean(el.checked);
    return el.getAttribute('aria-checked') === 'true';
  }

  function setCheckbox(selector, wanted) {
    const el = document.querySelector(selector);
    if (!el) return;
    const current = 'checked' in el ? Boolean(el.checked) : el.getAttribute('aria-checked') === 'true';
    if (current !== wanted) el.click();
  }

  function questionViewPresent() {
    return Boolean(
      document.querySelector(SELECTORS.nextQuestion) ||
      document.querySelector(SELECTORS.prevQuestion) ||
      document.querySelector(SELECTORS.shuffleQuestions)
    );
  }

  function examViewPresent() {
    if (questionViewPresent()) return false;
    return Boolean(
      document.querySelector(SELECTORS.examRoot) ||
      document.querySelector(SELECTORS.tocHeader) ||
      document.querySelector(SELECTORS.examHeader)
    );
  }

  function selectionBackButton() {
    return document.querySelector(SELECTORS.backToExamSelection);
  }

  async function leaveResultView(token) {
    const back = selectionBackButton();
    if (!back) return;
    assertToken(token);
    back.click();
    await waitFor(subjectInput, {
      description: 'subject selector after returning to selection',
      token
    });
    activeExamKey = '';
    activeQuestionSubject = '';
    taskAnchors = [];
    taskAnchorExamKey = '';
  }

  async function restoreSubject(subjectSlug, token, { forceReselect = false } = {}) {
    let input = await waitFor(subjectInput, { description: 'subject selector', token });
    const currentLabel = normalizeSpaces(input.value);
    const currentMatches = Boolean(
      currentLabel && canonicalSubjectSlug(currentLabel) === subjectSlug
    );

    // On F5/direct navigation the browser can restore the visible input value
    // before Yle's React state has actually selected that subject. Reusing that
    // cosmetic value leaves the exam selector empty forever. Initial deep-link
    // restoration therefore performs a real clear + option click even when the
    // label already looks correct.
    if (currentMatches && !forceReselect) {
      lastSelectedSubjectLabel = currentLabel;
      lastSelectedSubjectSlug = subjectSlug;
      rememberSubject(subjectSlug, currentLabel);
      return;
    }

    if (currentLabel) {
      const clear = findClearButtonForInput(input);
      if (clear) {
        assertToken(token);
        clear.click();
        try {
          input = await waitFor(() => {
            const live = subjectInput();
            return live && !normalizeSpaces(live.value) ? live : null;
          }, {
            timeout: 2200,
            interval: 50,
            description: 'cleared subject selector',
            token
          });
        } catch {
          input = subjectInput() || input;
          dispatchInput(input, '');
        }
      } else {
        dispatchInput(input, '');
      }
    }

    input = await waitFor(subjectInput, { description: 'live subject selector', token });
    const menu = await openCombobox(input, token);
    const option = findSubjectOption(menu, subjectSlug);

    if (!option) {
      throw new Error(`Subject "${subjectSlug}" was not found in Yle's selector`);
    }

    const label = optionText(option);
    assertToken(token);
    option.click();

    lastSelectedSubjectLabel = label;
    lastSelectedSubjectSlug = subjectSlug;
    rememberSubject(subjectSlug, label);

    await waitFor(() => {
      const live = subjectInput();
      const liveLabel = normalizeSpaces(live?.value);
      if (!liveLabel || canonicalSubjectSlug(liveLabel) !== subjectSlug) return null;
      return examInput() || document.querySelector(SELECTORS.submitQuestions);
    }, {
      description: 'subject-dependent controls after real selection',
      timeout: 12000,
      token
    });
  }

  async function restoreExam(subjectSlug, examSlug, token) {
    if (examViewPresent() && activeExamKey === `${subjectSlug}/${examSlug}`) return;

    let input = await waitFor(examInput, { description: 'exam selector', token });
    if (normalizeSpaces(input.value)) dispatchInput(input, '');

    const examOptionDescription = `exam "${examSlug}" option`;

    const waitForLiveExamOption = async ({ timeout, rememberedLabel = '' }) => {
      const started = Date.now();
      let openedInput = null;
      let seededInput = null;

      while (Date.now() - started < timeout) {
        assertToken(token);
        const liveInput = examInput();

        if (liveInput) {
          if (rememberedLabel && liveInput !== seededInput) {
            dispatchInput(liveInput, rememberedLabel);
            seededInput = liveInput;
          }

          if (liveInput !== openedInput || liveInput.getAttribute('aria-expanded') !== 'true') {
            if (liveInput.getAttribute('aria-expanded') !== 'true') liveInput.click();
            openedInput = liveInput;
          }

          const liveMenu = menuForInput(liveInput);
          const option = liveMenu ? findExamOption(liveMenu, subjectSlug, examSlug) : null;
          if (option?.isConnected) return option;
        }

        await sleep(100);
      }

      throw new Error(`Timed out waiting for ${examOptionDescription}`);
    };

    let option;
    try {
      option = await waitForLiveExamOption({ timeout: 18000 });
    } catch (firstError) {
      assertToken(token);
      const remembered = readRememberedExam(subjectSlug, examSlug);
      try {
        option = await waitForLiveExamOption({
          timeout: 12000,
          rememberedLabel: remembered?.label || ''
        });
      } catch {
        throw firstError;
      }
    }

    const label = optionText(option);
    rememberExam(subjectSlug, examSlug, { label });

    pendingExam = {
      subjectSlug,
      examSlug,
      label,
      createdAt: Date.now()
    };

    assertToken(token);
    option.click();

    await waitFor(examViewPresent, {
      description: 'exam view',
      timeout: 18000,
      token
    });

    activeExamKey = `${subjectSlug}/${examSlug}`;
    activeQuestionSubject = '';
    taskAnchors = [];
    taskAnchorExamKey = '';
  }

  function tocNumber(text) {
    const match = normalizeSpaces(text).match(/Tehtävä\s+(\d+(?:\.\d+)?)/i);
    return match?.[1] || null;
  }

  async function restoreTask(task, token) {
    if (!task) return;

    let items = [...document.querySelectorAll(SELECTORS.tocItem)];
    let openedForRestore = false;

    if (!items.length) {
      const header = await waitFor(() => {
        return [...document.querySelectorAll(SELECTORS.tocHeader)]
          .find(el => /tehtäväluettelo/i.test(normalizeSpaces(el.textContent)));
      }, { description: 'task list toggle', token });

      assertToken(token);
      header.click();
      openedForRestore = true;

      items = await waitFor(() => {
        const found = [...document.querySelectorAll(SELECTORS.tocItem)];
        return found.length ? found : null;
      }, { description: 'task list items', token });
    }

    const item = items.find(el => tocNumber(el.textContent) === String(task));
    if (!item) throw new Error(`Task "${task}" was not found in the exam table of contents`);

    assertToken(token);
    item.click();
    await sleep(350);
    assertToken(token);

    if (openedForRestore) {
      const header = [...document.querySelectorAll(SELECTORS.tocHeader)]
        .find(el => /tehtäväluettelo/i.test(normalizeSpaces(el.textContent)));
      if (header && /piilota/i.test(normalizeSpaces(header.textContent))) {
        header.click();
      }
    }

    rebuildTaskAnchors();
  }

  async function restoreQuestionMode(route, token) {
    if (!questionViewPresent()) {
      await waitFor(() => document.querySelector(SELECTORS.submitQuestions), {
        description: 'question search controls',
        token
      });

      assertToken(token);
      setCheckbox(SELECTORS.filterMaterial, Boolean(route.material));
      setCheckbox(SELECTORS.filterNoMaterial, Boolean(route.noMaterial));

      const submit = document.querySelector(SELECTORS.submitQuestions);
      if (!submit || isDisabled(submit)) throw new Error('Question search button is unavailable');
      assertToken(token);
      submit.click();

      await waitFor(questionViewPresent, {
        description: 'question carousel',
        timeout: 18000,
        token
      });

      currentQuestionIndex = 1;
      activeQuestionSubject = route.subject;
      activeExamKey = '';
    }

    const target = Math.max(1, Number(route.question) || 1);
    let reached = currentQuestionIndex;

    while (reached < target) {
      const button = await waitFor(() => document.querySelector(SELECTORS.nextQuestion), {
        description: 'next question button',
        token
      });
      if (isDisabled(button)) break;
      assertToken(token);
      button.click();
      reached++;
      await sleep(150);
      assertToken(token);
    }

    while (reached > target) {
      const button = await waitFor(() => document.querySelector(SELECTORS.prevQuestion), {
        description: 'previous question button',
        token
      });
      if (isDisabled(button)) break;
      assertToken(token);
      button.click();
      reached--;
      await sleep(150);
      assertToken(token);
    }

    currentQuestionIndex = reached;
    activeQuestionSubject = route.subject;

    if (reached !== target) {
      writeRoute({ ...route, question: reached }, 'replace', { clampedQuestion: true });
    }
  }

  async function restoreTransientSelectionState(route, token) {
    const ui = getUIState();

    if (route.kind === 'home' && ui.subjectSearch) {
      const input = await waitFor(subjectInput, {
        description: 'subject input for search restoration',
        token
      });
      dispatchInput(input, ui.subjectSearch);
    }

    if (route.kind === 'subject') {
      if (ui.examSearch) {
        const input = await waitFor(examInput, {
          description: 'exam input for search restoration',
          token
        });
        dispatchInput(input, ui.examSearch);
      }

      if (isPlainObject(ui.filters)) {
        setCheckbox(SELECTORS.filterMaterial, Boolean(ui.filters.material));
        setCheckbox(SELECTORS.filterNoMaterial, Boolean(ui.filters.noMaterial));
      }
    }
  }

  async function applyRoute(route, reason = 'navigation') {
    if (!route) return;
    const token = ++routeApplyToken;
    applyingRoute = true;
    suppressScrollUntil = Date.now() + 1200;

    try {
      log(`Applying route (${reason})`, route);

      if (route.kind === 'home') {
        if (selectionBackButton()) await leaveResultView(token);

        const input = await waitFor(subjectInput, {
          description: 'home subject selector',
          token
        });

        if (normalizeSpaces(input.value)) {
          const clear = findClearButtonForInput(input);
          clear?.click();
          await sleep(80);
          assertToken(token);
        }

        lastSelectedSubjectLabel = '';
        lastSelectedSubjectSlug = '';
        await restoreTransientSelectionState(route, token);
        return;
      }

      if (route.kind === 'subject') {
        if (selectionBackButton()) await leaveResultView(token);
        await restoreSubject(route.subject, token, { forceReselect: reason === 'initial-load' });
        await restoreTransientSelectionState(route, token);
        return;
      }

      if (route.kind === 'questions') {
        const sameLiveCarousel =
          questionViewPresent() &&
          activeQuestionSubject === route.subject;

        if (!sameLiveCarousel) {
          if (selectionBackButton()) await leaveResultView(token);
          await restoreSubject(route.subject, token, { forceReselect: reason === 'initial-load' });
        }

        await restoreQuestionMode(route, token);
        return;
      }

      const targetExamKey = `${route.subject}/${route.exam}`;
      const sameLiveExam =
        examViewPresent() &&
        activeExamKey === targetExamKey;

      if (!sameLiveExam) {
        if (selectionBackButton()) await leaveResultView(token);
        await restoreSubject(route.subject, token, { forceReselect: reason === 'initial-load' });
        await restoreExam(route.subject, route.exam, token);
      }

      if (route.kind === 'task') {
        await restoreTask(route.task, token);
      } else if (sameLiveExam) {
        document.querySelector(SELECTORS.examRoot)?.scrollIntoView({
          behavior: 'auto',
          block: 'start'
        });
      }

      rebuildTaskAnchors();
    } catch (error) {
      if (token === routeApplyToken && !/superseded|Cancelled/.test(String(error?.message || ''))) {
        warn(`Could not restore route (${reason})`, route, error);
        showToast(`Reitin palautus epäonnistui: ${error.message}`, 'error');
      }
    } finally {
      if (token === routeApplyToken) {
        applyingRoute = false;
        suppressScrollUntil = Date.now() + 500;
      }
    }
  }

  function showToast(message, type = 'info') {
    if (!document.body) return;
    document.getElementById('__yo_improved_toast__')?.remove();

    const el = document.createElement('div');
    el.id = '__yo_improved_toast__';
    el.textContent = message;
    el.style.cssText = [
      'position:fixed',
      'right:16px',
      'bottom:16px',
      'z-index:2147483647',
      'max-width:420px',
      'padding:10px 12px',
      'border-radius:8px',
      'font:13px/1.35 system-ui,sans-serif',
      'box-shadow:0 6px 24px rgba(0,0,0,.3)',
      type === 'error' ? 'background:#7a1f1f;color:#fff' : 'background:#1f2937;color:#fff'
    ].join(';');

    document.body.appendChild(el);
    setTimeout(() => el.remove(), type === 'error' ? 6500 : 2600);
  }

  function currentSubjectFromUI() {
    const input = subjectInput();
    const label = normalizeSpaces(input?.value);
    if (!label) {
      const route = parseHashRoute();
      if (route?.subject) {
        return {
          slug: route.subject,
          label: readRememberedSubject(route.subject) || lastSelectedSubjectLabel
        };
      }
      return null;
    }

    const slug = lastSelectedSubjectSlug || canonicalSubjectSlug(label);
    rememberSubject(slug, label);
    return { slug, label };
  }

  function currentExamHeaderLabel() {
    return normalizeSpaces(document.querySelector(SELECTORS.examHeader)?.textContent || '');
  }

  function findClearButtonForInput(input) {
    if (!input) return null;
    let node = input.parentElement;

    for (let depth = 0; node && depth < 4; depth++, node = node.parentElement) {
      const buttons = [...node.querySelectorAll('button[aria-label="Tyhjennä"]')];
      const direct = buttons.find(button => {
        const container = button.parentElement;
        return container?.contains(input);
      });
      if (direct) return direct;
      if (buttons.length === 1 && node.querySelectorAll('input[role="combobox"]').length === 1) {
        return buttons[0];
      }
    }
    return null;
  }

  function subjectClearButton(target) {
    const input = subjectInput();
    const clear = findClearButtonForInput(input);
    return clear && (target === clear || clear.contains(target)) ? clear : null;
  }

  function clickHandler(event) {
    if (applyingRoute) return;
    const target = event?.target;
    if (!target || typeof target.closest !== 'function') return;

    const option = target.closest('[role="option"]');
    if (option) {
      const input = listboxInputForOption(option);
      const label = optionText(option);

      if (input?.matches(SELECTORS.subjectInput)) {
        const guessedSlug = canonicalSubjectSlug(label);
        lastSelectedSubjectLabel = label;
        lastSelectedSubjectSlug = guessedSlug;
        rememberSubject(guessedSlug, label);

        setTimeout(() => {
          if (applyingRoute) return;
          const subject = lastSelectedSubjectSlug || guessedSlug;
          writeRoute({ kind: 'subject', subject }, 'push', { subjectLabel: label });
          persistUIState({ subjectSearch: '', examSearch: '' });
        }, 0);
        return;
      }

      if (input && input !== subjectInput()) {
        const subject = currentSubjectFromUI();
        if (!subject) return;

        const examSlug = canonicalExamSlug(label, subject.label);
        pendingExam = {
          subjectSlug: subject.slug,
          examSlug,
          label,
          createdAt: Date.now()
        };
        activeExamKey = `${subject.slug}/${examSlug}`;
        activeQuestionSubject = '';
        rememberExam(subject.slug, examSlug, { label });

        setTimeout(() => {
          if (applyingRoute) return;
          writeRoute(
            { kind: 'exam', subject: subject.slug, exam: examSlug },
            'push',
            { subjectLabel: subject.label, examLabel: label }
          );
          persistUIState({ examSearch: '' });
          scheduleTaskAnchorRefresh();
        }, 0);
        return;
      }
    }

    const tocItem = target.closest(SELECTORS.tocItem);
    if (tocItem) {
      const route = parseHashRoute();
      const task = tocNumber(tocItem.textContent);

      if (task && route && (route.kind === 'exam' || route.kind === 'task')) {
        setTimeout(() => {
          if (!applyingRoute) {
            writeRoute({
              kind: 'task',
              subject: route.subject,
              exam: route.exam,
              task
            }, 'push');
            scheduleTaskAnchorRefresh();
          }
        }, 0);
      }
      return;
    }

    const back = target.closest(SELECTORS.backToExamSelection);
    if (back) {
      const route = parseHashRoute();
      const subject = route?.subject || currentSubjectFromUI()?.slug;

      if (subject) {
        activeExamKey = '';
        activeQuestionSubject = '';
        taskAnchors = [];
        taskAnchorExamKey = '';

        setTimeout(() => {
          if (!applyingRoute) writeRoute({ kind: 'subject', subject }, 'push');
        }, 0);
      }
      return;
    }

    const submitQuestions = target.closest(SELECTORS.submitQuestions);
    if (submitQuestions) {
      const subject = currentSubjectFromUI();
      if (!subject || isDisabled(submitQuestions)) return;

      const route = {
        kind: 'questions',
        subject: subject.slug,
        question: 1,
        material: filterChecked(SELECTORS.filterMaterial),
        noMaterial: filterChecked(SELECTORS.filterNoMaterial)
      };

      currentQuestionIndex = 1;
      activeQuestionSubject = subject.slug;
      activeExamKey = '';

      setTimeout(() => {
        if (!applyingRoute) {
          writeRoute(route, 'push', { subjectLabel: subject.label });
        }
      }, 0);
      return;
    }

    const nextButton = target.closest(SELECTORS.nextQuestion);
    if (nextButton) {
      const route = parseHashRoute();
      if (route?.kind === 'questions' && !isDisabled(nextButton)) {
        const next = Math.max(1, currentQuestionIndex + 1);
        currentQuestionIndex = next;
        setTimeout(() => {
          if (!applyingRoute) writeRoute({ ...route, question: next }, 'push');
        }, 0);
      }
      return;
    }

    const prevButton = target.closest(SELECTORS.prevQuestion);
    if (prevButton) {
      const route = parseHashRoute();
      if (route?.kind === 'questions' && !isDisabled(prevButton)) {
        const prev = Math.max(1, currentQuestionIndex - 1);
        currentQuestionIndex = prev;
        setTimeout(() => {
          if (!applyingRoute) writeRoute({ ...route, question: prev }, 'push');
        }, 0);
      }
      return;
    }

    const shuffleButton = target.closest(SELECTORS.shuffleQuestions);
    if (shuffleButton) {
      const route = parseHashRoute();
      if (route?.kind === 'questions' && !isDisabled(shuffleButton)) {
        currentQuestionIndex = 1;
        setTimeout(() => {
          if (!applyingRoute) {
            writeRoute({ ...route, question: 1 }, 'push', {
              shuffledAt: Date.now()
            });
          }
        }, 0);
      }
      return;
    }

    if (subjectClearButton(target)) {
      const route = parseHashRoute();

      setTimeout(() => {
        if (applyingRoute) return;

        lastSelectedSubjectLabel = '';
        lastSelectedSubjectSlug = '';
        activeExamKey = '';
        activeQuestionSubject = '';
        persistUIState({ subjectSearch: '', examSearch: '' });

        if (route?.kind && route.kind !== 'home') {
          writeRoute({ kind: 'home' }, 'push');
        } else {
          writeRoute({ kind: 'home' }, 'replace');
        }
      }, 0);
    }
  }

  function inputHandler(event) {
    if (applyingRoute) return;
    const input = event?.target;
    if (!input || String(input.tagName || '').toUpperCase() !== 'INPUT' || typeof input.matches !== 'function') return;

    if (input.matches(SELECTORS.subjectInput)) {
      const route = parseHashRoute();
      if (!route || route.kind === 'home' || !normalizeSpaces(input.value)) {
        persistUIState({ subjectSearch: input.value });
      }
      return;
    }

    if (input.getAttribute('role') === 'combobox' && input !== subjectInput()) {
      const route = parseHashRoute();
      if (route?.kind === 'subject') {
        persistUIState({ examSearch: input.value });
      }
    }
  }

  function changeHandler(event) {
    if (applyingRoute) return;
    const target = event?.target;
    if (!target || typeof target.matches !== 'function') return;

    if (target.matches(SELECTORS.filterMaterial) || target.matches(SELECTORS.filterNoMaterial)) {
      const route = parseHashRoute();
      const subject = route?.subject || currentSubjectFromUI()?.slug;
      if (!subject) return;

      const material = filterChecked(SELECTORS.filterMaterial);
      const noMaterial = filterChecked(SELECTORS.filterNoMaterial);
      persistUIState({ filters: { material, noMaterial } });

      if (route?.kind === 'questions') {
        writeRoute({ ...route, material, noMaterial }, 'replace');
      }
    }
  }

  function inferExamFromDom(uuid = '') {
    if (applyingRoute || !examViewPresent()) return;

    const label = currentExamHeaderLabel();
    if (!label) return;

    const route = parseHashRoute();
    const subjectSlug =
      route?.subject ||
      lastSelectedSubjectSlug ||
      currentSubjectFromUI()?.slug;

    if (!subjectSlug) return;

    const subjectLabel =
      readRememberedSubject(subjectSlug) ||
      lastSelectedSubjectLabel;

    const examSlug = canonicalExamSlug(label, subjectLabel);
    if (!examSlug) return;

    activeExamKey = `${subjectSlug}/${examSlug}`;
    activeQuestionSubject = '';
    rememberExam(subjectSlug, examSlug, { label, ...(uuid ? { uuid } : {}) });

    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) {
      writeRoute(
        { kind: 'exam', subject: subjectSlug, exam: examSlug },
        'push',
        { subjectLabel, examLabel: label, ...(uuid ? { examUuid: uuid } : {}) }
      );
    } else if (uuid) {
      replaceNamespace({ examUuid: uuid });
    }

    scheduleTaskAnchorRefresh();
  }

  function observeResources() {
    if (!('PerformanceObserver' in window)) return;

    const handleUrl = raw => {
      let url;
      try {
        url = new URL(raw);
      } catch {
        return;
      }

      if (url.hostname !== 'tehtava.api.yle.fi') return;

      if (url.pathname.endsWith('/v1/public/exams')) {
        const exactSubject = url.searchParams.get('subject');
        if (!exactSubject) return;

        const label = normalizeSpaces(subjectInput()?.value) || lastSelectedSubjectLabel;
        if (label) {
          const routeSlug = canonicalSubjectSlug(label);
          lastSelectedSubjectSlug = routeSlug;
          lastSelectedSubjectLabel = label;
          rememberSubject(routeSlug, label);

          const mappings = getMappings();
          mappings.subjectApi[routeSlug] = exactSubject;
          saveStorage(localStorage, MAP_KEY, mappings);

          const route = parseHashRoute();

          if (route?.kind === 'subject' && route.subject !== routeSlug) {
            writeRoute(
              { kind: 'subject', subject: routeSlug },
              'replace',
              { subjectLabel: label }
            );
          } else if (
            !applyingRoute &&
            (!route || route.kind === 'home')
          ) {
            writeRoute(
              { kind: 'subject', subject: routeSlug },
              'push',
              { subjectLabel: label, inferredFromApi: true }
            );
          }
        }
      }

      if (url.pathname.endsWith('/v1/public/exams.json')) {
        const uuid = url.searchParams.get('uuid');
        if (!uuid) return;

        const pendingFresh =
          pendingExam &&
          Date.now() - Number(pendingExam.createdAt || 0) < 20000;

        if (pendingFresh) {
          rememberExam(pendingExam.subjectSlug, pendingExam.examSlug, {
            label: pendingExam.label,
            uuid
          });

          const route = parseHashRoute();
          if (
            route &&
            (route.kind === 'exam' || route.kind === 'task') &&
            route.subject === pendingExam.subjectSlug &&
            route.exam === pendingExam.examSlug
          ) {
            replaceNamespace({ examUuid: uuid });
          }

          pendingExam = null;
        } else {
          pendingExam = null;
        }

        setTimeout(() => inferExamFromDom(uuid), 0);
      }

      if (url.pathname.endsWith('/v1/public/questions/carousel.json')) {
        if (applyingRoute) return;
        const apiSubject = url.searchParams.get('subject') || '';
        const label = normalizeSpaces(subjectInput()?.value) || lastSelectedSubjectLabel;
        const subject = label
          ? canonicalSubjectSlug(label)
          : asciiRouteSlug(lastSelectedSubjectSlug || apiSubject);
        if (subject && apiSubject) {
          const mappings = getMappings();
          mappings.subjectApi[subject] = apiSubject;
          saveStorage(localStorage, MAP_KEY, mappings);
        }
        const route = parseHashRoute();

        if (subject && (!route || route.kind === 'subject' || route.kind === 'home')) {
          currentQuestionIndex = 1;
          activeQuestionSubject = subject;
          activeExamKey = '';
          writeRoute({
            kind: 'questions',
            subject,
            question: 1,
            material: filterChecked(SELECTORS.filterMaterial),
            noMaterial: filterChecked(SELECTORS.filterNoMaterial)
          }, 'push', { inferredFromApi: true });
        }
      }

      if (url.pathname.endsWith('/v1/public/questions/search.json')) {
        const raw = url.searchParams.get('uuids');
        if (!raw) return;

        const uuids = raw.split(',').map(v => v.trim()).filter(Boolean);
        if (uuids.length) {
          replaceNamespace({ questionUuids: uuids });
        }
      }
    };

    try {
      const observer = new PerformanceObserver(list => {
        for (const entry of list.getEntries()) handleUrl(entry.name);
      });
      observer.observe({ type: 'resource', buffered: true });
    } catch (error) {
      warn('Resource observer unavailable', error);
    }
  }

  function rebuildTaskAnchors() {
    const route = parseHashRoute();
    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) {
      taskAnchors = [];
      taskAnchorExamKey = '';
      return;
    }

    const examKey = `${route.subject}/${route.exam}`;
    const containers = [];
    const seen = new Set();

    for (const heading of document.querySelectorAll(`${SELECTORS.examRoot} h3`)) {
      const container = heading.closest(SELECTORS.examQuestion);
      if (!container || seen.has(container)) continue;
      seen.add(container);
      containers.push(container);
    }

    if (containers.length < 2 || containers.length > 30) {
      taskAnchors = [];
      taskAnchorExamKey = '';
      return;
    }

    const visibleTocNumbers = [...document.querySelectorAll(SELECTORS.tocItem)]
      .map(item => tocNumber(item.textContent))
      .filter(Boolean);

    if (
      visibleTocNumbers.length &&
      visibleTocNumbers.length !== containers.length
    ) {
      taskAnchors = [];
      taskAnchorExamKey = '';
      return;
    }

    taskAnchors = containers.map((element, index) => ({
      task: visibleTocNumbers[index] || String(index + 1),
      element
    }));
    taskAnchorExamKey = examKey;
  }

  function scheduleTaskAnchorRefresh() {
    setTimeout(() => {
      if (!applyingRoute) rebuildTaskAnchors();
    }, 450);
  }

  function detectTaskFromScroll() {
    if (applyingRoute || Date.now() < suppressScrollUntil) return;

    const route = parseHashRoute();
    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) return;

    const examKey = `${route.subject}/${route.exam}`;
    if (taskAnchorExamKey !== examKey || !taskAnchors.length) {
      rebuildTaskAnchors();
    }
    if (!taskAnchors.length) return;

    const threshold = Math.min(220, Math.max(110, window.innerHeight * 0.18));
    let current = null;

    for (const anchor of taskAnchors) {
      if (!anchor.element.isConnected) {
        rebuildTaskAnchors();
        return;
      }
      if (anchor.element.getBoundingClientRect().top <= threshold) {
        current = anchor.task;
      } else {
        break;
      }
    }

    if (!current) {
      if (route.kind === 'task') {
        writeRoute({
          kind: 'exam',
          subject: route.subject,
          exam: route.exam
        }, 'replace', { scrollTracked: true });
      }
      return;
    }

    if (route.kind !== 'task' || String(route.task) !== String(current)) {
      writeRoute({
        kind: 'task',
        subject: route.subject,
        exam: route.exam,
        task: current
      }, 'replace', { scrollTracked: true });
    }
  }

  function scrollHandler() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      scrollTimer = null;
      detectTaskFromScroll();
    }, 140);
  }

  function scheduleApply(reason, state = history.state) {
    if (!shouldHandleLocation(state)) return;
    if (routeEventTimer) clearTimeout(routeEventTimer);

    routeEventTimer = setTimeout(() => {
      routeEventTimer = null;
      const route = managedRouteFromLocation();
      if (route) applyRoute(route, reason);
    }, 0);
  }

  function syncInitialHistoryState() {
    if (location.hash && !location.hash.startsWith(ROUTE_PREFIX)) return;

    const route = parseHashRoute();
    if (!route) return;

    const canonicalUrl = targetUrlForRoute(route);
    if (!hasManagedState()) {
      history.replaceState(
        makeHistoryState(route, { initializedAt: Date.now() }),
        '',
        canonicalUrl
      );
      return;
    }

    // Reload can preserve history.state from an older YO+ build. Always refresh
    // the namespace route and visible URL so legacy .../2026-kevät or encoded
    // %C3%A4 links become the canonical ASCII .../2026-kevat form immediately.
    const base = currentBaseHistoryState();
    const ns = currentNamespace();
    history.replaceState(
      {
        ...base,
        [STATE_NS]: {
          ...ns,
          version: VERSION,
          route
        }
      },
      '',
      canonicalUrl
    );
  }

  function markActiveOrAbort() {
    const root = document.documentElement;
    if (!root) return true;

    const existing = root.getAttribute(ACTIVE_ATTR);
    if (existing) {
      log(`Another distribution is already active (${existing}); this instance will not start.`);
      return false;
    }

    root.setAttribute(ACTIVE_ATTR, VERSION);
    return true;
  }

  function migrateTransientState() {
    try {
      localStorage.removeItem(OLD_UI_KEY);
    } catch {
      // Ignore.
    }
  }

  // Lightweight pure-function hook used only by the repository's Node tests.
  // It is inert in browsers unless a test harness creates this object first.
  if (isPlainObject(globalThis.__YO_KOEKONE_IMPROVED_TEST_HOOK__)) {
    Object.assign(globalThis.__YO_KOEKONE_IMPROVED_TEST_HOOK__, {
      canonicalSubjectSlug,
      canonicalExamSlug,
      asciiRouteSlug,
      parseHashRoute,
      routeToHash,
      routesEqual
    });
    return;
  }

  async function boot() {
    if (location.pathname !== BASE_PATH) return;
    if (!markActiveOrAbort()) return;

    migrateTransientState();
    observeResources();

    document.addEventListener('click', clickHandler, true);
    document.addEventListener('input', inputHandler, true);
    document.addEventListener('change', changeHandler, true);
    window.addEventListener('scroll', scrollHandler, { passive: true });

    window.addEventListener('popstate', event => {
      scheduleApply('popstate', event.state);
    });

    window.addEventListener('hashchange', () => {
      scheduleApply('hashchange', history.state);
    });

    window.addEventListener('pageshow', event => {
      if (!event.persisted) return;
      const route = parseHashRoute();
      if (!route) return;

      if (route.kind === 'questions') {
        currentQuestionIndex = route.question || 1;
        activeQuestionSubject = route.subject;
      } else if (route.kind === 'exam' || route.kind === 'task') {
        activeExamKey = `${route.subject}/${route.exam}`;
        scheduleTaskAnchorRefresh();
      }
    });

    syncInitialHistoryState();

    const route = parseHashRoute();
    if (route && location.hash.startsWith(ROUTE_PREFIX)) {
      if (route.kind === 'questions') currentQuestionIndex = route.question || 1;
      await applyRoute(route, 'initial-load');
    } else if (route?.kind === 'home' && !location.hash) {
      try {
        applyingRoute = true;
        await restoreTransientSelectionState(route, ++routeApplyToken);
      } catch {
        // Transient search restoration is optional; Yle remains usable.
      } finally {
        applyingRoute = false;
      }
    }

    log(`v${VERSION} ready`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
