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
