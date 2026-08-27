import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n').trimEnd() + '\n';
const check = process.argv.includes('--check');

const contentSourceOrder = [
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
const sources = contentSourceOrder.map(read);
const pageBridge = read('src/page-bridge.js');
const extensionBackground = read('src/extension-background.js');
const extensionUiFiles = [
  'settings-store.js',
  'popup.html',
  'popup.css',
  'popup.js',
  'options.html',
  'options.css',
  'options.js'
];
const iconSizes = [16, 32, 48, 64, 96, 128];

// The originally supplied 128px PNG was discovered to have a damaged IDAT
// payload during final store-readiness validation. Derive a deterministic 128px
// RGBA PNG from the intact 96px artwork so a normal build can repair and commit
// the source asset without relying on an external image tool or package.
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data = Buffer.alloc(0)) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodeRgbaPng(bytes) {
  if (!bytes.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error('icon-96.png is not a PNG');
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = -1;
  let interlace = -1;
  const idat = [];

  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    const chunkEnd = end + 4;
    if (chunkEnd > bytes.length) throw new Error(`icon-96.png has truncated ${type || 'PNG'} data`);
    if (type === 'IHDR') {
      width = bytes.readUInt32BE(start);
      height = bytes.readUInt32BE(start + 4);
      bitDepth = bytes[start + 8];
      colorType = bytes[start + 9];
      interlace = bytes[start + 12];
    } else if (type === 'IDAT') idat.push(bytes.subarray(start, end));
    else if (type === 'IEND') break;
    offset = chunkEnd;
  }

  if (bitDepth !== 8 || colorType !== 6 || interlace !== 0 || !idat.length) {
    throw new Error('icon-96.png must be an 8-bit non-interlaced RGBA PNG');
  }

  const filtered = zlib.inflateSync(Buffer.concat(idat));
  const rowBytes = width * 4;
  if (filtered.length !== (rowBytes + 1) * height) throw new Error('icon-96.png decoded payload is incomplete');
  const pixels = Buffer.alloc(rowBytes * height);
  let input = 0;

  for (let y = 0; y < height; y++) {
    const filter = filtered[input++];
    const row = y * rowBytes;
    for (let x = 0; x < rowBytes; x++) {
      const raw = filtered[input++];
      const left = x >= 4 ? pixels[row + x - 4] : 0;
      const up = y > 0 ? pixels[row - rowBytes + x] : 0;
      const upLeft = y > 0 && x >= 4 ? pixels[row - rowBytes + x - 4] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = up;
      else if (filter === 3) predictor = Math.floor((left + up) / 2);
      else if (filter === 4) predictor = paeth(left, up, upLeft);
      else if (filter !== 0) throw new Error(`icon-96.png uses unsupported PNG filter ${filter}`);
      pixels[row + x] = (raw + predictor) & 0xff;
    }
  }
  return { width, height, pixels };
}

function resizeBilinearRgba(source, targetWidth, targetHeight) {
  const out = Buffer.alloc(targetWidth * targetHeight * 4);
  for (let y = 0; y < targetHeight; y++) {
    const sourceY = Math.max(0, Math.min(source.height - 1, ((y + 0.5) * source.height / targetHeight) - 0.5));
    const y0 = Math.floor(sourceY);
    const y1 = Math.min(source.height - 1, y0 + 1);
    const fy = sourceY - y0;
    for (let x = 0; x < targetWidth; x++) {
      const sourceX = Math.max(0, Math.min(source.width - 1, ((x + 0.5) * source.width / targetWidth) - 0.5));
      const x0 = Math.floor(sourceX);
      const x1 = Math.min(source.width - 1, x0 + 1);
      const fx = sourceX - x0;
      const p00 = (y0 * source.width + x0) * 4;
      const p10 = (y0 * source.width + x1) * 4;
      const p01 = (y1 * source.width + x0) * 4;
      const p11 = (y1 * source.width + x1) * 4;
      const dst = (y * targetWidth + x) * 4;
      for (let channel = 0; channel < 4; channel++) {
        const top = source.pixels[p00 + channel] * (1 - fx) + source.pixels[p10 + channel] * fx;
        const bottom = source.pixels[p01 + channel] * (1 - fx) + source.pixels[p11 + channel] * fx;
        out[dst + channel] = Math.round(top * (1 - fy) + bottom * fy);
      }
    }
  }
  return out;
}

function encodeRgbaPng(width, height, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const rowBytes = width * 4;
  const raw = Buffer.alloc((rowBytes + 1) * height);
  for (let y = 0; y < height; y++) {
    const rawRow = y * (rowBytes + 1);
    raw[rawRow] = 0;
    pixels.copy(raw, rawRow + 1, y * rowBytes, (y + 1) * rowBytes);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    pngChunk('IEND')
  ]);
}

