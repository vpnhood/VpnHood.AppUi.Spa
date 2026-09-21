#!/usr/bin/env node
/**
 * Re-encode iOS app icons without an alpha channel.
 *
 * Apple rejects an App Store icon that carries an alpha channel (ITMS-90717, "The App Store Icon
 * ... can't be transparent nor contain an alpha channel") and it rejects on the channel being
 * PRESENT, not on any pixel actually being translucent. The guidance is no transparency at any
 * icon size, so this walks the whole appiconset rather than only the 1024.
 *
 * Every icon is checked for real translucency first and left alone if it has any: dropping alpha
 * over translucent pixels changes how they composite, and the right backdrop is a design decision
 * rather than something to guess at. Where the alpha is fully opaque — which is the case for the
 * Client icons today — the re-encode is pixel-identical.
 *
 * The re-encode is written by hand rather than through a canvas because Chromium's toDataURL always
 * emits RGBA, and landing PNG colour type 2 is the entire point. No new dependency: zlib is built
 * into Node and Chromium (already present for the screenshot pipeline) only decodes the source.
 *
 * Usage:
 *   node e2e/store-icon.mjs                      report on the Client appiconset, write to test-results/
 *   node e2e/store-icon.mjs --in-place           rewrite the icons where they live
 *   node e2e/store-icon.mjs --in <file-or-dir> [--out <dir>]
 */
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';
import zlib from 'zlib';
import { chromium } from 'playwright';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const inPath = path.resolve(argValue('--in',
  path.join(projectRoot, '..', 'VpnHood', 'src', 'Apps', 'Client.Ios',
    'Assets.xcassets', 'AppIcon.appiconset')));
const inPlace = args.includes('--in-place');
const outDir = path.resolve(argValue('--out', path.join(projectRoot, 'test-results', 'store-screenshots', 'icons')));

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

/** Truecolour (colour type 2), 8-bit, non-interlaced — the format Apple wants for the icon. */
function encodeRgbPng(rgba, width, height) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const from = (y * width + x) * 4;
      const to = y * (stride + 1) + 1 + x * 3;
      raw[to] = rgba[from];
      raw[to + 1] = rgba[from + 1];
      raw[to + 2] = rgba[from + 2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour, no alpha
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** PNG colour types 4 and 6 are the two that carry alpha. */
function hasAlphaChannel(buffer) {
  return buffer[25] === 4 || buffer[25] === 6;
}

const stat = await fs.stat(inPath);
const files = stat.isDirectory()
  ? (await fs.readdir(inPath)).filter(f => f.toLowerCase().endsWith('.png')).map(f => path.join(inPath, f))
  : [inPath];
if (files.length === 0)
  throw new Error(`No PNGs found at ${inPath}.`);

if (!inPlace) await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();
let rewritten = 0;
let skipped = 0;

for (const file of files) {
  const name = path.basename(file);
  const source = await fs.readFile(file);
  if (!hasAlphaChannel(source)) {
    console.log(`${name.padEnd(16)} already alpha-free — left alone`);
    continue;
  }

  const { width, height, rgba, translucent } = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let translucent = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] < 255) translucent++;
    return { width: canvas.width, height: canvas.height, rgba: Array.from(data), translucent };
  }, `data:image/png;base64,${source.toString('base64')}`);

  if (translucent > 0) {
    console.log(`${name.padEnd(16)} SKIPPED — ${translucent} translucent pixel(s); flatten against an intended background first`);
    skipped++;
    continue;
  }

  const encoded = encodeRgbPng(Buffer.from(rgba), width, height);
  await fs.writeFile(inPlace ? file : path.join(outDir, name), encoded);
  console.log(`${name.padEnd(16)} ${String(width).padStart(4)}x${String(height).padEnd(4)} alpha removed, pixel-identical`);
  rewritten++;
}

await browser.close();

const where = inPlace ? 'in place' : path.relative(projectRoot, outDir);
console.log(`\n${rewritten} icon(s) rewritten ${where}${skipped ? `, ${skipped} skipped` : ''}.`);
