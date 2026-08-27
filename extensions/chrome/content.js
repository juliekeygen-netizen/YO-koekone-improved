// YO+ for Abitreenit v1.0.1 — standalone generated bundle
// Source order: runtime -> i18n -> i18n-nondom -> settings -> settings-bridge -> settings-effects -> question-sets -> new-tabs -> subtask-links -> core -> title-sync -> study-hub -> ui-customizations -> draft-ui -> drafts -> answer-sync

(() => {
  'use strict';

  // The release build replaces this marker with package.json's version.
  const FEATURE_VERSION = '1.0.1';
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

(() => {
  'use strict';

  const GLOBAL = 'YOPlusI18n';
  if (globalThis[GLOBAL]?.version === 1) return;

  const VERSION = 1;
  const DEFAULT_LANGUAGE = 'fi';
  const SUPPORTED_LANGUAGES = Object.freeze(['fi', 'en', 'sv']);
  const EXTENSION_KEY = 'yoPlusLanguageV1';
  const PAGE_KEY = 'yo-koekone-improved:language:v1';
  const RUNTIME_NS = '__YO_KOEKONE_IMPROVED_V03_RUNTIME__';
  const OWNED_PAGE_SELECTOR = [
    '#__yo_improved_settings_modal__',
    '#__yo_improved_study_hub__',
    '#__yo_improved_exam_favorite__',
    '#__yo_improved_draft_toast__',
    '#__yo_improved_feature_toast__',
    '#__yo_improved_qset_toast__',
    '#__yo_improved_toast__',
    '.yoi-draft-status-row',
    '[data-yoplus-i18n-owned]'
  ].join(',');

  const MESSAGES = Object.freeze({
    brandLegacy: { fi: 'YO+', en: 'YO+', sv: 'YO+' },
    settingsTitle: { fi: 'Asetukset', en: 'Settings', sv: 'Inställningar' },
    settingsPageTitle: { fi: 'YO+ – Asetukset', en: 'YO+ – Settings', sv: 'YO+ – Inställningar' },
    settingsSummary: {
      fi: 'Perusparannukset, kuten URL-seuranta, taustavälilehdet ja välilehtien nimet, ovat aina käytössä. Täällä säädetään vain valinnaisia ominaisuuksia.',
      en: 'Core improvements such as URL tracking, background tabs and tab titles are always enabled. Only optional features are adjusted here.',
      sv: 'Grundförbättringar som URL-spårning, bakgrundsflikar och fliknamn är alltid aktiva. Här justeras bara valfria funktioner.'
    },
    closeSettings: { fi: 'Sulje asetukset', en: 'Close settings', sv: 'Stäng inställningar' },
    language: { fi: 'Kieli', en: 'Language', sv: 'Språk' },
    interfaceLanguage: { fi: 'Käyttöliittymän kieli', en: 'Interface language', sv: 'Gränssnittsspråk' },
    languageHelp: {
      fi: 'Muuttaa vain YO+:n lisäämät tekstit. Ylen sivun sisältöä ei käännetä.',
      en: 'Changes only text added by YO+. Yle page content is not translated.',
      sv: 'Ändrar bara text som YO+ lägger till. Innehåll på Yles sida översätts inte.'
    },
    home: { fi: 'Etusivu', en: 'Home', sv: 'Startsida' },
    practiceShortcuts: { fi: 'Harjoittelun pikavalinnat', en: 'Practice shortcuts', sv: 'Snabbval för övningar' },
    practiceShortcutsHelp: {
      fi: 'Näytä Jatka viimeisintä, viimeksi avatut ja suosikit ennen oppiaineen valintaa.',
      en: 'Show Continue, recent items and favorites before choosing a subject.',
      sv: 'Visa Fortsätt, senast öppnade och favoriter före ämnesvalet.'
    },
    showQuestionPractice: { fi: 'Näytä kysymysharjoittelut pikavalinnoissa', en: 'Show question practice in shortcuts', sv: 'Visa frågeövningar i snabbvalen' },
    showQuestionPracticeHelp: {
      fi: 'Lisää Harjoittele kysymyksillä -sessiot Jatka- ja Viimeksi avatut -kohtiin.',
      en: 'Include Practice with questions sessions in Continue and Recent.',
      sv: 'Lägg till sessioner från Öva med frågor i Fortsätt och Senast öppnade.'
    },
    oneQuestionSession: { fi: 'Vain yksi kysymysharjoittelusessio', en: 'Only one question-practice session', sv: 'Bara en frågeövningssession' },
    oneQuestionSessionHelp: {
      fi: 'Näytä Viimeksi avatuissa vain uusin kysymyssessio, jotta kokeille jää tilaa.',
      en: 'Show only the newest question session in Recent so exams still have room.',
      sv: 'Visa bara den nyaste frågesessionen under Senast öppnade så att prov fortfarande får plats.'
    },
    oneQuestionSessionHelpAlt: {
      fi: 'Näytä viimeksi avatuissa vain uusin kysymyssessio, jotta kokeille jää tilaa.',
      en: 'Show only the newest question session in Recent so exams still have room.',
      sv: 'Visa bara den nyaste frågesessionen under Senast öppnade så att prov fortfarande får plats.'
    },
    recentCount: { fi: 'Viimeksi avattuja', en: 'Recent items', sv: 'Senast öppnade poster' },
    recentCountHelp: {
      fi: 'Kuinka monta riviä näytetään yhteensä kokeista ja kysymysharjoittelusta.',
      en: 'Total number of rows shown for exams and question practice.',
      sv: 'Totalt antal rader som visas för prov och frågeövningar.'
    },
    recentCountHelpAlt: {
      fi: 'Rivien kokonaismäärä kokeista ja kysymysharjoittelusta.',
      en: 'Total number of rows for exams and question practice.',
      sv: 'Totalt antal rader för prov och frågeövningar.'
    },
    answersDrafts: { fi: 'Vastaukset ja luonnokset', en: 'Answers and drafts', sv: 'Svar och utkast' },
    localDraftBackup: { fi: 'Paikallinen luonnostallennus', en: 'Local draft backup', sv: 'Lokal säkerhetskopia av utkast' },
    localDraftBackupHelp: {
      fi: 'Suojaa tarkistamattomat vastaukset tässä välilehdessä. Ylen Tarkista-tallennus säilyy erillisenä.',
      en: 'Protect unchecked answers in this tab. Yle’s checked-answer storage remains separate.',
      sv: 'Skydda okontrollerade svar i den här fliken. Yles lagring av kontrollerade svar förblir separat.'
    },
    localDraftBackupHelpAlt: {
      fi: 'Suojaa tarkistamattomat vastaukset tässä välilehdessä.',
      en: 'Protect unchecked answers in this tab.',
      sv: 'Skydda okontrollerade svar i den här fliken.'
    },
    draftStatus: { fi: 'Luonnoksen tila', en: 'Draft status', sv: 'Utkaststatus' },
    draftStatusAlt: { fi: 'Luonnoksen tilamerkintä', en: 'Draft status indicator', sv: 'Statusmarkering för utkast' },
    draftStatusHelp: {
      fi: 'Näytä Tallennetaan / Tallennettu paikallisesti / Palautettu -merkintä.',
      en: 'Show Saving / Saved locally / Restored status.',
      sv: 'Visa statusen Sparar / Sparad lokalt / Återställd.'
    },
    draftStatusHelpAlt: {
      fi: 'Näytä paikallisen tallennuksen tila tehtävän yhteydessä.',
      en: 'Show local save status next to the task.',
      sv: 'Visa status för lokal lagring vid uppgiften.'
    },
    crossTabWarning: { fi: 'Välilehtiristiriitojen varoitus', en: 'Cross-tab conflict warning', sv: 'Varning för flikkonflikter' },
    crossTabWarningHelp: {
      fi: 'Varoita, jos sama tarkistettu vastaus muuttuu toisessa välilehdessä.',
      en: 'Warn if the same checked answer changes in another tab.',
      sv: 'Varna om samma kontrollerade svar ändras i en annan flik.'
    },
    singleDraftNotePrefix: {
      fi: 'Yksittäisen paikallisen luonnoksen voi poistaa tehtävän tilamerkistä valinnalla',
      en: 'You can remove one local draft from the task status menu with',
      sv: 'Du kan ta bort ett lokalt utkast från uppgiftens statusmeny med'
    },
    singleDraftNoteSuffix: {
      fi: 'Se ei tyhjennä ruudulla näkyvää vastausta.',
      en: 'This does not clear the answer visible on screen.',
      sv: 'Detta rensar inte svaret som visas på skärmen.'
    },
    singleDraftOptionNotePrefix: {
      fi: 'Yksittäisen paikallisen luonnoksen poistaminen tehdään Yo-koekoneessa tehtävän tilamerkistä valinnalla',
      en: 'Remove one local draft in Yo-koekone from the task status indicator with',
      sv: 'Ta bort ett lokalt utkast i Yo-koekone från uppgiftens statusmarkering med'
    },
    singleDraftOptionNoteSuffix: {
      fi: 'Se poistaa vain tämän lisäosan turvakopion eikä tyhjennä ruudulla näkyvää vastausta tai Ylen tarkistettua vastausta.',
      en: 'It removes only this extension’s safety copy and does not clear the visible answer or Yle’s checked answer.',
      sv: 'Det tar bara bort tilläggets säkerhetskopia och rensar inte det synliga svaret eller Yles kontrollerade svar.'
    },
    examsTasks: { fi: 'Kokeet ja tehtävät', en: 'Exams and tasks', sv: 'Prov och uppgifter' },
    exactSubtaskLinks: { fi: 'Tarkat osatehtävälinkit', en: 'Exact sub-task links', sv: 'Exakta länkar till deluppgifter' },
    exactSubtaskLinksHelp: {
      fi: 'Käytä myös reittejä kuten tehtava-1.2, kun Ylen näkyvä kysymysnumero voidaan tunnistaa varmasti.',
      en: 'Use routes such as tehtava-1.2 when Yle’s visible question number can be identified reliably.',
      sv: 'Använd även rutter som tehtava-1.2 när Yles synliga frågenummer kan identifieras säkert.'
    },
    exactSubtaskLinksHelpAlt: {
      fi: 'Mahdollistaa suorat reitit kuten tehtava-1.2, kun osatehtävä voidaan tunnistaa varmasti.',
      en: 'Enables direct routes such as tehtava-1.2 when a sub-task can be identified reliably.',
      sv: 'Möjliggör direkta rutter som tehtava-1.2 när en deluppgift kan identifieras säkert.'
    },
    questionPractice: { fi: 'Kysymysharjoittelu', en: 'Question practice', sv: 'Frågeövning' },
    restoreExactQuestionSet: { fi: 'Palauta täsmälleen sama kysymyssarja', en: 'Restore the exact same question set', sv: 'Återställ exakt samma frågeserie' },
    restoreExactQuestionSetAlt: { fi: 'Palauta sama satunnainen kysymyssarja', en: 'Restore the same randomized question set', sv: 'Återställ samma slumpade frågeserie' },
    restoreExactQuestionSetHelp: {
      fi: 'Säilytä satunnainen kysymyssarja F5:n ja historian läpi; Sekoita luo uuden tallennetun sarjan.',
      en: 'Keep the randomized question set through F5 and browser history; Shuffle creates a new saved set.',
      sv: 'Behåll den slumpade frågeserien genom F5 och webbläsarhistoriken; Blanda skapar en ny sparad serie.'
    },
    restoreExactQuestionSetHelpAlt: {
      fi: 'Säilyttää valitun kysymyssarjan F5:n ja historian jälkeen turvallisesti. Sekoita luo uuden sarjan.',
      en: 'Safely keeps the selected question set after F5 and browser history. Shuffle creates a new set.',
      sv: 'Behåller den valda frågeserien säkert efter F5 och webbläsarhistoriken. Blanda skapar en ny serie.'
    },
    pageCleanup: { fi: 'Sivun siistiminen', en: 'Page cleanup', sv: 'Städa sidan' },
    hideHowItWorks: { fi: 'Piilota “Miten Yo-koekone toimii?”', en: 'Hide “How does Yo-koekone work?”', sv: 'Dölj “Hur fungerar Yo-koekone?”' },
    hideHowItWorksHelp: { fi: 'Piilota etusivun ohjekortti.', en: 'Hide the help card on the start page.', sv: 'Dölj hjälpkortet på startsidan.' },
    hideLoginIntro: { fi: 'Piilota kirjautumisohjeteksti', en: 'Hide the sign-in guidance text', sv: 'Dölj inloggningsinformationen' },
    hideLoginIntroHelp: {
      fi: 'Piilota “Jotta saat harjoittelusta kaiken irti…” -teksti.',
      en: 'Hide the “To get the most out of practice…” text.',
      sv: 'Dölj texten “För att få ut så mycket som möjligt av övningen…”.'
    },
    hideLoginIntroHelpAlt: {
      fi: 'Piilota “Jotta saat harjoittelusta kaiken irti…” -kappale.',
      en: 'Hide the “To get the most out of practice…” paragraph.',
      sv: 'Dölj stycket “För att få ut så mycket som möjligt av övningen…”.'
    },
    hideExamInfo: { fi: 'Piilota kokeen infokortti', en: 'Hide the exam info card', sv: 'Dölj provets informationskort' },
    hideExamInfoHelp: {
      fi: 'Piilota kokeen/kysymysten asettelua koskeva YTL-infokortti.',
      en: 'Hide the YTL information card about exam/question layout.',
      sv: 'Dölj YTL-informationskortet om provets/frågornas layout.'
    },
    hideExamInfoHelpAlt: {
      fi: 'Piilota YTL:n kokeen asettelua koskeva infokortti.',
      en: 'Hide YTL’s information card about exam layout.',
      sv: 'Dölj YTL:s informationskort om provets layout.'
    },
    localData: { fi: 'Paikalliset tiedot', en: 'Local data', sv: 'Lokala data' },
    localDataHelp: {
      fi: 'Nämä poistavat vain YO+:n omia navigointi-/kysymyssarjatietoja. Ylen tilillä oleviin tarkistettuihin vastauksiin ei kosketa.',
      en: 'These actions remove only YO+ navigation/question-set data. Checked answers stored by Yle are not touched.',
      sv: 'Dessa åtgärder tar bara bort YO+:s navigerings-/frågeseriedata. Kontrollerade svar som lagras av Yle påverkas inte.'
    },
    clearRecents: { fi: 'Tyhjennä viimeksi avatut', en: 'Clear recent items', sv: 'Rensa senast öppnade' },
    clearFavorites: { fi: 'Tyhjennä suosikit', en: 'Clear favorites', sv: 'Rensa favoriter' },
    clearQuestionSets: { fi: 'Tyhjennä tallennetut kysymyssarjat', en: 'Clear saved question sets', sv: 'Rensa sparade frågeserier' },
    resetDefaults: { fi: 'Palauta oletukset', en: 'Restore defaults', sv: 'Återställ standardvärden' },
    done: { fi: 'Valmis', en: 'Done', sv: 'Klar' },
    confirmClearRecents: {
      fi: 'Tyhjennetäänkö viimeksi avattujen harjoitusten historia?',
      en: 'Clear the history of recently opened practice sessions?',
      sv: 'Rensa historiken över senast öppnade övningar?'
    },
    confirmClearFavorites: {
      fi: 'Tyhjennetäänkö kaikki YO+:n suosikit?',
      en: 'Clear all YO+ favorites?',
      sv: 'Rensa alla YO+-favoriter?'
    },
    confirmClearQuestionSets: {
      fi: 'Tyhjennetäänkö tallennetut satunnaiset kysymyssarjat?',
      en: 'Clear saved randomized question sets?',
      sv: 'Rensa sparade slumpade frågeserier?'
    },
    confirmClearLocal: { fi: 'Tyhjennetäänkö nämä paikalliset tiedot?', en: 'Clear this local data?', sv: 'Rensa dessa lokala data?' },
    clearing: { fi: 'Tyhjennetään…', en: 'Clearing…', sv: 'Rensar…' },
    cleared: { fi: 'Tyhjennetty', en: 'Cleared', sv: 'Rensat' },
    clearFailed: { fi: 'Tyhjennys epäonnistui', en: 'Clearing failed', sv: 'Rensningen misslyckades' },
    saved: { fi: 'Tallennettu', en: 'Saved', sv: 'Sparat' },
    saveFailed: { fi: 'Tallennus epäonnistui', en: 'Saving failed', sv: 'Det gick inte att spara' },
    defaultsRestored: { fi: 'Oletukset palautettu', en: 'Defaults restored', sv: 'Standardvärden återställda' },
    restoreFailed: { fi: 'Palautus epäonnistui', en: 'Restore failed', sv: 'Återställningen misslyckades' },
    openYo: { fi: 'Avaa Yo-koekone', en: 'Open Yle Abitreenit', sv: 'Öppna Yle Abitreenit' },
    popupHelper: { fi: 'Abitreenit-apuri', en: 'Abitreenit helper', sv: 'Abitreenit-hjälp' },
    popupShortcutsHelp: { fi: 'Jatka, viimeksi avatut ja suosikit', en: 'Continue, recent and favorites', sv: 'Fortsätt, senast öppnade och favoriter' },
    popupLocalDrafts: { fi: 'Paikalliset luonnokset', en: 'Local drafts', sv: 'Lokala utkast' },
    popupLocalDraftsHelp: { fi: 'Suojaa tarkistamattomat vastaukset', en: 'Protect unchecked answers', sv: 'Skydda okontrollerade svar' },
    popupDraftStatusHelp: { fi: 'Näytä tallennusmerkintä tehtävissä', en: 'Show save status in tasks', sv: 'Visa sparstatus i uppgifter' },
    popupTabWarnings: { fi: 'Välilehtivaroitukset', en: 'Tab warnings', sv: 'Flikvarningar' },
    popupTabWarningsHelp: { fi: 'Varoita samasta tarkistetusta vastauksesta', en: 'Warn about the same checked answer', sv: 'Varna om samma kontrollerade svar' },
    allSettings: { fi: 'Kaikki asetukset', en: 'All settings', sv: 'Alla inställningar' },
    reviewedYle: { fi: 'Tarkistettu Ylellä', en: 'Checked by Yle', sv: 'Kontrollerad av Yle' },
    savingLocal: { fi: 'Tallennetaan paikallisesti…', en: 'Saving locally…', sv: 'Sparar lokalt…' },
    draftRestored: { fi: 'Luonnos palautettu', en: 'Draft restored', sv: 'Utkast återställt' },
    draftSavedLocal: { fi: 'Luonnos tallennettu paikallisesti', en: 'Draft saved locally', sv: 'Utkast sparat lokalt' },
    draftSaveFailed: { fi: 'Paikallisen luonnoksen tallennus epäonnistui', en: 'Local draft could not be saved', sv: 'Det lokala utkastet kunde inte sparas' },
    draftSaveFailedHelp: {
      fi: 'Selaimen paikallinen tallennus epäonnistui. Vastaus näkyy edelleen tällä sivulla, mutta YO+ ei voi luvata sen palautumista F5:n jälkeen.',
      en: 'Browser-local saving failed. The answer is still visible on this page, but YO+ cannot guarantee that it will return after F5.',
      sv: 'Den lokala lagringen i webbläsaren misslyckades. Svaret syns fortfarande på sidan, men YO+ kan inte garantera att det återställs efter F5.'
    },
    discardLocalDraft: { fi: 'Poista paikallinen luonnos', en: 'Remove local draft', sv: 'Ta bort lokalt utkast' },
    draftRemovedToast: {
      fi: 'Paikallinen luonnos poistettu. Näkyvää vastausta ei tyhjennetty.',
      en: 'Local draft removed. The visible answer was not cleared.',
      sv: 'Lokalt utkast borttaget. Det synliga svaret rensades inte.'
    },
    draftRemoveFailedToast: {
      fi: 'Paikallisen luonnoksen poistaminen epäonnistui. YO+ ei merkinnyt sitä poistetuksi.',
      en: 'The local draft could not be removed. YO+ did not mark it as deleted.',
      sv: 'Det lokala utkastet kunde inte tas bort. YO+ markerade det inte som borttaget.'
    },
    reviewedDraftHelp: {
      fi: 'Tämä kysymys on Ylen tarkistetussa tilassa. Yle vastaa tarkistetun vastauksen tallennuksesta.',
      en: 'This question is in Yle’s checked state. Yle remains responsible for storing the checked answer.',
      sv: 'Den här frågan är i Yles kontrollerade läge. Yle ansvarar fortsatt för lagringen av det kontrollerade svaret.'
    },
    localDraftHelp: {
      fi: 'Tämä on vain tämän selaimen paikallinen turvakopio tarkistamattomasta vastauksesta. Se ei ole sama asia kuin Ylelle tallennettu tarkistettu vastaus.',
      en: 'This is only a local browser safety copy of an unchecked answer. It is not the same as a checked answer stored by Yle.',
      sv: 'Detta är bara en lokal säkerhetskopia i webbläsaren av ett okontrollerat svar. Det är inte samma sak som ett kontrollerat svar som lagras av Yle.'
    },
    crossTabChangedToast: {
      fi: 'Vastaustila muuttui toisessa Yo-koekone-välilehdessä. Tämä välilehti voi näyttää vanhaa tarkistettua vastausta; paikallisia keskeneräisiä luonnoksia ei ladata automaattisesti uudelleen.',
      en: 'Answer state changed in another Yo-koekone tab. This tab may show an outdated checked answer; unfinished local drafts are not reloaded automatically.',
      sv: 'Svarsläget ändrades i en annan Yo-koekone-flik. Den här fliken kan visa ett gammalt kontrollerat svar; ofärdiga lokala utkast laddas inte om automatiskt.'
    },
    qsetCaptureFailed: {
      fi: 'Kysymyssarjaa ei voitu tallentaa paikallisesti. Tämä harjoituskerta toimii normaalisti, mutta sitä ei voida palauttaa täsmälleen F5:n jälkeen.',
      en: 'The question set could not be saved locally. This practice session still works normally, but it cannot be restored exactly after F5.',
      sv: 'Frågeserien kunde inte sparas lokalt. Den här övningen fungerar fortfarande normalt, men den kan inte återställas exakt efter F5.'
    },
    qsetShuffleFailed: {
      fi: 'Kysymysten sekoitus epäonnistui. Edellinen tallennettu kysymyssarja säilytettiin.',
      en: 'Question shuffling failed. The previous saved question set was kept.',
      sv: 'Blandningen av frågor misslyckades. Den tidigare sparade frågeserien behölls.'
    },
    qsetUnavailable: {
      fi: 'Tallennettua kysymyssarjaa ei voitu palauttaa. Yle käyttää uutta kysymyssarjaa.',
      en: 'The saved question set could not be restored. Yle is using a new question set.',
      sv: 'Den sparade frågeserien kunde inte återställas. Yle använder en ny frågeserie.'
    },
    questionsLabel: { fi: 'Kysymykset', en: 'Questions', sv: 'Frågor' },
    removeFavorite: { fi: 'Poista suosikeista', en: 'Remove from favorites', sv: 'Ta bort från favoriter' },
    addFavorite: { fi: 'Lisää suosikiksi', en: 'Add to favorites', sv: 'Lägg till som favorit' },
    removeExamFavorite: { fi: 'Poista koe suosikeista', en: 'Remove exam from favorites', sv: 'Ta bort provet från favoriter' },
    addExamFavorite: { fi: 'Lisää koe suosikiksi', en: 'Add exam to favorites', sv: 'Lägg till provet som favorit' },
    continueLatest: { fi: 'Jatka viimeisintä', en: 'Continue latest', sv: 'Fortsätt senast' },
    recentOpened: { fi: 'Viimeksi avatut', en: 'Recently opened', sv: 'Senast öppnade' },
    favorites: { fi: 'Suosikit', en: 'Favorites', sv: 'Favoriter' },
    noRecent: { fi: 'Ei vielä avattuja harjoituksia.', en: 'No practice sessions opened yet.', sv: 'Inga övningar har öppnats ännu.' },
    favoriteHint: { fi: 'Lisää kokeita suosikeiksi tähtipainikkeella.', en: 'Add exams to favorites with the star button.', sv: 'Lägg till prov som favoriter med stjärnknappen.' },
    hubAria: { fi: 'YO+ pikavalinnat', en: 'YO+ practice shortcuts', sv: 'YO+ snabbval för övningar' },
    homeTitle: { fi: 'Aloitussivu', en: 'Home', sv: 'Startsida' },
    questionsTitleWord: { fi: 'kysymykset', en: 'questions', sv: 'frågor' }
  });

  // Exact source aliases that should use an existing message without changing
  // the canonical translation table above.
  const ALIASES = Object.freeze({
    'YO-koekone Improved': 'brandLegacy',
    'YO-koekone Improved – Asetukset': 'settingsPageTitle',
    'YO+ – Asetukset': 'settingsPageTitle'
  });

  const reverse = new Map();
  for (const [key, variants] of Object.entries(MESSAGES)) {
    for (const lang of SUPPORTED_LANGUAGES) {
      const text = variants[lang];
      if (typeof text === 'string' && text) reverse.set(text, key);
    }
  }
  for (const [text, key] of Object.entries(ALIASES)) reverse.set(text, key);

  const phraseGroups = Object.freeze([
    { fi: ' – kysymysharjoittelu', en: ' – question practice', sv: ' – frågeövning' },
    { fi: ' — kysymys ', en: ' — question ', sv: ' — fråga ' },
    { fi: ' — Tehtävä ', en: ' — Task ', sv: ' — Uppgift ' },
    { fi: 'Reitin palautus epäonnistui:', en: 'Route restoration failed:', sv: 'Det gick inte att återställa rutten:' }
  ]);

  function normalizeLanguage(value) {
    const lang = String(value || '').trim().toLocaleLowerCase('en-US');
    return SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  }

  function preserveOuterWhitespace(source, translated) {
    const match = String(source).match(/^(\s*)([\s\S]*?)(\s*)$/);
    return match ? `${match[1]}${translated}${match[3]}` : translated;
  }

  function translate(value, targetLanguage = currentLanguage) {
    const source = String(value ?? '');
    if (!source) return source;
    const lang = normalizeLanguage(targetLanguage);
    const core = source.trim();
    if (!core) return source;

    const exactKey = reverse.get(core);
    if (exactKey && MESSAGES[exactKey]?.[lang]) {
      return preserveOuterWhitespace(source, MESSAGES[exactKey][lang]);
    }

    let translated = core;
    for (const group of phraseGroups) {
      const target = group[lang];
      for (const candidate of SUPPORTED_LANGUAGES.map(code => group[code])) {
        if (candidate && translated.includes(candidate)) translated = translated.split(candidate).join(target);
      }
    }
    return translated === core ? source : preserveOuterWhitespace(source, translated);
  }

  function t(key, variables = null, targetLanguage = currentLanguage) {
    const lang = normalizeLanguage(targetLanguage);
    let text = MESSAGES[key]?.[lang] ?? MESSAGES[key]?.[DEFAULT_LANGUAGE] ?? String(key || '');
    if (variables && typeof variables === 'object') {
      text = text.replace(/\{([A-Za-z0-9_]+)\}/g, (_match, name) => String(variables[name] ?? ''));
    }
    return text;
  }

  function safeLocalStorage() {
    try { return globalThis.localStorage || null; } catch { return null; }
  }

  function readPageLanguage() {
    const storage = safeLocalStorage();
    if (!storage) return DEFAULT_LANGUAGE;
    try { return normalizeLanguage(storage.getItem(PAGE_KEY)); }
    catch { return DEFAULT_LANGUAGE; }
  }

  const extensionApi = globalThis.browser?.runtime?.id ? globalThis.browser :
    (globalThis.chrome?.runtime?.id ? globalThis.chrome : null);
  const runtime = globalThis[RUNTIME_NS] || null;
  const extensionPage = Boolean(extensionApi?.runtime?.id && !runtime && typeof location !== 'undefined' && /^(?:chrome|moz)-extension:$/.test(location.protocol));
  let currentLanguage = readPageLanguage();
  const listeners = new Set();
  let translateTimer = null;
  let observer = null;
  let extensionLanguageWriteQueue = Promise.resolve();
  const pendingExtensionLanguageTargets = [];
  let latestLocalLanguageIntent = '';

  function writePageLanguage(lang) {
    const storage = safeLocalStorage();
    if (!storage) return;
    try { storage.setItem(PAGE_KEY, lang); } catch { /* optional local mirror */ }
  }

  async function readExtensionLanguage() {
    if (!extensionApi?.storage?.local) return null;
    try {
      const result = await extensionApi.storage.local.get(EXTENSION_KEY);
      return result?.[EXTENSION_KEY] ? normalizeLanguage(result[EXTENSION_KEY]) : null;
    } catch {
      return null;
    }
  }

  function writeExtensionLanguage(lang) {
    if (!extensionApi?.storage?.local) return Promise.resolve();
    pendingExtensionLanguageTargets.push(lang);
    const write = () => extensionApi.storage.local.set({ [EXTENSION_KEY]: lang });
    const next = extensionLanguageWriteQueue.then(write, write);
    extensionLanguageWriteQueue = next.catch(() => {});
    return next.finally(() => {
      const index = pendingExtensionLanguageTargets.indexOf(lang);
      if (index >= 0) pendingExtensionLanguageTargets.splice(index, 1);
      if (!pendingExtensionLanguageTargets.length) latestLocalLanguageIntent = '';
    });
  }

  function notifyLanguage(previous) {
    if (previous === currentLanguage) return;
    for (const listener of [...listeners]) {
      try { listener(currentLanguage, previous); }
      catch (error) { console.warn('[YO+] Language listener failed', error); }
    }
    try {
      document?.dispatchEvent?.(new CustomEvent('yoplus:language', { detail: { language: currentLanguage, previous } }));
    } catch { /* optional */ }
  }

  function updateLanguage(value, { persistPage = true, persistExtension = false } = {}) {
    const next = normalizeLanguage(value);
    const previous = currentLanguage;
    currentLanguage = next;
    if (persistPage) writePageLanguage(next);
    if (persistExtension) writeExtensionLanguage(next).catch(error => console.warn('[YO+] Could not save language', error));
    applyLanguage();
    notifyLanguage(previous);
    return next;
  }

  function setLanguage(value) {
    const next = normalizeLanguage(value);
    if (extensionApi?.storage?.local) latestLocalLanguageIntent = next;
    return updateLanguage(next, { persistPage: true, persistExtension: Boolean(extensionApi?.storage?.local) });
  }

  function onLanguageChange(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function translateAttribute(element, name) {
    if (!element || typeof element.hasAttribute !== 'function' || !element.hasAttribute(name)) return;
    const current = element.getAttribute(name);
    const next = translate(current);
    if (next !== current) element.setAttribute(name, next);
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      const parent = root.parentElement;
      if (!parent || parent.matches('script,style,textarea,input,code,pre')) return;
      const next = translate(root.nodeValue || '');
      if (next !== root.nodeValue) root.nodeValue = next;
      return;
    }

    const isElement = root.nodeType === 1 && typeof root.querySelectorAll === 'function';
    const isDocument = root.nodeType === 9 && root.documentElement;
    const isFragment = root.nodeType === 11 && typeof root.querySelectorAll === 'function';
    if (!isElement && !isDocument && !isFragment) return;

    if (isElement) {
      for (const attr of ['aria-label', 'title', 'placeholder']) translateAttribute(root, attr);
    }

    const base = isDocument ? root.documentElement : root;
    if (!base) return;
    const walker = document.createTreeWalker(base, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node = walker.currentNode;
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && !parent.matches('script,style,textarea,input,code,pre')) {
          const next = translate(node.nodeValue || '');
          if (next !== node.nodeValue) node.nodeValue = next;
        }
      } else if (node.nodeType === 1 && typeof node.hasAttribute === 'function') {
        for (const attr of ['aria-label', 'title', 'placeholder']) translateAttribute(node, attr);
      }
      node = walker.nextNode();
    }
  }

  function ownedRoots() {
    if (typeof document === 'undefined') return [];
    if (extensionPage) return document.body ? [document.body] : [];
    return [...document.querySelectorAll(OWNED_PAGE_SELECTOR)].filter(element => !element.parentElement?.closest?.(OWNED_PAGE_SELECTOR));
  }

  function syncLanguageSelects() {
    if (typeof document === 'undefined') return;
    for (const select of document.querySelectorAll('[data-yoplus-language-select]')) {
      if (String(select?.tagName || '').toUpperCase() === 'SELECT' && select.value !== currentLanguage) {
        select.value = currentLanguage;
      }
    }
  }

  function injectLanguageStyle() {
    if (typeof document === 'undefined' || !document.head || document.getElementById('__yoplus_language_style__')) return;
    const style = document.createElement('style');
    style.id = '__yoplus_language_style__';
    style.textContent = `
      .yoplus-language-select{min-width:132px;border:1px solid #56585b;border-radius:8px;background:#111214;color:#fff;padding:8px 10px;font:700 12px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
      .yoplus-language-select:focus-visible{outline:2px solid #ffb1a2;outline-offset:2px}
    `;
    document.head.appendChild(style);
  }

  function makeLanguageSection(kind) {
    const section = document.createElement('section');
    section.dataset.yoplusI18nOwned = '1';
    section.dataset.yoplusLanguageSection = kind;
    if (kind === 'options') section.className = 'featured';

    const heading = document.createElement(kind === 'options' ? 'h2' : 'h3');
    heading.textContent = 'Kieli';

    const label = document.createElement('label');
    const copy = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = 'Käyttöliittymän kieli';
    const description = document.createElement('small');
    description.textContent = 'Muuttaa vain YO+:n lisäämät tekstit. Ylen sivun sisältöä ei käännetä.';
    copy.append(title, description);

    const select = document.createElement('select');
    select.className = 'yoplus-language-select';
    select.dataset.yoplusLanguageSelect = '';
    select.setAttribute('aria-label', 'Käyttöliittymän kieli');
    for (const [value, text] of [['fi', 'Suomi'], ['en', 'English'], ['sv', 'Svenska']]) {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    }

    select.value = currentLanguage;
    select.addEventListener('change', () => setLanguage(select.value));
    label.append(copy, select);
    section.append(heading, label);
    return section;
  }

  function injectPageSettingsLanguage() {
    if (typeof document === 'undefined') return;
    const modal = document.getElementById('__yo_improved_settings_modal__');
    if (!modal || modal.querySelector('[data-yoplus-language-section="modal"]')) return;
    const body = modal.querySelector('.yoi-settings-body');
    if (!body) return;
    body.prepend(makeLanguageSection('modal'));
    injectLanguageStyle();
    translateTree(modal);
    syncLanguageSelects();
  }

  function injectOptionsLanguage() {
    if (!extensionPage || typeof document === 'undefined') return;
    const grid = document.querySelector('.grid');
    if (!grid || grid.querySelector('[data-yoplus-language-section="options"]')) return;
    grid.prepend(makeLanguageSection('options'));
    injectLanguageStyle();
    translateTree(document.body);
    syncLanguageSelects();
  }

  function translateExtensionTitle() {
    if (!extensionPage || typeof document === 'undefined') return;
    const next = translate(document.title);
    if (next !== document.title) document.title = next;
    document.documentElement.lang = currentLanguage;
  }

  function applyLanguage() {
    if (typeof document === 'undefined') return;
    injectPageSettingsLanguage();
    injectOptionsLanguage();
    for (const root of ownedRoots()) translateTree(root);
    syncLanguageSelects();
    translateExtensionTitle();
  }

  function scheduleApply() {
    if (translateTimer) clearTimeout(translateTimer);
    translateTimer = setTimeout(() => {
      translateTimer = null;
      applyLanguage();
    }, 0);
  }

  function elementLike(node) {
    return Boolean(node && node.nodeType === 1 && typeof node.matches === 'function');
  }

  function mutationTouchesOwned(record) {
    if (extensionPage) return true;
    const target = record.target?.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
    if (elementLike(target) && target.closest?.(OWNED_PAGE_SELECTOR)) return true;
    for (const node of record.addedNodes || []) {
      if (!elementLike(node)) continue;
      if (node.matches(OWNED_PAGE_SELECTOR) || node.querySelector?.(OWNED_PAGE_SELECTOR) || node.closest?.(OWNED_PAGE_SELECTOR)) return true;
    }
    return false;
  }

  function startObserver() {
    if (typeof document === 'undefined') return;
    if (!document.documentElement) return setTimeout(startObserver, 20);
    observer = new MutationObserver(records => {
      const modalAdded = records.some(record => [...record.addedNodes].some(node =>
        elementLike(node) && (node.id === '__yo_improved_settings_modal__' || node.querySelector?.('#__yo_improved_settings_modal__'))
      ));
      if (modalAdded) injectPageSettingsLanguage();
      if (records.some(mutationTouchesOwned)) scheduleApply();
      if (extensionPage && records.some(record => {
        const target = record.target?.nodeType === Node.TEXT_NODE ? record.target.parentElement : record.target;
        return elementLike(target) && target.closest?.('title');
      })) scheduleApply();
    });
    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['aria-label', 'title', 'placeholder']
    });
    applyLanguage();
  }

  if (runtime) {
    runtime.i18n = { version: VERSION, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, MESSAGES };
    runtime.t = t;
    runtime.translateUiText = translate;
    runtime.getLanguage = () => currentLanguage;
    runtime.setLanguage = setLanguage;
    runtime.onLanguageChange = onLanguageChange;
    runtime.translateOwnedUi = applyLanguage;
  }

  const publicApi = Object.freeze({
    version: VERSION,
    SUPPORTED_LANGUAGES,
    DEFAULT_LANGUAGE,
    MESSAGES,
    normalizeLanguage,
    translate,
    t,
    getLanguage: () => currentLanguage,
    setLanguage,
    onLanguageChange,
    applyLanguage
  });
  globalThis[GLOBAL] = publicApi;

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once: true });
    else startObserver();
  }

  addEventListener?.('storage', event => {
    if (event.storageArea !== safeLocalStorage() || event.key !== PAGE_KEY) return;
    updateLanguage(event.newValue || DEFAULT_LANGUAGE, { persistPage: false, persistExtension: false });
  });

  if (extensionApi?.storage?.local) {
    let extensionStorageRevision = 0;
    try {
      extensionApi.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes?.[EXTENSION_KEY]) return;
        extensionStorageRevision++;
        const incoming = normalizeLanguage(changes[EXTENSION_KEY].newValue || DEFAULT_LANGUAGE);
        const olderLocalEcho = Boolean(
          latestLocalLanguageIntent && incoming !== latestLocalLanguageIntent &&
          pendingExtensionLanguageTargets.includes(incoming)
        );
        if (olderLocalEcho) return;
        updateLanguage(incoming, { persistPage: true, persistExtension: false });
      });
    } catch { /* optional */ }

    const revisionAtRead = extensionStorageRevision;
    readExtensionLanguage().then(value => {
      // A storage.onChanged event received while the startup read was in flight
      // is newer than that read result. Never roll the UI back to stale language.
      if (extensionStorageRevision !== revisionAtRead) return;
      if (value) updateLanguage(value, { persistPage: true, persistExtension: false });
      else writePageLanguage(currentLanguage);
    });
  }
})();

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

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;

  const PAGE_KEY = 'yo-koekone-improved:settings:v1';
  const EXT_KEY = 'yoKoekoneImprovedSettingsV1';
  const EXT_PATCH_MESSAGE = 'yo-koekone-improved:patch-settings';
  const EXT_REPLACE_MESSAGE = 'yo-koekone-improved:replace-settings';
  const ALWAYS_ON = new Set(['scrollTaskUrl', 'modifiedClicks', 'tabTitles']);
  const DEFAULTS = Object.freeze({
    localDrafts: true,
    draftStatus: true,
    crossTabWarnings: true,
    studyHub: true,
    showQuestionPracticeInHub: true,
    singleQuestionPracticeRecent: true,
    exactQuestionSetRestore: true,
    subtaskLinks: true,
    hideHowItWorks: false,
    hideLoginIntro: false,
    hideExamDisclaimer: false,
    recentLimit: 5
  });

  const BOOL_KEYS = new Set(Object.keys(DEFAULTS).filter(key => typeof DEFAULTS[key] === 'boolean'));
  const listeners = new Set();
  const extensionApi = globalThis.browser?.runtime?.id ? globalThis.browser :
    (globalThis.chrome?.runtime?.id ? globalThis.chrome : null);
  let extensionMutationQueue = Promise.resolve();

  function clean(raw) {
    const out = { ...DEFAULTS };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const key of BOOL_KEYS) if (typeof raw[key] === 'boolean') out[key] = raw[key];
    const recent = Number(raw.recentLimit);
    if (Number.isFinite(recent)) out.recentLimit = Math.min(10, Math.max(1, Math.round(recent)));
    return out;
  }

  function readPage() {
    try { return clean(JSON.parse(localStorage.getItem(PAGE_KEY) || '{}')); }
    catch { return { ...DEFAULTS }; }
  }

  let settings = readPage();

  function writePage(next) {
    try { localStorage.setItem(PAGE_KEY, JSON.stringify(next)); }
    catch (error) { console.warn('[YO-koekone Improved] Could not save settings', error); }
  }

  function queueExtensionMutation(type, payload) {
    if (!extensionApi?.storage?.local) return;
    const message = { type, ...(payload || {}) };
    const write = async () => {
      try {
        if (extensionApi.runtime?.sendMessage) {
          const response = await extensionApi.runtime.sendMessage(message);
          if (response?.ok) return;
        }
      } catch (error) {
        console.warn('[YO-koekone Improved] Background settings mutation failed; using storage fallback', error);
      }

      // Fallback only: current Chrome/Firefox distributions route writes through
      // the background worker so every tab/popup/Options page shares one queue.
      // If messaging is unexpectedly unavailable, preserve functionality with a
      // newest-snapshot merge instead of silently dropping the setting change.
      try {
        if (type === EXT_REPLACE_MESSAGE) {
          await extensionApi.storage.local.set({ [EXT_KEY]: clean(message.settings) });
          return;
        }
        const current = await extensionGet();
        await extensionApi.storage.local.set({ [EXT_KEY]: clean({ ...current, ...(message.patch || {}) }) });
      } catch (error) {
        console.warn('[YO-koekone Improved] Could not save extension settings', error);
      }
    };
    extensionMutationQueue = extensionMutationQueue.then(write, write);
  }

  function notify(previous) {
    for (const listener of [...listeners]) {
      try { listener({ ...settings }, previous ? { ...previous } : null); }
      catch (error) { console.warn('[YO-koekone Improved] Settings listener failed', error); }
    }
    try {
      document.dispatchEvent(new CustomEvent('yo-koekone-improved:settings', { detail: { ...settings } }));
    } catch { /* optional */ }
  }

  function apply(next, { persistPage = true } = {}) {
    const previous = settings;
    settings = clean(next);
    rt.settings = settings;
    if (persistPage) writePage(settings);
    notify(previous);
    return settings;
  }

  function getSetting(key) {
    if (ALWAYS_ON.has(key)) return true;
    return key in settings ? settings[key] : DEFAULTS[key];
  }

  function setSetting(key, value) {
    if (ALWAYS_ON.has(key) || !(key in DEFAULTS)) return settings;
    const next = clean({ ...settings, [key]: BOOL_KEYS.has(key) ? Boolean(value) : value });
    apply(next, { persistPage: true });
    if (extensionApi) queueExtensionMutation(EXT_PATCH_MESSAGE, { patch: { [key]: next[key] } });
    return settings;
  }

  function setSettings(patch) {
    const filtered = {};
    for (const [key, value] of Object.entries(patch || {})) {
      if (ALWAYS_ON.has(key) || !(key in DEFAULTS)) continue;
      filtered[key] = value;
    }
    const next = clean({ ...settings, ...filtered });
    apply(next, { persistPage: true });
    if (extensionApi) {
      const persistedPatch = {};
      for (const key of Object.keys(filtered)) persistedPatch[key] = next[key];
      queueExtensionMutation(EXT_PATCH_MESSAGE, { patch: persistedPatch });
    }
    return settings;
  }

  function resetSettings() {
    const next = apply({ ...DEFAULTS }, { persistPage: true });
    if (extensionApi) queueExtensionMutation(EXT_REPLACE_MESSAGE, { settings: next });
    return next;
  }

  function onSettingsChange(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function extensionGet() {
    if (!extensionApi?.storage?.local) return Promise.resolve(null);
    return new Promise(resolve => {
      let settled = false;
      const done = value => {
        if (settled) return;
        settled = true;
        resolve(value?.[EXT_KEY] || null);
      };
      try {
        const maybe = extensionApi.storage.local.get(EXT_KEY, done);
        if (maybe?.then) maybe.then(done, () => done(null));
      } catch {
        try { extensionApi.storage.local.get(EXT_KEY).then(done, () => done(null)); }
        catch { done(null); }
      }
    });
  }

  function renderSettingsModal() {
    const existing = document.getElementById('__yo_improved_settings_modal__');
    try { existing?._yoiCleanup?.(); } catch { /* optional */ }
    existing?.remove();
    if (!document.body) return;
    const previousFocus = document.activeElement && typeof document.activeElement.focus === 'function' ? document.activeElement : null;

    const backdrop = document.createElement('div');
    backdrop.id = '__yo_improved_settings_modal__';
    backdrop.innerHTML = `
      <div class="yoi-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="yoi-settings-title" aria-describedby="yoi-settings-summary">
        <div class="yoi-settings-head">
          <div>
            <div class="yoi-settings-kicker">YO+</div>
            <h2 id="yoi-settings-title">Asetukset</h2>
            <p id="yoi-settings-summary" class="yoi-settings-summary">Perusparannukset, kuten URL-seuranta, taustavälilehdet ja välilehtien nimet, ovat aina käytössä. Täällä säädetään vain valinnaisia ominaisuuksia.</p>
          </div>
          <button type="button" class="yoi-settings-close" aria-label="Sulje asetukset">×</button>
        </div>
        <div class="yoi-settings-body">
          <section><h3>Etusivu</h3>
            <label><span><b>Harjoittelun pikavalinnat</b><small>Näytä Jatka viimeisintä, viimeksi avatut ja suosikit ennen oppiaineen valintaa.</small></span><input type="checkbox" data-setting="studyHub"></label>
            <label data-home-dependent><span><b>Näytä kysymysharjoittelut pikavalinnoissa</b><small>Lisää Harjoittele kysymyksillä -sessiot Jatka- ja Viimeksi avatut -kohtiin.</small></span><input type="checkbox" data-setting="showQuestionPracticeInHub"></label>
            <label data-question-session-detail><span><b>Vain yksi kysymysharjoittelusessio</b><small>Näytä Viimeksi avatuissa vain uusin kysymyssessio, jotta kokeille jää tilaa.</small></span><input type="checkbox" data-setting="singleQuestionPracticeRecent"></label>
            <div class="yoi-settings-number" data-home-dependent><span><b>Viimeksi avattuja</b><small>Kuinka monta riviä näytetään yhteensä kokeista ja kysymysharjoittelusta.</small></span><input type="number" min="1" max="10" step="1" data-setting-number="recentLimit"></div>
          </section>
          <section><h3>Vastaukset ja luonnokset</h3>
            <label><span><b>Paikallinen luonnostallennus</b><small>Suojaa tarkistamattomat vastaukset tässä välilehdessä. Ylen Tarkista-tallennus säilyy erillisenä.</small></span><input type="checkbox" data-setting="localDrafts"></label>
            <label data-draft-dependent><span><b>Luonnoksen tila</b><small>Näytä Tallennetaan / Tallennettu paikallisesti / Palautettu -merkintä.</small></span><input type="checkbox" data-setting="draftStatus"></label>
            <label><span><b>Välilehtiristiriitojen varoitus</b><small>Varoita, jos sama tarkistettu vastaus muuttuu toisessa välilehdessä.</small></span><input type="checkbox" data-setting="crossTabWarnings"></label>
            <p class="yoi-settings-note">Yksittäisen paikallisen luonnoksen voi poistaa tehtävän tilamerkistä valinnalla <b>Poista paikallinen luonnos</b>. Se ei tyhjennä ruudulla näkyvää vastausta.</p>
          </section>
          <section><h3>Kokeet ja tehtävät</h3>
            <label><span><b>Tarkat osatehtävälinkit</b><small>Käytä myös reittejä kuten tehtava-1.2, kun Ylen näkyvä kysymysnumero voidaan tunnistaa varmasti.</small></span><input type="checkbox" data-setting="subtaskLinks"></label>
          </section>
          <section><h3>Kysymysharjoittelu</h3>
            <label><span><b>Palauta täsmälleen sama kysymyssarja</b><small>Säilytä satunnainen kysymyssarja F5:n ja historian läpi; Sekoita luo uuden tallennetun sarjan.</small></span><input type="checkbox" data-setting="exactQuestionSetRestore"></label>
          </section>
          <section><h3>Sivun siistiminen</h3>
            <label><span><b>Piilota “Miten Yo-koekone toimii?”</b><small>Piilota etusivun ohjekortti.</small></span><input type="checkbox" data-setting="hideHowItWorks"></label>
            <label><span><b>Piilota kirjautumisohjeteksti</b><small>Piilota “Jotta saat harjoittelusta kaiken irti…” -teksti.</small></span><input type="checkbox" data-setting="hideLoginIntro"></label>
            <label><span><b>Piilota kokeen infokortti</b><small>Piilota kokeen/kysymysten asettelua koskeva YTL-infokortti.</small></span><input type="checkbox" data-setting="hideExamDisclaimer"></label>
          </section>
          <section><h3>Paikalliset tiedot</h3>
            <p class="yoi-settings-note">Nämä poistavat vain YO+:n omia navigointi-/kysymyssarjatietoja. Ylen tilillä oleviin tarkistettuihin vastauksiin ei kosketa.</p>
            <div class="yoi-settings-actions">
              <button type="button" data-data-action="recents">Tyhjennä viimeksi avatut</button>
              <button type="button" data-data-action="favorites">Tyhjennä suosikit</button>
              <button type="button" data-data-action="question-sets">Tyhjennä tallennetut kysymyssarjat</button>
            </div>
          </section>
        </div>
        <div class="yoi-settings-foot">
          <button type="button" class="yoi-settings-reset">Palauta oletukset</button>
          <button type="button" class="yoi-settings-done">Valmis</button>
        </div>
      </div>`;

    const style = document.createElement('style');
    style.textContent = `
      #__yo_improved_settings_modal__{position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.72);display:grid;place-items:center;padding:20px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5}
      .yoi-settings-dialog{width:min(760px,100%);max-height:min(88vh,920px);overflow:hidden;background:#171819;border:1px solid #3a3b3d;border-radius:14px;box-shadow:0 24px 80px rgba(0,0,0,.55);display:flex;flex-direction:column}
      .yoi-settings-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:22px 24px 15px;border-bottom:1px solid #303133}.yoi-settings-kicker{font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#ff9b88}.yoi-settings-head h2{margin:4px 0 0;font-size:26px}.yoi-settings-summary{max-width:590px;margin:7px 0 0;color:#aeb0b2;font-size:12px;line-height:1.45}.yoi-settings-close{border:0;background:transparent;color:#fff;font-size:30px;line-height:1;cursor:pointer;padding:2px 8px;border-radius:6px}
      .yoi-settings-body{overflow:auto;padding:12px 24px 20px}.yoi-settings-body section{padding:12px 0 16px;border-bottom:1px solid #2c2d2f}.yoi-settings-body section:last-child{border-bottom:0}.yoi-settings-body h3{margin:0 0 7px;font-size:15px;color:#ffb2a4}.yoi-settings-body label,.yoi-settings-number{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:10px 0;cursor:pointer}.yoi-settings-body label span,.yoi-settings-number span{display:grid;gap:2px}.yoi-settings-body b{font-size:14px}.yoi-settings-body small,.yoi-settings-note{font-size:12px;line-height:1.45;color:#b8b9bb}.yoi-settings-note{margin:7px 0 0}.yoi-settings-body input[type=checkbox]{width:20px;height:20px;accent-color:#ff8f7c;flex:0 0 auto}.yoi-settings-body input[type=number]{width:72px;border:1px solid #55575a;border-radius:7px;background:#111;color:#fff;padding:7px 8px}.yoi-settings-body input:disabled{opacity:.45;cursor:not-allowed}.yoi-settings-body label:has(input:disabled),.yoi-settings-number:has(input:disabled){opacity:.55;cursor:default}
      .yoi-settings-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.yoi-settings-actions button{border:1px solid #5d5f62;border-radius:999px;background:#202123;color:#f4f4f4;padding:7px 11px;font:700 12px/1.2 inherit;cursor:pointer}.yoi-settings-actions button:hover:not(:disabled){background:#2a2b2d}.yoi-settings-actions button:disabled{opacity:.62;cursor:default}.yoi-settings-foot{display:flex;justify-content:space-between;gap:12px;padding:15px 24px 20px;border-top:1px solid #303133}.yoi-settings-foot button{border:1px solid #666;border-radius:999px;padding:9px 15px;background:transparent;color:#fff;font-weight:700;cursor:pointer}.yoi-settings-done{background:#f5f5f5!important;color:#111!important;border-color:#f5f5f5!important}#__yo_improved_settings_modal__ button:focus-visible,#__yo_improved_settings_modal__ input:focus-visible{outline:2px solid #ffad9e;outline-offset:2px}
      @media(max-width:560px){.yoi-settings-head,.yoi-settings-body,.yoi-settings-foot{padding-left:16px;padding-right:16px}.yoi-settings-body label,.yoi-settings-number{align-items:flex-start}.yoi-settings-dialog{max-height:94vh}}
    `;
    backdrop.prepend(style);

    const syncControls = () => {
      for (const input of backdrop.querySelectorAll('[data-setting]')) input.checked = Boolean(getSetting(input.dataset.setting));
      const number = backdrop.querySelector('[data-setting-number="recentLimit"]');
      if (number) number.value = String(getSetting('recentLimit'));

      const hubEnabled = getSetting('studyHub') !== false;
      const questionsInHub = hubEnabled && getSetting('showQuestionPracticeInHub') !== false;
      const questionToggle = backdrop.querySelector('[data-setting="showQuestionPracticeInHub"]');
      if (questionToggle) questionToggle.disabled = !hubEnabled;
      const sessionDetail = backdrop.querySelector('[data-setting="singleQuestionPracticeRecent"]');
      if (sessionDetail) sessionDetail.disabled = !questionsInHub;
      if (number) number.disabled = !hubEnabled;

      const draftStatus = backdrop.querySelector('[data-setting="draftStatus"]');
      if (draftStatus) draftStatus.disabled = getSetting('localDrafts') === false;
    };
    syncControls();

    backdrop.addEventListener('change', event => {
      const input = event?.target;
      if (!input || String(input.tagName || '').toUpperCase() !== 'INPUT') return;
      if (input.dataset.setting) setSetting(input.dataset.setting, input.checked);
      if (input.dataset.settingNumber) setSetting(input.dataset.settingNumber, Number(input.value));
      syncControls();
    });

    let closed = false;
    let offSettings = () => {};
    const onKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusables = [...backdrop.querySelectorAll('button:not(:disabled),input:not(:disabled),a[href],[tabindex]:not([tabindex="-1"])')]
        .filter(el => el && typeof el.focus === 'function' && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const cleanup = () => {
      window.removeEventListener('keydown', onKeyDown, true);
      offSettings();
      offSettings = () => {};
    };
    const close = () => {
      if (closed) return;
      closed = true;
      cleanup();
      backdrop.remove();
      try { if (previousFocus?.isConnected) previousFocus.focus?.(); } catch { /* optional */ }
    };
    backdrop._yoiCleanup = cleanup;
    window.addEventListener('keydown', onKeyDown, true);
    offSettings = onSettingsChange(syncControls);

    backdrop.querySelector('.yoi-settings-close')?.addEventListener('click', close);
    backdrop.querySelector('.yoi-settings-done')?.addEventListener('click', close);
    backdrop.querySelector('.yoi-settings-reset')?.addEventListener('click', () => {
      resetSettings();
      syncControls();
    });
    backdrop.addEventListener('click', event => { if (event.target === backdrop) close(); });

    for (const button of backdrop.querySelectorAll('[data-data-action]')) {
      button.addEventListener('click', async () => {
        const action = button.getAttribute('data-data-action');
        const labels = {
          recents: 'Tyhjennetäänkö viimeksi avattujen harjoitusten historia?',
          favorites: 'Tyhjennetäänkö kaikki YO+:n suosikit?',
          'question-sets': 'Tyhjennetäänkö tallennetut satunnaiset kysymyssarjat?'
        };
        if (!confirm(labels[action] || 'Tyhjennetäänkö nämä paikalliset tiedot?')) return;
        const originalText = button.textContent;
        button.disabled = true;
        button.textContent = 'Tyhjennetään…';
        try {
          if (action === 'recents') await rt.clearExamRecents?.();
          else if (action === 'favorites') await rt.clearExamFavorites?.();
          else if (action === 'question-sets') await rt.clearSavedQuestionSets?.();
          button.textContent = 'Tyhjennetty';
        } catch (error) {
          console.warn('[YO-koekone Improved] Could not clear local data', error);
          button.textContent = 'Tyhjennys epäonnistui';
          setTimeout(() => {
            if (!button.isConnected) return;
            button.textContent = originalText;
            button.disabled = false;
          }, 1800);
        }
      });
    }

    document.body.appendChild(backdrop);
    backdrop.querySelector('.yoi-settings-close')?.focus();
  }

  rt.SETTINGS_PAGE_KEY = PAGE_KEY;
  rt.SETTINGS_EXTENSION_KEY = EXT_KEY;
  rt.ALWAYS_ON_SETTINGS = ALWAYS_ON;
  rt.DEFAULT_SETTINGS = DEFAULTS;
  rt.settings = settings;
  rt.getSetting = getSetting;
  rt.setSetting = setSetting;
  rt.setSettings = setSettings;
  rt.resetSettings = resetSettings;
  rt.onSettingsChange = onSettingsChange;
  rt.openSettings = renderSettingsModal;

  // Page storage is also the bridge used by the MAIN-world public-carousel
  // adapter. Persisting the cleaned object also migrates obsolete optional
  // switches (the always-on core behaviors) out of legacy page settings.
  writePage(settings);

  let readyResolve;
  rt.settingsReady = new Promise(resolve => { readyResolve = resolve; });

  if (extensionApi?.storage?.local) {
    let extensionStorageRevision = 0;
    try {
      extensionApi.storage.onChanged.addListener((changes, area) => {
        if (area !== 'local' || !changes?.[EXT_KEY]) return;
        extensionStorageRevision++;
        apply(changes[EXT_KEY].newValue || DEFAULTS, { persistPage: true });
      });
    } catch { /* optional */ }

    const revisionAtRead = extensionStorageRevision;
    extensionGet().then(value => {
      // A storage change received while the initial async read was in flight is
      // newer than that read result. The change listener already applied it, so
      // never roll this tab's runtime/page bridge back to the stale snapshot.
      if (extensionStorageRevision === revisionAtRead) {
        if (value) apply(clean(value), { persistPage: true });
        else apply(DEFAULTS, { persistPage: true });
      }

      if (value) {
        // Never replace extension storage with the snapshot we just read: another
        // tab/Options page may have changed a sibling setting before this async
        // startup read completed. An empty centralized patch safely removes only
        // obsolete keys against the background worker's latest snapshot.
        const needsMigration = [...ALWAYS_ON].some(key => Object.prototype.hasOwnProperty.call(value, key));
        if (needsMigration) queueExtensionMutation(EXT_PATCH_MESSAGE, { patch: {} });
      }
      // A missing key means a fresh/default extension profile. Do not import
      // possibly stale page-origin settings and do not create a startup writer.
      readyResolve?.(settings);
    });
  } else {
    // Tampermonkey/page-local settings are shared by all same-origin tabs.
    // storage events keep already-open instances synchronized without reload.
    addEventListener('storage', event => {
      if (event.storageArea !== localStorage || event.key !== PAGE_KEY) return;
      let next = DEFAULTS;
      try { next = JSON.parse(event.newValue || '{}'); } catch { /* defaults */ }
      apply(next, { persistPage: false });
    });
    readyResolve?.(settings);
  }

  if (typeof GM_registerMenuCommand === 'function') {
    try { GM_registerMenuCommand('YO+ – Asetukset', renderSettingsModal); }
    catch { /* optional */ }
  }
})();

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;

  const SOURCE = 'yo-koekone-improved-settings';
  const extensionRuntime = globalThis.browser?.runtime?.id || globalThis.chrome?.runtime?.id;
  let lastValue = null;

  function post() {
    const value = rt.getSetting?.('exactQuestionSetRestore') !== false;
    if (value === lastValue) return;
    lastValue = value;
    try {
      window.postMessage({
        source: SOURCE,
        type: 'settings-sync',
        exactQuestionSetRestore: value
      }, '*');
    } catch { /* optional bridge; page storage remains a fallback */ }
  }

  // Packaged extensions read storage.local asynchronously. Do not announce the
  // page-origin fallback until that read has settled, otherwise a setting changed
  // from the extension Options page while Yle was closed could be stale for the
  // first carousel request after reopening. Userscripts resolve immediately.
  if (extensionRuntime && rt.settingsReady?.then) {
    rt.settingsReady.then(post, post);
  } else {
    post();
  }

  rt.onSettingsChange?.(post);
})();

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

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const {
    SELECTORS, BASE_PATH, normalizeSpaces, canonicalSubjectSlug, canonicalExamSlug,
    parseRoute, routeToHash, isNewTabGesture, backToSelectionRoute
  } = rt;

  const BACKGROUND_TAB_MESSAGE = 'yo-koekone-improved:open-background-tab';
  let lastOpenedSignature = '';
  let lastOpenedAt = 0;
  let backRestoreToken = 0;

  function listboxInputForOption(option) {
    const menu = option?.closest('[role="listbox"]');
    if (!menu?.id) return null;
    try { return document.querySelector(`input[aria-controls="${CSS.escape(menu.id)}"]`); }
    catch { return [...document.querySelectorAll('input[aria-controls]')].find(i => i.getAttribute('aria-controls') === menu.id) || null; }
  }

  function subjectInput() { return document.querySelector(SELECTORS.subjectInput); }

  function currentSubject() {
    const route = parseRoute();
    if (route?.subject) return route.subject;
    const label = normalizeSpaces(subjectInput()?.value);
    return label ? canonicalSubjectSlug(label) : '';
  }

  function filterChecked(selector) {
    const el = document.querySelector(selector);
    if (!el) return false;
    if ('checked' in el) return Boolean(el.checked);
    return el.getAttribute('aria-checked') === 'true';
  }

  function taskNumber(text) {
    return normalizeSpaces(text).match(/Tehtävä\s+(\d+(?:\.\d+)?)/i)?.[1] || null;
  }

  function routeForTarget(target) {
    const option = target.closest?.('[role="option"]');
    if (option) {
      const input = listboxInputForOption(option);
      const label = normalizeSpaces(option.textContent);
      if (!input || !label) return null;
      if (input.matches(SELECTORS.subjectInput)) {
        return { kind: 'subject', subject: canonicalSubjectSlug(label) };
      }
      const subjectLabel = normalizeSpaces(subjectInput()?.value);
      const subject = currentSubject() || canonicalSubjectSlug(subjectLabel);
      if (!subject) return null;
      return { kind: 'exam', subject, exam: canonicalExamSlug(label, subjectLabel) };
    }

    const toc = target.closest?.(SELECTORS.tocItem);
    if (toc) {
      const route = parseRoute();
      const task = taskNumber(toc.textContent);
      if (!route || !task || (route.kind !== 'exam' && route.kind !== 'task')) return null;
      return { kind: 'task', subject: route.subject, exam: route.exam, task };
    }

    if (target.closest?.(SELECTORS.backToExamSelection)) {
      return backToSelectionRoute(parseRoute(), currentSubject());
    }

    if (target.closest?.(SELECTORS.submitQuestions)) {
      const subject = currentSubject();
      if (!subject) return null;
      return {
        kind: 'questions', subject, question: 1,
        material: filterChecked(SELECTORS.filterMaterial),
        noMaterial: filterChecked(SELECTORS.filterNoMaterial)
      };
    }
    return null;
  }

  function routeUrl(route) {
    return `${location.origin}${BASE_PATH}${routeToHash(route)}`;
  }

  function tryUserscriptBackgroundTab(url) {
    if (typeof GM_openInTab !== 'function') return false;
    try {
      GM_openInTab(url, {
        active: false,
        insert: true,
        setParent: true
      });
      return true;
    } catch (error) {
      console.warn('[YO-koekone Improved] GM_openInTab failed; using browser fallback.', error);
      return false;
    }
  }

  function tryExtensionBackgroundTab(url) {
    const extensionRuntime = globalThis.browser?.runtime || globalThis.chrome?.runtime;
    if (!extensionRuntime?.id || typeof extensionRuntime.sendMessage !== 'function') return null;

    try {
      const result = extensionRuntime.sendMessage({
        type: BACKGROUND_TAB_MESSAGE,
        url
      });
      return Promise.resolve(result).then(response => Boolean(response?.ok), error => {
        console.warn('[YO-koekone Improved] Extension background-tab request failed.', error);
        return false;
      });
    } catch (error) {
      console.warn('[YO-koekone Improved] Extension background-tab request failed; using browser fallback.', error);
      return null;
    }
  }

  function fallbackOpenTab(url) {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) return;
    try { opened.opener = null; } catch { /* ignored */ }

    // window.open() can activate the new tab in some browsers. This is only a
    // last-resort fallback: Tampermonkey uses GM_openInTab(active:false), while
    // packaged extensions use tabs.create({active:false}) in their background.
    try { opened.blur?.(); } catch { /* ignored */ }
    try { window.focus(); } catch { /* ignored */ }
  }

  function openRoute(route) {
    const signature = routeToHash(route);
    const now = Date.now();

    // A middle-button gesture can produce both mousedown and auxclick. Open only
    // once while still handling either event as a fallback across browsers.
    if (signature && signature === lastOpenedSignature && now - lastOpenedAt < 700) return;
    lastOpenedSignature = signature;
    lastOpenedAt = now;

    const url = routeUrl(route);
    if (tryUserscriptBackgroundTab(url)) return;
    const extensionAttempt = tryExtensionBackgroundTab(url);
    if (extensionAttempt) {
      extensionAttempt.then(opened => {
        if (!opened) fallbackOpenTab(url);
      });
      return;
    }
    fallbackOpenTab(url);
  }

  function eventElement(event) {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path.length ? path : [event?.target]) {
      if (node && typeof node.closest === 'function') return node;
    }
    return null;
  }

  function consumeAndOpen(event) {
    const target = eventElement(event);
    if (!target) return false;
    const route = routeForTarget(target);
    if (!route) return false;

    event.preventDefault();
    event.stopImmediatePropagation();
    openRoute(route);
    return true;
  }

  function handleModifiedClick(event) {
    if (!isNewTabGesture(event)) return;
    consumeAndOpen(event);
  }

  function handleMiddleMouseDown(event) {
    if (event.button !== 1) return;
    consumeAndOpen(event);
  }

  function scheduleNativeBackReapply(subject) {
    if (!subject) return;
    const token = ++backRestoreToken;
    const started = Date.now();

    const tick = () => {
      if (token !== backRestoreToken || location.pathname !== BASE_PATH) return;

      const route = parseRoute();
      const input = subjectInput();
      const stillInResultView = Boolean(document.querySelector(SELECTORS.backToExamSelection));

      if (
        input &&
        !stillInResultView &&
        route?.kind === 'subject' &&
        route.subject === subject
      ) {
        // history.pushState() does not emit popstate/hashchange. The base core has
        // already written #/<subject> after Yle's native back click, so explicitly
        // ask its existing restoration pipeline to apply that route now. This
        // fixes the URL/UI mismatch where the hash was correct but the selector
        // was visually empty.
        try {
          window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }));
        } catch {
          window.dispatchEvent(new Event('popstate'));
        }
        return;
      }

      if (Date.now() - started < 6000) setTimeout(tick, 35);
    };

    setTimeout(tick, 0);
  }

  function observeNormalBackClick(event) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = eventElement(event);
    if (!target?.closest?.(SELECTORS.backToExamSelection)) return;

    const route = backToSelectionRoute(parseRoute(), currentSubject());
    if (route?.subject) scheduleNativeBackReapply(route.subject);
  }

  // Capture before the base core/Yle handlers. Middle-click is opened on
  // mousedown for the strongest user-activation semantics; auxclick remains a
  // fallback and is deduplicated. Ctrl/Cmd-click is handled on click.
  document.addEventListener('mousedown', handleMiddleMouseDown, true);
  document.addEventListener('click', handleModifiedClick, true);
  document.addEventListener('auxclick', handleModifiedClick, true);
  document.addEventListener('click', observeNormalBackClick, true);
})();

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const { SELECTORS, parseRoute, routeToHash, normalizeSpaces } = rt;

  const SYNTHETIC_ATTR = 'data-yo-improved-subtask-target';
  const SYNTHETIC_ID = '__yo_improved_subtask_restore_target__';
  let anchors = [];
  let scanTimer = null;
  let scrollTimer = null;
  let navigationTimer = null;
  let suppressUntil = 0;
  let restoreToken = 0;

  function numberFromQuestion(q) {
    if (!q || typeof q.querySelector !== 'function') return '';
    let display = null;
    try {
      display = q.querySelector(':scope > .yo-fragment__content > .yo-fragment__display-number [aria-label^="Kysymys "]');
    } catch {
      display = q.querySelector('.yo-fragment__display-number [aria-label^="Kysymys "]');
      if (display?.closest(SELECTORS.question) !== q) display = null;
    }
    const aria = normalizeSpaces(display?.getAttribute('aria-label') || '');
    const match = aria.match(/^Kysymys\s+(\d+(?:\.\d+)?)\.?$/i);
    return match?.[1] || '';
  }

  function isDecimalTask(value) {
    return /^\d+\.\d+$/.test(String(value || ''));
  }

  function questionForNumber(number) {
    return anchors.find(anchor => anchor.task === String(number))?.element || null;
  }

  function rebuild() {
    scanTimer = null;
    const route = parseRoute();
    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) {
      anchors = [];
      return;
    }

    const found = [];
    for (const q of document.querySelectorAll(`${SELECTORS.question}[id]`)) {
      const task = numberFromQuestion(q);
      if (task) found.push({ task, element: q });
    }
    anchors = found;
    // Important: rebuilding the anchor cache must never scroll. Yle mutates the
    // question DOM while the user is reading/typing; the old implementation
    // re-ran direct-subtask restoration after those mutations and could pull the
    // viewport back to 1.1/1.2 while the user was simply scrolling past it.
  }

  function scheduleRebuild(delay = 80) {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(rebuild, delay);
  }

  function setManagedRoute(next, marker = {}) {
    const hash = routeToHash(next);
    if (!hash || hash === location.hash) return;
    const base = history.state && typeof history.state === 'object' ? history.state : {};
    const oldNs = base.yoKoekoneImproved && typeof base.yoKoekoneImproved === 'object'
      ? base.yoKoekoneImproved
      : {};
    history.replaceState({
      ...base,
      yoKoekoneImproved: {
        ...oldNs,
        route: next,
        ...marker
      }
    }, '', `${location.pathname}${location.search}${hash}`);
  }

  function normalizeDisabledDecimalRoute() {
    if (rt.getSetting?.('subtaskLinks') !== false) return false;
    const route = parseRoute();
    if (route?.kind !== 'task' || !isDecimalTask(route.task)) return false;
    setManagedRoute({
      kind: 'task', subject: route.subject, exam: route.exam,
      task: String(route.task).split('.')[0]
    }, {
      subtaskNormalized: true,
      scrollTracked: false,
      subtaskScrollTracked: false
    });
    return true;
  }

  function cancelPendingRestore() {
    restoreToken++;
  }

  function waitAndScroll(task) {
    const token = ++restoreToken;
    const started = Date.now();
    const tick = () => {
      if (token !== restoreToken || rt.getSetting?.('subtaskLinks') === false) return;
      if (String(parseRoute()?.task || '') !== String(task)) return;
      if (!anchors.length || anchors.some(anchor => !anchor.element.isConnected)) rebuild();
      const target = questionForNumber(task);
      if (target?.isConnected) {
        suppressUntil = Date.now() + 900;
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
      if (Date.now() - started < 12000) setTimeout(tick, 60);
    };
    tick();
  }

  function ensureSyntheticTarget() {
    const existing = document.getElementById(SYNTHETIC_ID);
    if (normalizeDisabledDecimalRoute()) {
      existing?.remove();
      cancelPendingRestore();
      return;
    }

    const route = parseRoute();
    const task = route?.kind === 'task' && isDecimalTask(route.task) ? String(route.task) : '';
    if (!task || rt.getSetting?.('subtaskLinks') === false) {
      existing?.remove();
      cancelPendingRestore();
      return;
    }

    let target = existing;
    if (!target) {
      if (!document.documentElement) return setTimeout(ensureSyntheticTarget, 16);
      target = document.createElement('span');
      target.id = SYNTHETIC_ID;
      target.hidden = true;
      target.setAttribute('aria-hidden', 'true');
      target.setAttribute('role', 'button');
      target.className = 'yo-toc-item__text';
      target.setAttribute(SYNTHETIC_ATTR, '');
      document.documentElement.appendChild(target);
      target.addEventListener('click', () => {
        const wanted = target.getAttribute(SYNTHETIC_ATTR) || '';
        if (wanted) waitAndScroll(wanted);
      });
    }
    target.setAttribute(SYNTHETIC_ATTR, task);
    target.textContent = `Tehtävä ${task}`;
  }

  function updateRouteFromScroll() {
    scrollTimer = null;
    if (
      Date.now() < suppressUntil ||
      rt.getSetting?.('subtaskLinks') === false ||
      rt.getSetting?.('scrollTaskUrl') === false
    ) return;
    const route = parseRoute();
    if (!route || (route.kind !== 'exam' && route.kind !== 'task')) return;
    if (!anchors.length || anchors.some(anchor => !anchor.element.isConnected)) rebuild();
    if (!anchors.length) return;

    const threshold = Math.min(220, Math.max(110, innerHeight * 0.18));
    let current = null;
    for (const anchor of anchors) {
      const top = anchor.element.getBoundingClientRect().top;
      if (top <= threshold) current = anchor.task;
      else break;
    }

    const next = current
      ? { kind: 'task', subject: route.subject, exam: route.exam, task: current }
      : { kind: 'exam', subject: route.subject, exam: route.exam };
    if (routeToHash(next) === location.hash) return;
    setManagedRoute(next, { scrollTracked: true, subtaskScrollTracked: true });
  }

  function onScroll() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(updateRouteFromScroll, 110);
  }

  function restoreDirectSubtask() {
    const route = parseRoute();
    if (
      rt.getSetting?.('subtaskLinks') === false ||
      route?.kind !== 'task' ||
      !isDecimalTask(route.task)
    ) return;
    // This is invoked only for a real navigation/restore, never from a passive
    // DOM scan or from our own scroll-tracked replaceState updates.
    waitAndScroll(String(route.task));
  }

  function beforeManagedNavigation() {
    ensureSyntheticTarget();
    scheduleRebuild(20);
    setTimeout(restoreDirectSubtask, 80);
  }

  function scheduleManagedNavigation() {
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => {
      navigationTimer = null;
      beforeManagedNavigation();
    }, 0);
  }

  // pushState/replaceState do not fire hashchange. Core routing and the other
  // feature layers use them heavily. Scroll tracking is special: changing the
  // URL because a subtask crossed the viewport threshold must NOT be interpreted
  // as an instruction to scroll back to that subtask, otherwise URL tracking and
  // scroll restoration form a feedback loop (visible as up/down stutter).
  for (const method of ['pushState', 'replaceState']) {
    const original = history[method];
    if (typeof original !== 'function') continue;
    history[method] = function(...args) {
      const before = location.href;
      const result = original.apply(this, args);
      if (location.href !== before) {
        const ns = history.state?.yoKoekoneImproved;
        if (ns?.subtaskScrollTracked || ns?.scrollTracked) {
          ensureSyntheticTarget();
        } else {
          scheduleManagedNavigation();
        }
      }
      return result;
    };
  }

  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('hashchange', scheduleManagedNavigation, true);
  addEventListener('popstate', scheduleManagedNavigation, true);
  addEventListener('pageshow', scheduleManagedNavigation, true);

  // Explicit user navigation cancels a still-waiting direct-link restore. This
  // prevents a late React mount from yanking the viewport back after the user has
  // already started scrolling elsewhere.
  addEventListener('wheel', cancelPendingRestore, { passive: true, capture: true });
  addEventListener('touchstart', cancelPendingRestore, { passive: true, capture: true });
  addEventListener('pointerdown', event => {
    if (event.isPrimary) cancelPendingRestore();
  }, true);

  const observer = new MutationObserver(records => {
    const relevant = records.some(record => [...record.addedNodes, ...record.removedNodes].some(node =>
      node && typeof node.matches === 'function' &&
      !node.hasAttribute?.(SYNTHETIC_ATTR) &&
      (node.matches(SELECTORS.question) || node.querySelector?.(SELECTORS.question))
    ));
    if (relevant) scheduleRebuild(50);
  });
  function startObserver() {
    if (!document.documentElement) return setTimeout(startObserver, 20);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  startObserver();

  rt.onSettingsChange?.(() => {
    ensureSyntheticTarget();
    scheduleRebuild(0);
    setTimeout(restoreDirectSubtask, 60);
  });
  rt.subtaskQuestionForNumber = number => questionForNumber(number);

  ensureSyntheticTarget();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      rebuild();
      ensureSyntheticTarget();
      restoreDirectSubtask();
    }, { once: true });
  } else {
    rebuild();
    restoreDirectSubtask();
  }
})();