const icon96Path = path.join(root, 'assets', 'icons', 'icon-96.png');
const icon128Path = path.join(root, 'assets', 'icons', 'icon-128.png');
if (!fs.existsSync(icon96Path)) throw new Error('source icon is missing: assets/icons/icon-96.png');
const decoded96 = decodeRgbaPng(fs.readFileSync(icon96Path));
if (decoded96.width !== 96 || decoded96.height !== 96) throw new Error('icon-96.png dimensions changed unexpectedly');
const expectedIcon128 = encodeRgbaPng(128, 128, resizeBilinearRgba(decoded96, 128, 128));
if (!check) {
  const current128 = fs.existsSync(icon128Path) ? fs.readFileSync(icon128Path) : null;
  if (!current128 || !current128.equals(expectedIcon128)) {
    fs.writeFileSync(icon128Path, expectedIcon128);
    console.log('repaired assets/icons/icon-128.png from icon-96.png');
  }
}

const runtimeVersionPattern = /const FEATURE_VERSION = '[^']+';/;
if (!runtimeVersionPattern.test(sources[0])) throw new Error('feature runtime version marker was not found');
sources[0] = sources[0].replace(runtimeVersionPattern, `const FEATURE_VERSION = '${version}';`);

const coreIndex = contentSourceOrder.indexOf('src/core.js');
if (coreIndex < 0) throw new Error('core source was not found in source order');
const nestedUserscriptHeader = /^\/\/ ==UserScript==\n[\s\S]*?^\/\/ ==\/UserScript==\n+/m;
sources[coreIndex] = sources[coreIndex].replace(nestedUserscriptHeader, '');
const coreVersionPattern = /const VERSION = '[^']+';/;
if (!coreVersionPattern.test(sources[coreIndex])) throw new Error('core version marker was not found');
sources[coreIndex] = sources[coreIndex].replace(coreVersionPattern, `const VERSION = '${version}';`);

const sourceLabel = 'runtime -> i18n -> i18n-nondom -> settings -> settings-bridge -> settings-effects -> question-sets -> new-tabs -> subtask-links -> core -> title-sync -> study-hub -> ui-customizations -> draft-ui -> drafts -> answer-sync';
const bundleBanner = `// YO+ for Abitreenit v${version} — standalone generated bundle\n// Source order: ${sourceLabel}\n`;
const contentBundle = `${bundleBanner}\n${sources.join('\n')}`;
const userscriptBundle = `// Main-world public question-carousel bridge\n${pageBridge}\n${contentBundle}`;

const raw = 'https://raw.githubusercontent.com/juliekeygen-netizen/YO-koekone-improved/main';
const userscriptHeader = `// ==UserScript==\n// @name         YO+ for Abitreenit\n// @namespace    https://github.com/juliekeygen-netizen/YO-koekone-improved\n// @version      ${version}\n// @description  Unofficial study companion for Yle Abitreenit with readable routes, local draft recovery and practice-session tools.\n// @author       juliekeygen-netizen + ChatGPT\n// @match        https://yle.fi/abitreenit/harjoittele*\n// @run-at       document-start\n// @grant        GM_openInTab\n// @grant        unsafeWindow\n// @grant        GM_registerMenuCommand\n// @homepageURL  https://github.com/juliekeygen-netizen/YO-koekone-improved\n// @supportURL   https://github.com/juliekeygen-netizen/YO-koekone-improved/issues\n// @downloadURL  ${raw}/YO-koekone-improved.user.js\n// @updateURL    ${raw}/YO-koekone-improved.user.js\n// ==/UserScript==\n`;
const standalone = `${userscriptHeader}\n${userscriptBundle}`;

if (/^\/\/\s*@require\b/m.test(standalone)) throw new Error('standalone userscript must not contain @require dependencies');
if ((standalone.match(/^\/\/ ==UserScript==$/gm) || []).length !== 1) throw new Error('standalone userscript must contain exactly one metadata block');
if (/^\/\/ ==UserScript==$/m.test(contentBundle) || /^\/\/ ==UserScript==$/m.test(pageBridge)) throw new Error('extension/runtime sources must not contain userscript metadata');

const iconMap = Object.fromEntries(iconSizes.map(size => [String(size), `icons/icon-${size}.png`]));
const actionIconMap = {
  '16': 'icons/icon-16.png',
  '32': 'icons/icon-32.png',
  '48': 'icons/icon-48.png'
};

