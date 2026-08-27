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