(() => {
  'use strict';

  const APP = 'YO-koekone Improved';
  const VERSION = '1.0.1';
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

  function replaceEscapedMarkup(target, markup) {
    const parser = new DOMParser();
    const parsed = parser.parseFromString(`<body>${markup}</body>`, 'text/html');
    const fragment = document.createDocumentFragment();
    for (const node of [...parsed.body.childNodes]) fragment.appendChild(document.importNode(node, true));
    target.replaceChildren(fragment);
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
      replaceEscapedMarkup(hub, hubMarkup(library, recentLimit));
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
    let svg = button.querySelector('svg');
    let label = button.querySelector('span');
    if (!svg || !label) {
      const ns = 'http://www.w3.org/2000/svg';
      svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('width', '1em');
      svg.setAttribute('height', '1em');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', 'm12 2.7 2.83 5.74 6.34.92-4.59 4.47 1.08 6.31L12 17.16l-5.66 2.98 1.08-6.31-4.59-4.47 6.34-.92L12 2.7Z');
      path.setAttribute('stroke-width', '1.8');
      path.setAttribute('stroke-linejoin', 'round');
      svg.appendChild(path);
      label = document.createElement('span');
      button.replaceChildren(svg, label);
    }
    const starPath = svg.querySelector('path');
    if (starPath) {
      starPath.setAttribute('fill', favorite ? '#f5c84c' : 'none');
      starPath.setAttribute('stroke', favorite ? '#f5c84c' : 'currentColor');
    }
    label.textContent = favorite ? 'Poista suosikeista' : 'Lisää suosikiksi';
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

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const { normalizeSpaces } = rt;

  const ATTR = 'data-yo-improved-hidden';
  const hiddenStyles = new WeakMap();
  let timer = null;

  function elementLike(node) {
    return Boolean(node && typeof node.querySelector === 'function' && typeof node.setAttribute === 'function');
  }
  function text(el) { return normalizeSpaces(el?.textContent || ''); }
  function anyEnabled() {
    return Boolean(
      rt.getSetting?.('hideHowItWorks') ||
      rt.getSetting?.('hideLoginIntro') ||
      rt.getSetting?.('hideExamDisclaimer')
    );
  }

  function hideElement(el, key) {
    if (!elementLike(el)) return;
    if (!hiddenStyles.has(el)) {
      hiddenStyles.set(el, {
        display: el.style.getPropertyValue('display'),
        priority: el.style.getPropertyPriority('display')
      });
    }
    el.setAttribute(ATTR, key);
    // The attribute + stylesheet is the normal path. The inline !important is a
    // deliberate second layer because some Yle/extension execution combinations
    // can leave the marker in the DOM while an injected <style> is replaced.
    el.style.setProperty('display', 'none', 'important');
  }

  function unhideElement(el) {
    if (!elementLike(el) || !el.hasAttribute(ATTR)) return;
    const previous = hiddenStyles.get(el);
    if (previous) {
      if (previous.display) el.style.setProperty('display', previous.display, previous.priority || '');
      else el.style.removeProperty('display');
      hiddenStyles.delete(el);
    } else if (el.style.getPropertyValue('display') === 'none' && el.style.getPropertyPriority('display') === 'important') {
      el.style.removeProperty('display');
    }
    el.removeAttribute(ATTR);
  }

  function firstTextElement(selector, predicate) {
    return [...document.querySelectorAll(selector)].find(el => predicate(text(el))) || null;
  }

  function nearestCard(start, predicate, { requireSvg = false, requireButton = false, maxChars = 3200 } = {}) {
    for (let node = start, depth = 0; elementLike(node) && depth < 7; depth++, node = node.parentElement) {
      const value = text(node);
      if (!predicate(value) || value.length > maxChars) continue;
      if (node.querySelector('input[data-testid="select-exam-subject"]')) continue;
      if (requireSvg && !node.querySelector('svg')) continue;
      if (requireButton && !node.querySelector('button')) continue;
      return node;
    }
    return null;
  }

  function findHowItWorks() {
    const heading = firstTextElement('h1,h2,h3,h4', value => /^Miten Yo-koekone toimii\??$/i.test(value));
    return heading ? nearestCard(heading, value => /Miten Yo-koekone toimii/i.test(value), {
      requireButton: true,
      maxChars: 5000
    }) : null;
  }

  function findLoginIntro() {
    const predicate = value => /^Jotta saat harjoittelusta kaiken irti,?\s*kirjaudu Yle Tunnuksella/i.test(value) && value.length < 500;
    return firstTextElement('p.yo-default-carousel__paragraph', predicate) ||
      firstTextElement('p', predicate) || firstTextElement('div', predicate);
  }

  function findExamDisclaimer() {
    const phrase = 'Kokeen ja kysymysten muoto ja asettelu voivat erota alkuperäisistä yo-kokeista';
    const predicate = value => value.includes(phrase) && value.length < 900;
    const leaf = firstTextElement('p,span', predicate) || firstTextElement('div', predicate);
    return leaf ? nearestCard(leaf, value => value.includes(phrase), {
      requireSvg: true,
      maxChars: 1200
    }) : null;
  }

  function apply() {
    timer = null;
    for (const el of [...document.querySelectorAll(`[${ATTR}]`)]) unhideElement(el);
    if (!anyEnabled()) return;
    if (rt.getSetting?.('hideHowItWorks')) hideElement(findHowItWorks(), 'how');
    if (rt.getSetting?.('hideLoginIntro')) hideElement(findLoginIntro(), 'intro');
    if (rt.getSetting?.('hideExamDisclaimer')) hideElement(findExamDisclaimer(), 'disclaimer');
  }

  function schedule(delay = 70) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(apply, delay);
  }

  const style = document.createElement('style');
  style.id = '__yo_improved_hidden_style__';
  style.textContent = `[${ATTR}]{display:none!important}`;
  function mountStyle() {
    if (!document.head) return setTimeout(mountStyle, 20);
    if (!style.isConnected) document.head.appendChild(style);
  }
  mountStyle();

  const observer = new MutationObserver(records => {
    if (!anyEnabled()) return;
    if (!style.isConnected) mountStyle();
    if (records.some(record => record.addedNodes.length || record.removedNodes.length)) schedule(90);
  });
  function startObserver() {
    if (!document.documentElement) return setTimeout(startObserver, 20);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  startObserver();

  rt.onSettingsChange?.(() => schedule(0));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => schedule(0), { once: true });
  else schedule(0);
})();

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const { SELECTORS, getDraft, discardDrafts, supportedControls, isReviewed } = rt;

  const ROW_CLASS = 'yoi-draft-status-row';
  const states = new Map();
  let renderTimer = null;

  function elementLike(node) {
    return Boolean(node && typeof node.matches === 'function');
  }

  function eventClosest(event, selector) {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    for (const node of path.length ? path : [event?.target]) {
      if (!node) continue;
      if (typeof node.matches === 'function' && node.matches(selector)) return node;
      if (typeof node.closest === 'function') {
        const match = node.closest(selector);
        if (match) return match;
      }
    }
    return null;
  }

  function statusFor(q) {
    if (isReviewed(q)) return { key: 'reviewed', label: 'Tarkistettu Ylellä', tone: 'server' };
    if (rt.getSetting?.('localDrafts') === false) return null;
    const transient = states.get(q.id);
    if (transient?.state === 'saving') return { key: 'saving', label: 'Tallennetaan paikallisesti…', tone: 'pending' };
    if (transient?.state === 'failed') return { key: 'failed', label: 'Paikallisen luonnoksen tallennus epäonnistui', tone: 'error' };
    const draft = getDraft(q.id);
    if (!draft) return null;
    if (transient?.state === 'restored' && Date.now() - transient.at < 5500) {
      return { key: 'restored', label: 'Luonnos palautettu', tone: 'local' };
    }
    return { key: 'saved', label: 'Luonnos tallennettu paikallisesti', tone: 'local' };
  }

  function findReviewNode(q) {
    return [...q.querySelectorAll('[data-testid="node-review"]')]
      .find(node => node.closest(SELECTORS.question) === q) || null;
  }

  function findActionRow(q) {
    const review = findReviewNode(q);
    if (!review) return null;
    const buttons = [...review.querySelectorAll('button')].filter(button => button.closest(SELECTORS.question) === q);
    const preferred = buttons.find(button =>
      button.matches?.(SELECTORS.review) || button.matches?.(SELECTORS.clear) ||
      /^(Tarkista|Tyhjennä|Muokkaa)$/i.test(String(button.getAttribute('aria-label') || '').trim())
    );
    const group = preferred?.closest?.('.yo-spaced-group') || review.querySelector('.yo-spaced-group');
    return group?.closest?.(SELECTORS.question) === q ? group : null;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function toast(message) {
    if (!document.body) return;
    const id = '__yo_improved_draft_toast__';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.textContent = message;
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483646;max-width:430px;padding:10px 12px;border-radius:8px;font:13px/1.4 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.32);background:#222426;color:#fff;border:1px solid #4a4b4d';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  function removeQuestionUi(q) {
    for (const row of q.querySelectorAll(`.${ROW_CLASS}`)) {
      if (row.closest(SELECTORS.question) === q) row.remove();
    }
  }

  function positionPopover(row) {
    const popover = row?.querySelector('.yoi-draft-popover');
    if (!popover || popover.hidden) return;
    row.classList.remove('yoi-popover-up');
    requestAnimationFrame(() => {
      if (!popover.isConnected || popover.hidden) return;
      const rect = popover.getBoundingClientRect();
      if (rect.bottom > innerHeight - 12) row.classList.add('yoi-popover-up');
    });
  }

  function renderQuestion(q) {
    if (!elementLike(q) || !q.id || !supportedControls(q).length) return;
    if (rt.getSetting?.('draftStatus') === false) {
      removeQuestionUi(q);
      return;
    }

    const status = statusFor(q);
    let row = [...q.querySelectorAll(`.${ROW_CLASS}`)]
      .find(node => node.closest(SELECTORS.question) === q) || null;
    if (!status) {
      row?.remove();
      return;
    }

    const actionRow = findActionRow(q);
    if (!row) {
      row = document.createElement('div');
      row.className = ROW_CLASS;
      row.innerHTML = '<button type="button" class="yoi-draft-chip" aria-expanded="false"><span class="yoi-draft-dot"></span><span class="yoi-draft-label"></span></button><div class="yoi-draft-popover" role="dialog" hidden><div class="yoi-draft-popover-title"></div><p></p><div class="yoi-draft-actions"><button type="button" class="yoi-draft-discard">Poista paikallinen luonnos</button></div></div>';

      const chip = row.querySelector('.yoi-draft-chip');
      const popover = row.querySelector('.yoi-draft-popover');
      chip.addEventListener('click', event => {
        event.preventDefault();
        const open = popover.hidden;
        popover.hidden = !open;
        chip.setAttribute('aria-expanded', String(open));
        if (open) positionPopover(row);
      });
      row.querySelector('.yoi-draft-discard').addEventListener('click', () => {
        if (!discardDrafts([q.id])) {
          toast('Paikallisen luonnoksen poistaminen epäonnistui. YO+ ei merkinnyt sitä poistetuksi.');
          renderQuestion(q);
          return;
        }
        states.delete(q.id);
        popover.hidden = true;
        chip.setAttribute('aria-expanded', 'false');
        toast('Paikallinen luonnos poistettu. Näkyvää vastausta ei tyhjennetty.');
        renderQuestion(q);
      });
    }

    // Keep the status in Yle's own Tarkista/Tyhjennä/Muokkaa action row. If
    // React remounts that row, move our existing UI instead of creating a second
    // line above it. Fall back beside node-review only until the action row mounts.
    if (actionRow) {
      // React can add Muokkaa after this status row already exists. Re-evaluate
      // native action order on every render instead of checking only the parent.
      const nativeButtons = [...actionRow.querySelectorAll('button')].filter(button =>
        button.closest(SELECTORS.question) === q && !button.closest(`.${ROW_CLASS}`)
      );
      const editButton = nativeButtons.find(button =>
        button.matches?.(SELECTORS.edit) ||
        /^Muokkaa$/i.test(String(button.getAttribute('aria-label') || button.textContent || '').trim())
      );
      const anchor = editButton || nativeButtons[nativeButtons.length - 1] || null;
      if (anchor) {
        if (anchor.nextSibling !== row) anchor.after(row);
      } else if (actionRow.lastElementChild !== row) {
        actionRow.appendChild(row);
      }
    } else {
      const review = findReviewNode(q);
      if (review?.parentElement && row.parentElement !== review.parentElement) {
        review.parentElement.insertBefore(row, review.nextSibling);
      } else if (!row.isConnected) {
        q.appendChild(row);
      }
    }

    row.dataset.tone = status.tone;
    setText(row.querySelector('.yoi-draft-label'), status.label);
    setText(row.querySelector('.yoi-draft-popover-title'), status.label);
    const p = row.querySelector('.yoi-draft-popover p');
    const discard = row.querySelector('.yoi-draft-discard');
    if (status.key === 'reviewed') {
      setText(p, 'Tämä kysymys on Ylen tarkistetussa tilassa. Yle vastaa tarkistetun vastauksen tallennuksesta.');
      discard.hidden = !getDraft(q.id);
    } else if (status.key === 'failed') {
      setText(p, 'Selaimen paikallinen tallennus epäonnistui. Vastaus näkyy edelleen tällä sivulla, mutta YO+ ei voi luvata sen palautumista F5:n jälkeen.');
      discard.hidden = false;
    } else {
      setText(p, 'Tämä on vain tämän selaimen paikallinen turvakopio tarkistamattomasta vastauksesta. Se ei ole sama asia kuin Ylelle tallennettu tarkistettu vastaus.');
      discard.hidden = false;
    }
  }

  function renderAll() {
    renderTimer = null;
    if (rt.getSetting?.('draftStatus') === false) {
      document.querySelectorAll(`.${ROW_CLASS}`).forEach(node => node.remove());
      return;
    }
    for (const q of document.querySelectorAll(SELECTORS.question)) renderQuestion(q);
  }

  function scheduleRender(delay = 80) {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(renderAll, delay);
  }

  rt.reportDraftStatus = (id, state) => {
    if (!id) return;
    if (state === 'cleared' || state === 'reviewed') states.delete(String(id));
    else states.set(String(id), { state, at: Date.now() });
    const q = document.getElementById(String(id));
    if (q?.matches?.(SELECTORS.question)) renderQuestion(q);
    if (state === 'restored') setTimeout(() => {
      const current = states.get(String(id));
      if (current?.state === 'restored') {
        states.set(String(id), { state: 'saved', at: Date.now() });
        const currentQ = document.getElementById(String(id));
        if (currentQ?.matches?.(SELECTORS.question)) renderQuestion(currentQ);
      }
    }, 5600);
  };

  const style = document.createElement('style');
  style.textContent = `
    .${ROW_CLASS}{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;margin:0 0 0 .35rem;font-family:inherit;vertical-align:middle}
    .yoi-draft-chip{display:inline-flex;align-items:center;gap:.42rem;border:0;background:transparent;color:#aaa;padding:.42rem .45rem;border-radius:7px;font:600 .76rem/1.25 inherit;cursor:pointer;white-space:nowrap}
    .yoi-draft-chip:hover,.yoi-draft-chip:focus-visible{background:rgba(255,255,255,.06);color:inherit;outline:2px solid rgba(255,255,255,.2);outline-offset:1px}
    .yoi-draft-dot{width:.48rem;height:.48rem;border-radius:50%;background:#aaa;flex:none}
    .yoi-draft-status-row[data-tone="local"] .yoi-draft-dot{background:#76c893}.yoi-draft-status-row[data-tone="pending"] .yoi-draft-dot{background:#e9c46a}.yoi-draft-status-row[data-tone="server"] .yoi-draft-dot{background:#78b7ff}.yoi-draft-status-row[data-tone="error"] .yoi-draft-dot{background:#ff7b72}
    .yoi-draft-popover{position:absolute;right:0;top:calc(100% + 8px);z-index:80;width:min(360px,calc(100vw - 32px));padding:14px;background:#222325;color:#f5f5f5;border:1px solid #4a4b4d;border-radius:10px;box-shadow:0 12px 38px rgba(0,0,0,.46);font:13px/1.45 system-ui,sans-serif;text-align:left}
    .yoi-popover-up .yoi-draft-popover{top:auto;bottom:calc(100% + 8px)}
    .yoi-draft-popover-title{font-weight:800;margin-bottom:5px}.yoi-draft-popover p{margin:0 0 12px;color:#c7c8ca}
    .yoi-draft-actions{padding-top:10px;border-top:1px solid #3d3f41}
    .yoi-draft-discard{display:block;width:100%;border:1px solid #666a6d;border-radius:8px;background:#2a2b2d;color:#fff;padding:8px 10px;font:700 12px/1.25 inherit;text-align:center;cursor:pointer}
    .yoi-draft-discard:hover,.yoi-draft-discard:focus-visible{background:#343638;border-color:#85888b;outline:2px solid #aaa;outline-offset:2px}
    @media(max-width:620px){.${ROW_CLASS}{margin-left:.1rem}.yoi-draft-label{max-width:190px;overflow:hidden;text-overflow:ellipsis}.yoi-draft-popover{right:-4px}}
  `;
  function mountStyle() {
    if (document.head) document.head.appendChild(style);
    else setTimeout(mountStyle, 20);
  }
  mountStyle();

  const observer = new MutationObserver(records => {
    const external = records.some(record => {
      const target = elementLike(record?.target) ? record.target : null;
      if (target?.closest?.(`.${ROW_CLASS}`)) return false;
      const nodes = [...record.addedNodes, ...record.removedNodes].filter(elementLike);
      if (nodes.length && nodes.every(node => node.matches(`.${ROW_CLASS}`) || node.closest?.(`.${ROW_CLASS}`))) return false;
      return Boolean(record.addedNodes.length || record.removedNodes.length);
    });
    if (external) scheduleRender(100);
  });
  function startObserver() {
    if (!document.documentElement) return setTimeout(startObserver, 20);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
  startObserver();

  document.addEventListener('click', event => {
    if (!eventClosest(event, `.${ROW_CLASS}`)) {
      for (const popover of document.querySelectorAll('.yoi-draft-popover:not([hidden])')) {
        popover.hidden = true;
        popover.parentElement?.querySelector('.yoi-draft-chip')?.setAttribute('aria-expanded', 'false');
      }
    }
  }, true);
  addEventListener('resize', () => {
    for (const row of document.querySelectorAll(`.${ROW_CLASS}`)) positionPopover(row);
  }, { passive: true });
  addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    for (const popover of document.querySelectorAll('.yoi-draft-popover:not([hidden])')) {
      popover.hidden = true;
      popover.parentElement?.querySelector('.yoi-draft-chip')?.setAttribute('aria-expanded', 'false');
    }
  }, true);

  rt.onSettingsChange?.(() => scheduleRender(0));
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => scheduleRender(0), { once: true });
  } else {
    scheduleRender(0);
  }
})();

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const {
    SELECTORS, setDraft, getDraft, draftIds, discardDrafts, questionFor, supportedControls,
    isDisabled, isReviewed, isGapSelectEmpty, mergeDraftControl, pendingDrafts, draftTimers,
    isDraftRestoreSuppressed
  } = rt;

  const RESTORE_DELAY = 90;
  const RESTORE_VERIFY_DELAY = 850;
  const DRAFT_DEBOUNCE = 220;
  let restoring = false;
  let restoreTimer = null;
  let restoreDueAt = 0;
  let verifyTimer = null;
  let cleanupTimer = null;
  let mutationTimer = null;

  const draftsEnabled = () => rt.getSetting?.('localDrafts') !== false;
  const report = (id, state) => { if (id) rt.reportDraftStatus?.(id, state); };

  function currentDraft(id) {
    return pendingDrafts.has(id) ? pendingDrafts.get(id) : getDraft(id);
  }

  function flushId(id, { force = false } = {}) {
    const timer = draftTimers.get(id);
    if (timer) clearTimeout(timer);
    draftTimers.delete(id);
    if (!pendingDrafts.has(id)) return true;
    const draft = pendingDrafts.get(id);
    if (!force && !draftsEnabled()) {
      pendingDrafts.delete(id);
      return true;
    }
    const persisted = setDraft(id, draft);
    if (!persisted) {
      // Keep the newest value in memory so another edit/unload can retry instead
      // of falsely reporting Saved and discarding the only remaining copy.
      report(id, 'failed');
      return false;
    }
    pendingDrafts.delete(id);
    report(id, draft ? 'saved' : 'cleared');
    return true;
  }

  function queueControl(container, key, controlDraft, { immediate = false } = {}) {
    if (!draftsEnabled() || !container?.id || restoring || isReviewed(container)) return;
    const merged = mergeDraftControl(currentDraft(container.id), key, controlDraft);
    pendingDrafts.set(container.id, merged);
    report(container.id, 'saving');

    if (immediate) {
      flushId(container.id);
      return;
    }

    const old = draftTimers.get(container.id);
    if (old) clearTimeout(old);
    draftTimers.set(container.id, setTimeout(() => flushId(container.id), DRAFT_DEBOUNCE));
  }

  function essayDraft(textarea) {
    return textarea.value ? { type: 'essay', value: textarea.value } : null;
  }

  function gapTextDraft(input) {
    const optionIndex = String(input.getAttribute('data-option-index') || '');
    if (!optionIndex || !input.value) return null;
    return { type: 'gap-text', optionIndex, value: input.value };
  }

  function gapSelectDraft(select) {
    const optionIndex = String(select.getAttribute('data-option-index') || '');
    if (!optionIndex || isGapSelectEmpty(select)) return null;
    return {
      type: 'gap-select',
      optionIndex,
      value: String(select.value ?? ''),
      selectedIndex: select.selectedIndex,
      selectedText: String(select.selectedOptions?.[0]?.textContent || '').trim()
    };
  }

  function radioDraft(radio) {
    if (!radio.checked) return null;
    const optionId = String(radio.getAttribute('data-option-id') || '');
    return optionId ? { type: 'radio', optionId } : null;
  }

  function flushPending({ force = false } = {}) {
    if (!force && !draftsEnabled()) {
      for (const timer of draftTimers.values()) clearTimeout(timer);
      draftTimers.clear();
      pendingDrafts.clear();
      return;
    }
    for (const id of [...pendingDrafts.keys()]) flushId(id, { force });
    for (const timer of draftTimers.values()) clearTimeout(timer);
    draftTimers.clear();
  }

  function controlTag(control) {
    return String(control?.tagName || '').toUpperCase();
  }

  function setNativeValue(control, value) {
    if (!control) return;
    let descriptor = null;
    try {
      const proto = Object.getPrototypeOf(control);
      descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
    } catch {
      descriptor = null;
    }
    if (!descriptor?.set) {
      const view = control.ownerDocument?.defaultView;
      const tag = controlTag(control);
      const proto = tag === 'TEXTAREA'
        ? view?.HTMLTextAreaElement?.prototype
        : tag === 'SELECT'
          ? view?.HTMLSelectElement?.prototype
          : view?.HTMLInputElement?.prototype;
      descriptor = proto ? Object.getOwnPropertyDescriptor(proto, 'value') : null;
    }
    if (descriptor?.set) descriptor.set.call(control, value);
    else control.value = value;
    const EventCtor = control.ownerDocument?.defaultView?.Event || globalThis.Event;
    control.dispatchEvent(new EventCtor('input', { bubbles: true }));
    control.dispatchEvent(new EventCtor('change', { bubbles: true }));
  }

  function setNativeTextarea(textarea, value) { setNativeValue(textarea, value); }
  function setNativeInput(input, value) { setNativeValue(input, value); }
  function setNativeSelect(select, value) { setNativeValue(select, value); }

  function findGapControl(container, selector, optionIndex) {
    return [...container.querySelectorAll(selector)]
      .find(control => questionFor(control) === container &&
        String(control.getAttribute('data-option-index') || '') === String(optionIndex));
  }

  function restoreSelect(select, saved) {
    if (!select || isDisabled(select) || !isGapSelectEmpty(select)) return false;
    const options = [...select.options];
    let option = options.find(item => item.index > 0 && String(item.value) === String(saved.value));
    if (!option && saved.selectedText) {
      option = options.find(item => item.index > 0 &&
        String(item.textContent || '').trim() === String(saved.selectedText).trim());
    }
    if (!option && Number.isInteger(saved.selectedIndex) && saved.selectedIndex > 0) {
      option = options[saved.selectedIndex] || null;
    }
    if (!option || option.index <= 0) return false;
    restoring = true;
    try { setNativeSelect(select, option.value); }
    finally { restoring = false; }
    return true;
  }

  function restoreQuestion(container) {
    if (
      !draftsEnabled() ||
      !container?.id ||
      isDraftRestoreSuppressed(container.id) ||
      !supportedControls(container).length ||
      pendingDrafts.has(container.id) ||
      isReviewed(container)
    ) return false;

    const draft = getDraft(container.id);
    if (!draft?.controls) return false;

    let restoredAny = false;
    for (const [key, saved] of Object.entries(draft.controls)) {
      if (!saved) continue;

      if (saved.type === 'essay') {
        const textarea = [...container.querySelectorAll(SELECTORS.essay)]
          .find(control => questionFor(control) === container);
        if (!textarea || isDisabled(textarea) || textarea.value) continue;
        restoring = true;
        try { setNativeTextarea(textarea, String(saved.value ?? '')); }
        finally { restoring = false; }
        restoredAny = true;
        continue;
      }

      if (saved.type === 'radio') {
        const radios = [...container.querySelectorAll(SELECTORS.radio)]
          .filter(control => questionFor(control) === container);
        if (!radios.length || radios.some(radio => radio.checked)) continue;
        const radio = radios.find(item => String(item.getAttribute('data-option-id') || '') === String(saved.optionId));
        if (!radio || isDisabled(radio)) continue;
        restoring = true;
        try { radio.click(); }
        finally { restoring = false; }
        restoredAny = true;
        continue;
      }

      if (saved.type === 'gap-text') {
        const input = findGapControl(container, SELECTORS.gapText, saved.optionIndex);
        if (controlTag(input) !== 'INPUT' || isDisabled(input) || input.value) continue;
        restoring = true;
        try { setNativeInput(input, String(saved.value ?? '')); }
        finally { restoring = false; }
        restoredAny = true;
        continue;
      }

      if (saved.type === 'gap-select') {
        const select = findGapControl(container, SELECTORS.gapSelect, saved.optionIndex);
        if (controlTag(select) === 'SELECT' && restoreSelect(select, saved)) restoredAny = true;
        continue;
      }

      void key;
    }
    if (restoredAny) report(container.id, 'restored');
    return restoredAny;
  }

  function restoreVisibleDrafts() {
    if (!draftsEnabled()) return;
    for (const id of draftIds()) {
      const container = document.getElementById(id);
      if (container?.matches?.(SELECTORS.question)) restoreQuestion(container);
    }
  }

  function cleanupStableReviewed() {
    const ids = [];
    for (const id of draftIds()) {
      const q = document.getElementById(id);
      if (q?.matches?.(SELECTORS.question) && isReviewed(q)) ids.push(id);
    }
    if (discardDrafts(ids)) {
      for (const id of ids) report(id, 'reviewed');
    }
  }

  function runRestore() {
    restoreTimer = null;
    restoreDueAt = 0;
    if (!draftsEnabled() || !draftIds().length) return;

    restoreVisibleDrafts();

    if (!verifyTimer) {
      verifyTimer = setTimeout(() => {
        verifyTimer = null;
        if (draftsEnabled() && draftIds().length) restoreVisibleDrafts();
      }, RESTORE_VERIFY_DELAY);
    }
  }

  function scheduleRestore(delay = RESTORE_DELAY) {
    if (!draftsEnabled() || !draftIds().length) return;
    const dueAt = Date.now() + Math.max(0, Number(delay) || 0);
    if (restoreTimer && restoreDueAt && restoreDueAt <= dueAt) return;
    if (restoreTimer) clearTimeout(restoreTimer);
    restoreDueAt = dueAt;
    restoreTimer = setTimeout(runRestore, Math.max(0, dueAt - Date.now()));
  }

  function scheduleReviewedCleanup(delay = 2500) {
    if (!draftIds().length || cleanupTimer) return;
    cleanupTimer = setTimeout(() => {
      cleanupTimer = null;
      cleanupStableReviewed();
    }, delay);
  }

  function pauseDraftCapture({ preservePending = true } = {}) {
    if (preservePending && pendingDrafts.size) flushPending({ force: true });
    for (const timer of draftTimers.values()) clearTimeout(timer);
    draftTimers.clear();
    pendingDrafts.clear();
    if (restoreTimer) clearTimeout(restoreTimer);
    if (verifyTimer) clearTimeout(verifyTimer);
    restoreTimer = null;
    verifyTimer = null;
    restoreDueAt = 0;
  }

  rt.flushPendingDrafts = flushPending;
  rt.scheduleDraftRestore = scheduleRestore;
  rt.scheduleReviewedDraftCleanup = scheduleReviewedCleanup;

  document.addEventListener('input', event => {
    if (!draftsEnabled()) return;
    const target = event?.target;
    const tag = controlTag(target);
    if (tag === 'TEXTAREA' && target.matches?.(SELECTORS.essay)) {
      const container = questionFor(target);
      if (container) queueControl(container, 'essay', essayDraft(target));
      return;
    }
    if (tag === 'INPUT' && target.matches?.(SELECTORS.gapText)) {
      const container = questionFor(target);
      const index = String(target.getAttribute('data-option-index') || '');
      if (container && index) queueControl(container, `gap:${index}`, gapTextDraft(target));
    }
  }, true);

  document.addEventListener('change', event => {
    if (!draftsEnabled()) return;
    const target = event?.target;
    const tag = controlTag(target);
    if (tag === 'INPUT' && target.matches?.(SELECTORS.radio)) {
      if (!target.checked) return;
      const container = questionFor(target);
      if (container) queueControl(container, 'radio', radioDraft(target), { immediate: true });
      return;
    }
    if (tag === 'SELECT' && target.matches?.(SELECTORS.gapSelect)) {
      const container = questionFor(target);
      const index = String(target.getAttribute('data-option-index') || '');
      if (container && index) queueControl(container, `gap:${index}`, gapSelectDraft(target), { immediate: true });
    }
  }, true);

  window.addEventListener('pagehide', flushPending, true);
  window.addEventListener('beforeunload', flushPending, true);

  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record?.target;
      if (target && typeof target.closest === 'function' && target.closest(SELECTORS.question)) return true;
      return [...record.addedNodes].some(node =>
        node && typeof node.matches === 'function' &&
        (node.matches(SELECTORS.question) || node.querySelector?.(SELECTORS.question)));
    });
    if (!relevant) return;

    if (mutationTimer) clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      mutationTimer = null;
      scheduleReviewedCleanup();
      rt.reconcilePendingAnswerActions?.();
    }, 220);
    scheduleRestore();
  });

  function startObserver() {
    if (!document.documentElement) {
      setTimeout(startObserver, 16);
      return;
    }
    observer.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true,
      attributeFilter: ['aria-disabled', 'disabled', 'class', 'checked']
    });
  }
  startObserver();

  rt.onSettingsChange?.((next, previous) => {
    if (next.localDrafts) scheduleRestore(0);
    else if (previous?.localDrafts !== false) pauseDraftCapture({ preservePending: true });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scheduleRestore(0);
      scheduleReviewedCleanup();
    }, { once: true });
  } else {
    scheduleRestore(0);
    scheduleReviewedCleanup();
  }
})();