const manifestBase = {
  manifest_version: 3,
  name: 'YO+ for Abitreenit',
  short_name: 'YO+',
  version,
  description: 'Unofficial study companion for Yle Abitreenit with readable routes, local draft recovery and practice-session tools.',
  permissions: ['storage'],
  icons: iconMap,
  action: {
    default_title: 'YO+',
    default_icon: actionIconMap,
    default_popup: 'popup.html'
  },
  options_ui: {
    page: 'options.html',
    open_in_tab: true
  },
  content_scripts: [
    {
      matches: ['https://yle.fi/abitreenit/harjoittele*'],
      js: ['page-bridge.js'],
      run_at: 'document_start',
      world: 'MAIN'
    },
    {
      matches: ['https://yle.fi/abitreenit/harjoittele*'],
      js: ['content.js'],
      run_at: 'document_start',
      world: 'ISOLATED'
    }
  ]
};

const chromeManifest = {
  ...manifestBase,
  background: { service_worker: 'background.js' }
};

const firefoxManifest = {
  ...manifestBase,
  background: { scripts: ['background.js'] },
  browser_specific_settings: {
    gecko: {
      id: 'yo-koekone-improved@juliekeygen-netizen',
      strict_min_version: '140.0',
      data_collection_permissions: {
        required: ['none']
      }
    }
  }
};

const generated = new Map([
  ['YO-koekone-improved.user.js', standalone],
  ['extensions/chrome/content.js', contentBundle],
  ['extensions/chrome/page-bridge.js', pageBridge],
  ['extensions/chrome/background.js', extensionBackground],
  ['extensions/chrome/i18n.js', read('src/i18n.js')],
  ['extensions/firefox/content.js', contentBundle],
  ['extensions/firefox/page-bridge.js', pageBridge],
  ['extensions/firefox/background.js', extensionBackground],
  ['extensions/firefox/i18n.js', read('src/i18n.js')],
  ['extensions/chrome/manifest.json', JSON.stringify(chromeManifest, null, 2) + '\n'],
  ['extensions/firefox/manifest.json', JSON.stringify(firefoxManifest, null, 2) + '\n']
]);

for (const file of extensionUiFiles) {
  const content = read(`src/extension-ui/${file}`);
  generated.set(`extensions/chrome/${file}`, content);
  generated.set(`extensions/firefox/${file}`, content);
}

const generatedBinary = new Map();
for (const size of iconSizes) {
  const source = path.join(root, 'assets', 'icons', `icon-${size}.png`);
  if (!fs.existsSync(source)) throw new Error(`source icon is missing: assets/icons/icon-${size}.png`);
  const bytes = fs.readFileSync(source);
  generatedBinary.set(`extensions/chrome/icons/icon-${size}.png`, bytes);
  generatedBinary.set(`extensions/firefox/icons/icon-${size}.png`, bytes);
}

const staleExtensionFiles = [
  'extensions/chrome/runtime.js',
  'extensions/chrome/new-tabs.js',
  'extensions/chrome/title-sync.js',
  'extensions/chrome/drafts.js',
  'extensions/chrome/answer-sync.js',
  'extensions/firefox/runtime.js',
  'extensions/firefox/new-tabs.js',
  'extensions/firefox/title-sync.js',
  'extensions/firefox/drafts.js',
  'extensions/firefox/answer-sync.js'
];

let failed = false;
if (check) {
  const actual128 = fs.existsSync(icon128Path) ? fs.readFileSync(icon128Path) : null;
  if (!actual128 || !actual128.equals(expectedIcon128)) {
    console.error('Derived source icon is missing or stale: assets/icons/icon-128.png');
    failed = true;
  }
}

for (const [relative, expected] of generated) {
  const target = path.join(root, relative);
  if (check) {
    const actual = fs.existsSync(target) ? fs.readFileSync(target, 'utf8').replace(/\r\n/g, '\n') : null;
    if (actual !== expected) {
      console.error(`Generated file is missing or stale: ${relative}`);
      failed = true;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, expected, 'utf8');
    console.log(`generated ${relative}`);
  }
}

for (const [relative, expected] of generatedBinary) {
  const target = path.join(root, relative);
  if (check) {
    const actual = fs.existsSync(target) ? fs.readFileSync(target) : null;
    if (!actual || !actual.equals(expected)) {
      console.error(`Generated binary file is missing or stale: ${relative}`);
      failed = true;
    }
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, expected);
    console.log(`generated ${relative}`);
  }
}

for (const relative of staleExtensionFiles) {
  const target = path.join(root, relative);
  if (check) {
    if (fs.existsSync(target)) {
      console.error(`Legacy split extension file should be removed: ${relative}`);
      failed = true;
    }
  } else if (fs.existsSync(target)) {
    fs.rmSync(target);
    console.log(`removed ${relative}`);
  }
}

if (check && failed) {
  console.error('Run "npm run build" and commit generated files.');
  process.exit(1);
}
if (check) console.log('Standalone generated distributions are in sync.');
