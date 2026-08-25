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
      if (row.parentElement !== actionRow) actionRow.appendChild(row);
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