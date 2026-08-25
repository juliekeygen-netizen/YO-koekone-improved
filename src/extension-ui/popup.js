(() => {
  'use strict';
  const store = globalThis.YOISettingsStore;
  if (!store) return;

  async function render() {
    const settings = await store.get();
    for (const input of document.querySelectorAll('[data-setting]')) {
      input.checked = Boolean(settings[input.dataset.setting]);
    }
    const draftStatus = document.querySelector('[data-setting="draftStatus"]');
    if (draftStatus) draftStatus.disabled = settings.localDrafts === false;
  }

  document.addEventListener('change', async event => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.dataset.setting || input.disabled) return;
    try {
      await store.patch({ [input.dataset.setting]: input.checked });
      await render();
    } catch (error) {
      console.warn('[YO-koekone Improved] Could not save popup setting', error);
      await render();
    }
  });

  document.getElementById('options')?.addEventListener('click', () => {
    try {
      const result = store.api?.runtime?.openOptionsPage?.();
      result?.catch?.(() => {});
    } catch { /* optional */ }
    window.close();
  });

  try {
    store.api?.storage?.onChanged?.addListener?.((changes, area) => {
      if (area === 'local' && changes?.[store.KEY]) render();
    });
  } catch { /* optional */ }

  render();
})();