(() => {
  'use strict';

  const rt = globalThis.__YO_KOEKONE_IMPROVED_V03_RUNTIME__;
  if (!rt || rt.disabled) return;
  const {
    SELECTORS, CHANNEL_NAME, tabId, discardDrafts, questionFor, supportedControls,
    isDisabled, isReviewed, isEmpty, suppressDraftRestore, releaseDraftRestore
  } = rt;

  const ACTION_TTL = 20000;
  const STABLE_MS = 900;
  const pending = [];
  let timer = null;
  let channel = null;
  let lastForeignWarning = 0;
  let removalObserver = null;

  function showToast(message) {
    if (!document.body || rt.getSetting?.('crossTabWarnings') === false) return;
    const id = '__yo_improved_feature_toast__';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.textContent = message;
    el.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:2147483647;max-width:440px;padding:10px 12px;border-radius:8px;font:13px/1.35 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3);background:#1f2937;color:#fff';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 6500);
  }

  function renderedQuestionIds() {
    return new Set([...document.querySelectorAll(SELECTORS.question)]
      .filter(q => supportedControls(q).length)
      .map(q => q.id).filter(Boolean));
  }

  if ('BroadcastChannel' in window) {
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channel.addEventListener('message', event => {
        if (rt.getSetting?.('crossTabWarnings') === false) return;
        const msg = event.data;
        if (!msg || msg.tabId === tabId || !['review', 'clear', 'review-all', 'clear-all'].includes(msg.type)) return;
        const ids = Array.isArray(msg.questionIds) ? msg.questionIds.filter(Boolean) : [];
        if (!ids.length) return;

        const here = renderedQuestionIds();
        if (!ids.some(id => here.has(id))) return;

        const now = Date.now();
        if (now - lastForeignWarning < 900) return;
        lastForeignWarning = now;
        showToast('Vastaustila muuttui toisessa Yo-koekone-välilehdessä. Tämä välilehti voi näyttää vanhaa tarkistettua vastausta; paikallisia keskeneräisiä luonnoksia ei ladata automaattisesti uudelleen.');
      });
    } catch { channel = null; }
  }

  function broadcast(type, ids) {
    if (!channel) return;
    const questionIds = [...new Set(ids.filter(Boolean))];
    if (!questionIds.length) return;
    try { channel.postMessage({ type, questionIds, tabId, at: Date.now() }); }
    catch { /* optional */ }
  }

  function supportedQuestions() {
    return [...document.querySelectorAll(SELECTORS.question)].filter(q => supportedControls(q).length);
  }

  function reviewedIds() {
    return new Set(supportedQuestions().filter(isReviewed).map(q => q.id).filter(Boolean));
  }

  function nonEmptyIds() {
    return new Set(supportedQuestions().filter(q => !isEmpty(q)).map(q => q.id).filter(Boolean));
  }

  function schedule(delay = 180) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; reconcile(); }, delay);
  }

  function actionIds(action) {
    if (action.questionId) return [action.questionId];
    return action.candidates ? [...action.candidates] : [];
  }

  function releaseHeld(action, ids, { restore = false } = {}) {
    const released = [];
    for (const id of new Set((ids || []).filter(Boolean))) {
      if (!action.held?.has(id)) continue;
      action.held.delete(id);
      released.push(id);
    }
    if (released.length) releaseDraftRestore(released);
    if (restore && released.length) rt.scheduleDraftRestore?.(0);
  }

  function ensureRemovalObserver() {
    if (removalObserver || !document.documentElement) return;
    removalObserver = new MutationObserver(records => {
      if (!pending.length) return;
      for (const record of records) {
        for (const node of record.removedNodes) {
          if (!node || typeof node.matches !== 'function') continue;
          if (node.matches(SELECTORS.question)) finalizeDetachedQuestion(node);
          for (const q of node.querySelectorAll?.(SELECTORS.question) || []) finalizeDetachedQuestion(q);
        }
      }
    });
    removalObserver.observe(document.documentElement, { subtree: true, childList: true });
  }

  function stopRemovalObserverIfIdle() {
    if (pending.length || !removalObserver) return;
    removalObserver.disconnect();
    removalObserver = null;
  }

  function add(action) {
    // Commit the newest debounced text before Yle starts mutating controls. If
    // the action fails/cancels, that fallback is still available afterwards.
    rt.flushPendingDrafts?.();

    const record = {
      ...action,
      createdAt: Date.now(),
      satisfiedAt: 0,
      settled: new Map(),
      held: new Set(),
      cleanupPending: new Set(),
      lastCleanupWarningAt: 0
    };
    const ids = actionIds(record);
    if (ids.length) {
      record.held = new Set(ids);
      suppressDraftRestore(ids);
    }
    pending.push(record);
    ensureRemovalObserver();
    schedule(120);
  }

  function conditionStable(action, satisfied, now) {
    if (!satisfied) {
      action.satisfiedAt = 0;
      return false;
    }
    if (!action.satisfiedAt) action.satisfiedAt = now;
    return now - action.satisfiedAt >= STABLE_MS;
  }

  function candidateStable(action, id, satisfied, now) {
    if (!satisfied) {
      action.settled.delete(id);
      return false;
    }
    if (!action.settled.has(id)) action.settled.set(id, now);
    return now - action.settled.get(id) >= STABLE_MS;
  }

  function finish(action, ids) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return true;

    // Keep restoration suppressed until Yle's resulting state is proven stable,
    // then delete the fallback before releasing the hold. This prevents Clear
    // from being immediately fought by local restoration.
    if (!discardDrafts(unique)) {
      for (const id of unique) action.cleanupPending?.add(id);
      const now = Date.now();
      if (!action.lastCleanupWarningAt || now - action.lastCleanupWarningAt > 5000) {
        action.lastCleanupWarningAt = now;
        console.warn('[YO-koekone Improved] Could not delete local draft after Yle answer action; retrying while the action remains pending.');
      }
      return false;
    }
    for (const id of unique) action.cleanupPending?.delete(id);
    const status = action.type === 'review' || action.type === 'review-all' ? 'reviewed' : 'cleared';
    for (const id of unique) rt.reportDraftStatus?.(id, status);
    broadcast(action.type, unique);
    releaseHeld(action, unique);
    return true;
  }

  function retryCleanup(action) {
    const ids = [...(action.cleanupPending || [])].filter(id => action.held?.has(id));
    if (!ids.length) return true;
    if (!finish(action, ids)) return false;
    if (action.candidates) {
      for (const id of ids) {
        action.candidates.delete(id);
        action.settled.delete(id);
      }
    }
    return true;
  }

  function questionContainerIsCleared(q) {
    return Boolean(q && supportedControls(q).length && !isReviewed(q) && isEmpty(q));
  }

  function questionContainerIsReviewed(q) {
    return Boolean(q && supportedControls(q).length && isReviewed(q));
  }

  function questionIsCleared(id) {
    return questionContainerIsCleared(id ? document.getElementById(id) : null);
  }

  function questionIsReviewed(id) {
    return questionContainerIsReviewed(id ? document.getElementById(id) : null);
  }

  function finalizeDetachedQuestion(q) {
    if (!q?.id || !supportedControls(q).length || !pending.length) return;
    const id = q.id;

    // Carousel/route navigation can unmount a question before the normal 900 ms
    // window finishes. A detached DOM node is still inspectable, so finalize only
    // when it already proves the requested state; otherwise fail safe and timeout.
    for (let i = pending.length - 1; i >= 0; i--) {
      const action = pending[i];
      let matched = false;

      if (action.type === 'review' && action.questionId === id) matched = questionContainerIsReviewed(q);
      else if (action.type === 'clear' && action.questionId === id) matched = questionContainerIsCleared(q);
      else if (action.type === 'review-all' && action.candidates?.has(id)) matched = questionContainerIsReviewed(q);
      else if (action.type === 'clear-all' && action.candidates?.has(id)) matched = questionContainerIsCleared(q);

      if (!matched) continue;

      if (action.candidates) {
        if (!finish(action, [id])) continue;
        action.candidates.delete(id);
        action.settled.delete(id);
        if (!action.candidates.size) pending.splice(i, 1);
      } else if (finish(action, [id])) {
        pending.splice(i, 1);
      }
    }

    stopRemovalObserverIfIdle();
  }

  function reconcileBulk(action, predicate, now) {
    for (const id of [...action.candidates]) {
      if (!candidateStable(action, id, predicate(id), now)) continue;
      if (!finish(action, [id])) continue;
      action.candidates.delete(id);
      action.settled.delete(id);
    }
    return action.candidates.size === 0;
  }

  function dropTimedOutAction(index) {
    const action = pending[index];
    if (!action) return;

    // Give already-proven Yle actions one last persistence retry. If local
    // deletion is still impossible, keep those specific restore holds for the
    // lifetime of this page rather than resurrecting a stale answer over a
    // successful Yle Clear/Review. Unproven actions still fail safe to restore.
    retryCleanup(action);
    const cleanupIds = new Set(action.cleanupPending || []);
    const safeToRestore = [...(action.held || [])].filter(id => !cleanupIds.has(id));
    releaseHeld(action, safeToRestore, { restore: true });
    if (cleanupIds.size) {
      console.warn('[YO-koekone Improved] Local draft cleanup is still unavailable; stale restore remains suppressed for this page.');
    }
    pending.splice(index, 1);
  }

  function reconcile() {
    const now = Date.now();

    for (let i = pending.length - 1; i >= 0; i--) {
      const action = pending[i];
      if (now - action.createdAt > ACTION_TTL) {
        dropTimedOutAction(i);
        continue;
      }

      if (action.cleanupPending?.size) {
        if (!retryCleanup(action)) continue;
        if (!action.candidates || !action.candidates.size) {
          pending.splice(i, 1);
          continue;
        }
      }

      if (action.type === 'review') {
        if (conditionStable(action, questionIsReviewed(action.questionId), now) && finish(action, [action.questionId])) {
          pending.splice(i, 1);
        }
      } else if (action.type === 'clear') {
        if (conditionStable(action, questionIsCleared(action.questionId), now) && finish(action, [action.questionId])) {
          pending.splice(i, 1);
        }
      } else if (action.type === 'review-all') {
        if (reconcileBulk(action, questionIsReviewed, now)) pending.splice(i, 1);
      } else if (action.type === 'clear-all') {
        if (reconcileBulk(action, questionIsCleared, now)) pending.splice(i, 1);
      }
    }

    if (pending.length) schedule(300);
    else stopRemovalObserverIfIdle();
  }

  function finalizeCurrentStatesBeforeUnload() {
    for (const action of pending) {
      if (action.cleanupPending?.size) {
        if (!retryCleanup(action)) continue;
        if (!action.candidates || !action.candidates.size) continue;
      }
      if (action.type === 'review' && questionIsReviewed(action.questionId)) finish(action, [action.questionId]);
      else if (action.type === 'clear' && questionIsCleared(action.questionId)) finish(action, [action.questionId]);
      else if (action.type === 'review-all') {
        const settled = [...action.candidates].filter(questionIsReviewed);
        if (settled.length) finish(action, settled);
      } else if (action.type === 'clear-all') {
        const settled = [...action.candidates].filter(questionIsCleared);
        if (settled.length) finish(action, settled);
      }
    }
  }

  rt.reconcilePendingAnswerActions = reconcile;

  document.addEventListener('click', event => {
    const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
    const target = (path.length ? path : [event?.target])
      .find(node => node && typeof node.closest === 'function') || null;
    if (!target) return;

    // new-tabs.js consumes only true navigation targets. Modifier clicks on Yle
    // answer controls remain valid answer actions and must still be tracked here.
    const review = target.closest(SELECTORS.review);
    if (review) {
      if (isDisabled(review)) return;
      const q = questionFor(review);
      if (q?.id && supportedControls(q).length && !isReviewed(q) && !isEmpty(q)) add({ type: 'review', questionId: q.id });
      return;
    }

    const clear = target.closest(SELECTORS.clear);
    if (clear) {
      if (isDisabled(clear)) return;
      const q = questionFor(clear);
      if (q?.id && supportedControls(q).length && (isReviewed(q) || !isEmpty(q))) add({ type: 'clear', questionId: q.id });
      return;
    }

    const reviewAll = target.closest(SELECTORS.reviewAll);
    if (reviewAll) {
      if (isDisabled(reviewAll)) return;
      const beforeReviewed = reviewedIds();
      const candidates = new Set([...nonEmptyIds()].filter(id => !beforeReviewed.has(id)));
      if (candidates.size) add({ type: 'review-all', candidates });
      return;
    }

    const clearAll = target.closest(SELECTORS.clearAll);
    if (clearAll) {
      if (isDisabled(clearAll)) return;
      const candidates = new Set([...reviewedIds(), ...nonEmptyIds()]);
      if (candidates.size) add({ type: 'clear-all', candidates });
    }
  }, true);

  // drafts.js registers unload flushing first, so a successful Yle state visible
  // at unload can delete the just-flushed fallback before the next page load.
  window.addEventListener('pagehide', finalizeCurrentStatesBeforeUnload, true);
  window.addEventListener('beforeunload', finalizeCurrentStatesBeforeUnload, true);

  console.debug(`[YO-koekone Improved] v${rt.FEATURE_VERSION} feature layer ready`);
})();
