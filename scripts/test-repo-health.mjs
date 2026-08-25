import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const json = file => JSON.parse(read(file));
const exists = file => fs.existsSync(path.join(root, file));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const pkg = json('package.json');
const userscript = read('YO-koekone-improved.user.js');
const chromeManifest = json('extensions/chrome/manifest.json');
const firefoxManifest = json('extensions/firefox/manifest.json');
const changelog = read('CHANGELOG.md');
const readme = read('README.md');
const privacy = read('PRIVACY.md');
const storeSubmission = read('docs/STORE_SUBMISSION.md');
const amoBuild = read('docs/AMO_SOURCE_BUILD.md');
const validateWorkflow = read('.github/workflows/validate.yml');
const releaseWorkflow = read('.github/workflows/release.yml');
const buildScript = read('scripts/build.mjs');
const i18n = read('src/i18n.js');
const nonDomI18n = read('src/i18n-nondom.js');
const pageBridge = read('src/page-bridge.js');
const questionSets = read('src/features-v03/question-sets.js');
const studyHub = read('src/features-v03/study-hub.js');
const core = read('src/core.js');
const featureRuntime = read('src/features-v03/runtime.js');
const newTabs = read('src/features-v03/new-tabs.js');
const drafts = read('src/features-v03/drafts.js');
const draftUi = read('src/features-v03/draft-ui.js');
const answerSync = read('src/features-v03/answer-sync.js');
const extensionBackground = read('src/extension-background.js');

assert(/^\d+\.\d+\.\d+$/.test(pkg.version), `package version is not plain semver: ${pkg.version}`);
const metadataVersion = userscript.match(/^\/\/ @version\s+(\S+)$/m)?.[1];
assert(metadataVersion === pkg.version, `userscript version ${metadataVersion} does not match package ${pkg.version}`);
assert(chromeManifest.version === pkg.version, 'Chrome manifest version does not match package');
assert(firefoxManifest.version === pkg.version, 'Firefox manifest version does not match package');
assert((userscript.match(/^\/\/ ==UserScript==$/gm) || []).length === 1, 'userscript must contain exactly one metadata block');
assert(!/^\/\/\s*@require\b/m.test(userscript), 'standalone userscript unexpectedly contains @require');

