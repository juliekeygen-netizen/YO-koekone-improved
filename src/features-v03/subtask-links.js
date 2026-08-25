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