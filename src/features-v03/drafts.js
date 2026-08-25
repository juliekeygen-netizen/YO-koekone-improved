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