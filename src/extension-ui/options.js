(() => {
  'use strict';
  const store = globalThis.YOISettingsStore;
  if (!store) return;
  let savedTimer = null;

  function flashSaved(text = 'Tallennettu') {
    const status = document.getElementById('saved');
    if (!status) return;
    status.textContent = text;
    if (savedTimer) clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { status.textContent = ''; }, 1600);
  }

  function applyDependencies(settings) {
    const hubEnabled = settings.studyHub !== false;
    const questionPracticeEnabled = hubEnabled && settings.showQuestionPracticeInHub !== false;
    const questionToggle = document.querySelector('[data-setting="showQuestionPracticeInHub"]');
    if (questionToggle) questionToggle.disabled = !hubEnabled;
    const sessionDetail = document.querySelector('[data-setting="singleQuestionPracticeRecent"]');
    if (sessionDetail) sessionDetail.disabled = !questionPracticeEnabled;
    const recent = document.querySelector('[data-number="recentLimit"]');
    if (recent) recent.disabled = !hubEnabled;
    const draftStatus = document.querySelector('[data-setting="draftStatus"]');
    if (draftStatus) draftStatus.disabled = settings.localDrafts === false;
  }

  async function render() {
    const settings = await store.get();
    for (const input of document.querySelectorAll('[data-setting]')) {
      input.checked = Boolean(settings[input.dataset.setting]);
    }
    const recent = document.querySelector('[data-number="recentLimit"]');
    if (recent) recent.value = String(settings.recentLimit);
    applyDependencies(settings);
  }

  document.addEventListener('change', async event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.disabled) return;
    try {
      if (input.dataset.setting) {
        await store.patch({ [input.dataset.setting]: input.checked });
      } else if (input.dataset.number) {
        await store.patch({ [input.dataset.number]: Number(input.value) });
      } else {
        return;
      }
      await render();
      flashSaved();
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not save extension setting', error);
      await render();
      flashSaved('Tallennus epäonnistui');
    }
  });

  document.getElementById('reset')?.addEventListener('click', async () => {
    try {
      await store.reset();
      await render();
      flashSaved('Oletukset palautettu');
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not reset extension settings', error);
      flashSaved('Palautus epäonnistui');
    }
  });

  try {
    store.api?.storage?.onChanged?.addListener?.((changes, area) => {
      if (area === 'local' && changes?.[store.KEY]) render();
    });
  } catch { /* optional */ }

  render();
})();
