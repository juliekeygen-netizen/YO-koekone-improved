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