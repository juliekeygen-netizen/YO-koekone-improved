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