const changelogVersion = changelog.match(/^##\s+(\d+\.\d+\.\d+)\b/m)?.[1];
assert(changelogVersion === pkg.version, `CHANGELOG newest version ${changelogVersion} does not match package ${pkg.version}`);
assert(readme.includes(`docs/AUDIT_V${pkg.version.replace(/\./g, '')}.md`), 'README does not point to the current audit document');
assert(exists(`docs/AUDIT_V${pkg.version.replace(/\./g, '')}.md`), 'current audit document is missing');

for (const required of ['PRIVACY.md', 'docs/STORE_SUBMISSION.md', 'docs/AMO_SOURCE_BUILD.md', 'scripts/test-i18n.mjs', 'src/i18n.js', 'src/i18n-nondom.js']) {
  assert(exists(required), `store/localization release file is missing: ${required}`);
}

assert(validateWorkflow.includes('concurrency:'), 'validation workflow is missing branch-scoped concurrency');
assert(validateWorkflow.includes('cancel-in-progress: true'), 'validation workflow does not cancel stale same-branch runs');
assert(validateWorkflow.includes('REMOTE_HEAD='), 'validation workflow is missing its stale generated-output writer guard');

assert(releaseWorkflow.includes('Verify release tag matches package version'), 'release workflow does not verify tag/package version parity');
assert(releaseWorkflow.includes('GITHUB_REF_NAME'), 'release workflow tag guard is incomplete');
assert(releaseWorkflow.includes('EXPECTED_TAG="v${VERSION}"'), 'release workflow does not construct the expected v<version> tag');
assert(releaseWorkflow.includes('run: npm run check'), 'release workflow does not validate the tagged tree before packaging');
assert(!releaseWorkflow.includes('npm run build'), 'release workflow must not regenerate stale tagged distributions before parity validation');
assert(releaseWorkflow.includes('YO-plus-source.zip'), 'release workflow is missing the AMO reviewer source archive');
assert(releaseWorkflow.includes('docs/AMO_SOURCE_BUILD.md'), 'reviewer source archive is missing AMO build instructions');

assert(pageBridge.includes("post('question-set-capture-failed'"), 'page bridge does not signal exact-set persistence failure');
assert(pageBridge.includes('if (!persisted?.sets?.[setId])'), 'page bridge can still advertise an unpersisted set id');
assert(questionSets.includes("msg.type === 'question-set-capture-failed'"), 'question-set UI does not handle persistence failure');
assert(questionSets.includes("throw new Error('Saved question-set storage was not cleared')"), 'saved-set clear does not verify persistent deletion');
assert(questionSets.includes('throw error;'), 'saved-set clear still swallows persistent-storage failure');
assert(studyHub.includes("throw new Error('Practice library storage did not retain the written value')"), 'Study Hub does not verify library persistence');
assert(studyHub.includes('}).catch(() => {'), 'Study Hub automatic Recent recording does not consume failed persistence/re-arm retry');

function validateRgbaPng(relative, expectedSize) {
  const bytes = fs.readFileSync(path.join(root, relative));
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert(bytes.subarray(0, 8).equals(signature), `${relative} is not a PNG`);

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  let sawIend = false;
  const idat = [];

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const chunkEnd = dataEnd + 4;
    assert(chunkEnd <= bytes.length, `${relative} contains a truncated ${type || 'PNG'} chunk`);

    if (type === 'IHDR') {
      assert(length === 13, `${relative} has malformed IHDR`);
      width = bytes.readUInt32BE(dataStart);
      height = bytes.readUInt32BE(dataStart + 4);
      bitDepth = bytes[dataStart + 8];
      colorType = bytes[dataStart + 9];
      interlace = bytes[dataStart + 12];
    } else if (type === 'IDAT') {
      idat.push(bytes.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      assert(length === 0, `${relative} has malformed IEND`);
      sawIend = true;
      offset = chunkEnd;
      break;
    }
    offset = chunkEnd;
  }

  assert(width === expectedSize && height === expectedSize, `${relative} dimensions are ${width}x${height}, expected ${expectedSize}x${expectedSize}`);
  assert(bitDepth === 8 && colorType === 6 && interlace === 0, `${relative} must be 8-bit non-interlaced RGBA PNG`);
  assert(idat.length > 0 && sawIend && offset === bytes.length, `${relative} PNG structure is incomplete`);

  let inflated;
  try { inflated = zlib.inflateSync(Buffer.concat(idat)); }
  catch (error) { throw new Error(`${relative} has corrupt PNG image data: ${error.message}`); }
  const expectedInflatedBytes = (expectedSize * 4 + 1) * expectedSize;
  assert(inflated.length === expectedInflatedBytes, `${relative} decoded payload is incomplete (${inflated.length}/${expectedInflatedBytes} bytes)`);
}

const expectedIconSizes = ['16', '32', '48', '64', '96', '128'];
for (const size of expectedIconSizes) validateRgbaPng(`assets/icons/icon-${size}.png`, Number(size));

for (const [name, manifest] of [['Chrome', chromeManifest], ['Firefox', firefoxManifest]]) {
  assert(manifest.manifest_version === 3, `${name} manifest is not MV3`);
  assert(manifest.name === 'YO+ for Abitreenit', `${name} manifest store name is not YO+ for Abitreenit`);
  assert(manifest.short_name === 'YO+', `${name} short name is not YO+`);
  assert(Array.isArray(manifest.permissions), `${name} manifest permissions are malformed`);
  assert(JSON.stringify(manifest.permissions) === JSON.stringify(['storage']), `${name} manifest permissions unexpectedly expanded`);
  assert(!manifest.host_permissions, `${name} unexpectedly gained a separate host_permissions grant`);
  assert(manifest.content_scripts?.every(item => item.matches?.length === 1 && item.matches[0] === 'https://yle.fi/abitreenit/harjoittele*'), `${name} content-script scope unexpectedly broadened`);
  assert(JSON.stringify(Object.keys(manifest.icons || {}).sort((a, b) => Number(a) - Number(b))) === JSON.stringify(expectedIconSizes), `${name} manifest icon sizes are incomplete`);
  for (const size of expectedIconSizes) {
    assert(manifest.icons?.[size] === `icons/icon-${size}.png`, `${name} icon path is wrong for ${size}`);
    assert(exists(`extensions/${name.toLowerCase()}/icons/icon-${size}.png`), `${name} generated icon missing for ${size}`);
    validateRgbaPng(`extensions/${name.toLowerCase()}/icons/icon-${size}.png`, Number(size));
    const sourceBytes = fs.readFileSync(path.join(root, `assets/icons/icon-${size}.png`));
    const generatedBytes = fs.readFileSync(path.join(root, `extensions/${name.toLowerCase()}/icons/icon-${size}.png`));
    assert(sourceBytes.equals(generatedBytes), `${name} generated icon bytes differ from source for ${size}`);
  }
  for (const size of ['16', '32', '48']) {
    assert(manifest.action?.default_icon?.[size] === `icons/icon-${size}.png`, `${name} toolbar icon missing for ${size}`);
  }
}

assert(firefoxManifest.browser_specific_settings?.gecko?.id === 'yo-koekone-improved@juliekeygen-netizen', 'Firefox stable Gecko ID changed');
assert(firefoxManifest.browser_specific_settings?.gecko?.strict_min_version === '128.0', 'Firefox minimum version changed unexpectedly');
assert(JSON.stringify(firefoxManifest.browser_specific_settings?.gecko?.data_collection_permissions?.required) === JSON.stringify(['none']), 'Firefox data collection declaration is not none');

assert(buildScript.includes("'src/i18n.js'"), 'build does not include i18n source');
assert(buildScript.includes("'src/i18n-nondom.js'"), 'build does not include non-DOM i18n source');
assert(buildScript.includes("name: 'YO+ for Abitreenit'"), 'generated manifest branding is missing');
assert(i18n.includes("Object.freeze(['fi', 'en', 'sv'])"), 'FI/EN/SV language allowlist missing');
assert(i18n.includes('OWNED_PAGE_SELECTOR'), 'page localization lacks an owned-UI boundary');
assert(nonDomI18n.includes('unknown/native Yle strings pass through unchanged'), 'non-DOM localization safety boundary is undocumented in code');
assert(core.includes("=== 'kevät' ? 'kevat' : 'syksy'"), 'core spring route is not ASCII canonicalized');
assert(featureRuntime.includes("=== 'kevät' ? 'kevat' : 'syksy'"), 'feature runtime spring route is not ASCII canonicalized');
assert(core.includes('exam "${examSlug}" option'), 'deep-link restore must wait for the requested exam option');
assert(core.includes('mappings.subjectApi[routeSlug] = exactSubject'), 'exact Yle API subject must stay internal instead of replacing readable route slug');
assert(core.includes("forceReselect: reason === 'initial-load'"), 'initial deep links must force a real subject re-selection');
assert(core.includes('const liveInput = examInput();'), 'exam restore must follow a remounted live combobox');
assert(studyHub.includes('function scheduleHubSettle()'), 'Study Hub is missing bounded selector-settle retries');
assert(core.includes('Object.getPrototypeOf(el)'), 'core synthetic input setter is not bound to the actual DOM element realm');
assert(!core.includes('event.target instanceof Element'), 'core route event handling regressed to realm-sensitive Element identity');
assert(!core.includes('input instanceof HTMLInputElement'), 'core input handling regressed to realm-sensitive HTMLInputElement identity');
assert(questionSets.includes('event.composedPath()'), 'question-set Shuffle hit testing is not cross-realm safe');
assert(!questionSets.includes('event.target instanceof Element'), 'question-set coordinator regressed to realm-sensitive Element identity');
assert(studyHub.includes('element.getClientRects().length === 0'), 'Study Hub visibility is not ancestor/layout aware');
assert(studyHub.includes('function elementLike(node)'), 'Study Hub mutation tracking lacks DOM capability checks');
assert(!studyHub.includes('record.target instanceof Element'), 'Study Hub mutation tracking regressed to realm-sensitive Element identity');
assert(studyHub.includes('if (!isSelectionView() && !document.getElementById(HUB_ID)) return;'), 'Study Hub settle timers are not gated on relevant UI state');

const realmAuditedSources = [
  'src/features-v03/runtime.js',
  'src/i18n.js',
  'src/i18n-nondom.js',
  'src/features-v03/settings.js',
  'src/features-v03/settings-bridge.js',
  'src/features-v03/settings-effects.js',
  'src/features-v03/question-sets.js',
  'src/features-v03/new-tabs.js',
  'src/features-v03/subtask-links.js',
  'src/core.js',
  'src/features-v03/title-sync.js',
  'src/features-v03/study-hub.js',
  'src/features-v03/ui-customizations.js',
  'src/features-v03/draft-ui.js',
  'src/features-v03/drafts.js',
  'src/features-v03/answer-sync.js'
];
for (const file of realmAuditedSources) {
  const withoutComments = read(file)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
  assert(
    !/\binstanceof\s+(?:Element|HTMLElement|HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement)\b/.test(withoutComments),
    `${file} still uses realm-sensitive DOM constructor identity`
  );
}
assert(!pageBridge.includes('instanceof pageWindow.Request'), 'page bridge regressed to Request wrapper identity checks');
assert(pageBridge.includes("typeof input.url === 'string'"), 'page bridge lacks Request-like capability detection');
assert(pageBridge.includes("typeof input.clone === 'function'"), 'page bridge Request-like guard is too broad');
assert(i18n.includes('let extensionLanguageWriteQueue = Promise.resolve()'), 'extension language writes are not serialized');
assert(i18n.includes('pendingExtensionLanguageTargets'), 'extension language storage echoes are not matched against queued local targets');
assert(i18n.includes('const olderLocalEcho = Boolean('), 'extension language echo guard is missing');
assert(i18n.includes('let extensionStorageRevision = 0'), 'extension language startup lacks stale-read revision protection');
assert(newTabs.includes('response => Boolean(response?.ok)'), 'modified-click extension tabs do not wait for a real background acknowledgment');
assert(newTabs.includes('if (!opened) fallbackOpenTab(url)'), 'modified-click extension failure has no browser fallback');
assert(extensionBackground.includes('() => ({ ok: true })'), 'background tab creation does not acknowledge success');
assert(featureRuntime.includes('Local draft storage did not retain the written value'), 'draft storage writes are not verified');
assert(featureRuntime.includes('let draftStorageReadFailed = false'), 'draft storage read failures can still masquerade as an empty authoritative store');
assert(featureRuntime.includes("raw = sessionStorage.getItem(DRAFT_KEY) || '{}'"), 'draft storage access and JSON parse failures are not separated');
assert(featureRuntime.includes('Ignoring corrupt local draft data'), 'corrupt extension-owned draft JSON is not recoverable');
assert(featureRuntime.includes('if (draftStorageReadFailed) return false;'), 'draft writes/deletes do not fail safe after an unreadable base snapshot');
assert(featureRuntime.includes('if (!deleteDrafts([...wanted])) return false;'), 'draft discard can still claim success after persistent deletion failure');
assert(drafts.includes("report(id, 'failed')"), 'draft save failure is not surfaced to the UI');
assert(drafts.includes('control.ownerDocument?.defaultView?.Event'), 'draft synthetic events do not use the native control realm');
assert(core.includes('el.ownerDocument?.defaultView?.Event'), 'core synthetic events do not use the native control realm');
assert(draftUi.includes("status.key === 'failed'"), 'draft status UI does not explain a failed local save');
assert(answerSync.includes('if (!discardDrafts(unique))'), 'answer synchronization can release restore suppression after failed draft deletion');
assert(answerSync.includes('cleanupPending: new Set()'), 'proven Yle actions do not retain storage-cleanup state after DOM detachment');
assert(answerSync.includes('const cleanupIds = new Set(action.cleanupPending || [])'), 'answer-action timeout can still re-enable stale draft restore after cleanup failure');
assert(studyHub.includes('rt.forgetRecentExam = forgetRecentExam'), 'Study Hub does not expose locked Recent deletion');
assert(studyHub.includes('function forgetRecentExam(key)'), 'Study Hub locked Recent deletion helper is missing');
assert(nonDomI18n.includes('runtime?.forgetRecentExam'), 'right-click Recent deletion bypasses Study Hub mutation serialization');

assert(studyHub.includes("route?.kind === 'home' || route?.kind === 'subject' || selectorVisible"), 'Study Hub must follow the visible selector DOM during failed/pending deep-link restore');

assert(/does not (?:run|use|have) a developer-operated server/i.test(privacy), 'Privacy Policy does not disclose absence of a developer server');
assert(/does not contain analytics/i.test(privacy), 'Privacy Policy does not disclose analytics behavior');
assert(/sessionStorage/.test(privacy) && /localStorage/.test(privacy), 'Privacy Policy does not accurately describe local draft/library storage');
assert(/not affiliated with or endorsed by Yle/i.test(privacy), 'Privacy Policy is missing the Yle independence statement');
assert(storeSubmission.includes('YO+ for Abitreenit'), 'store submission guide is missing product identity');
assert(storeSubmission.includes('1280×800'), 'store submission guide is missing screenshot dimensions');
assert(amoBuild.includes('npm run build') && amoBuild.includes('npm run check'), 'AMO source build instructions are incomplete');

const forbiddenExtensions = new Set(['.har', '.crx', '.xpi']);
const allowedZipPrefix = path.join(root, 'dist') + path.sep;
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else {
      const ext = path.extname(entry.name).toLowerCase();
      assert(!forbiddenExtensions.has(ext), `diagnostic/release binary should not be committed: ${path.relative(root, full)}`);
      if (ext === '.zip') assert(full.startsWith(allowedZipPrefix), `ZIP should not be committed outside dist/: ${path.relative(root, full)}`);
    }
  }
}
walk(root);

console.log('Repository / store-readiness health checks passed.');
