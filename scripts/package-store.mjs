import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
const distDir = path.join(root, 'dist');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '').trim();

if (!/^\d+\.\d+\.\d+$/.test(version)) {
  throw new Error(`Invalid package version: ${version || '(missing)'}`);
}

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

function collectFiles(sourceDir) {
  const files = [];
  const walk = current => {
    const entries = fs.readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, 'en'));
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Refusing to package symlink: ${full}`);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  };
  walk(sourceDir);
  return files;
}

function zipEntryName(sourceDir, fullPath) {
  const name = path.relative(sourceDir, fullPath).split(path.sep).join('/');
  if (!name || name.startsWith('../') || name.includes('\\')) {
    throw new Error(`Unsafe ZIP entry name: ${name}`);
  }
  return name;
}

function writeZip(sourceDir, outputPath) {
  const files = collectFiles(sourceDir);
  if (!files.length) throw new Error(`Nothing to package from ${sourceDir}`);
  if (files.length > 0xffff) throw new Error('Too many files for standard ZIP archive');

  const locals = [];
  const centrals = [];
  let localOffset = 0;
  const utf8Flag = 0x0800;
  const method = 8; // DEFLATE
  const dosTime = 0;
  const dosDate = 0x21; // 1980-01-01, deterministic package metadata

  for (const fullPath of files) {
    const name = zipEntryName(sourceDir, fullPath);
    const nameBytes = Buffer.from(name, 'utf8');
    const data = fs.readFileSync(fullPath);
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(utf8Flag, 6);
    local.writeUInt16LE(method, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28);
    locals.push(local, nameBytes, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(utf8Flag, 8);
    central.writeUInt16LE(method, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(localOffset, 42);
    centrals.push(central, nameBytes);

    localOffset += local.length + nameBytes.length + compressed.length;
  }

  const centralOffset = localOffset;
  const centralSize = centrals.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(centralOffset, 16);
  end.writeUInt16LE(0, 20);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, Buffer.concat([...locals, ...centrals, end]));
  return files.map(file => zipEntryName(sourceDir, file));
}

function assertGeneratedVersion(browser) {
  const manifestPath = path.join(root, 'extensions', browser, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (manifest.version !== version) {
    throw new Error(`${browser} manifest is ${manifest.version}, but package.json is ${version}. Run npm run build first.`);
  }
}

fs.mkdirSync(distDir, { recursive: true });
for (const browser of ['chrome', 'firefox']) assertGeneratedVersion(browser);

for (const browser of ['chrome', 'firefox']) {
  const sourceDir = path.join(root, 'extensions', browser);
  const output = path.join(distDir, `YO-plus-${browser}-${version}.zip`);
  const entries = writeZip(sourceDir, output);
  if (!entries.includes('manifest.json')) throw new Error(`${browser} ZIP is missing root manifest.json`);
  if (entries.some(name => name.includes('\\'))) throw new Error(`${browser} ZIP contains Windows-style path separators`);
  console.log(`created ${path.relative(root, output)} (${entries.length} files, POSIX ZIP paths)`);
}
