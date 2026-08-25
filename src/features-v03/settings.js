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
