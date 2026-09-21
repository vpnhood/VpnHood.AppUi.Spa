#!/usr/bin/env node
/**
 * Scan project for unused i18n keys (based on en.json)
 * Modes:
 *  - Lenient (default): counts key as used if translation call OR raw quoted key string appears (e.g., title: "ALWAYS_ON").
 *  - Strict (--strict): only translation call patterns (original behavior).
 * Limitations:
 *  - Won't catch dynamically constructed keys (e.g., t(prefix + key)). Those will appear as unused.
 *  - Only scans .vue, .ts, .js, .mjs, .cjs files under src/.
 *  - Translation patterns: t('KEY'), t("KEY"), i18n.global.t('KEY'), locale('KEY'), $t('KEY')
 */
import { promises as fs } from 'fs';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const localesPath = path.join(projectRoot, 'src', 'locales', 'en.json');
const srcPath = path.join(projectRoot, 'src');

function flatten(obj, prefix = '', out = {}) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out); else out[key] = true;
  }
  return out;
}

async function loadKeys() {
  const raw = await fs.readFile(localesPath, 'utf8');
  const json = JSON.parse(raw);
  return Object.keys(flatten(json));
}

async function listSourceFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...await listSourceFiles(full));
    else if (/\.(vue|ts|js|mjs|cjs)$/.test(e.name)) files.push(full);
  }
  return files;
}

function buildStrictRegexForKey(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`);
  return new RegExp(`(?:i18n\\.global\\.t|(?:^|[^A-Za-z0-9_])t|locale|\\$t)\\(\\s*['\"]${escaped}['\"]`);
}

function buildLenientRegexForKey(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, r => `\\${r}`);
  return new RegExp(`(?:['\"]${escaped}['\"]|(?:i18n\\.global\\.t|(?:^|[^A-Za-z0-9_])t|locale|\\$t)\\(\\s*['\"]${escaped}['\"])`);
}

async function main() {
  const allKeys = await loadKeys();
  const files = await listSourceFiles(srcPath);
  const isStrict = process.argv.includes('--strict');

  const fileCache = new Map();
  async function fileContains(regex) {
    for (const f of files) {
      let content = fileCache.get(f);
      if (content === undefined) {
        content = await fs.readFile(f, 'utf8');
        fileCache.set(f, content);
      }
      if (regex.test(content)) return true;
    }
    return false;
  }

  const unused = [];
  for (const key of allKeys) {
    const regex = isStrict ? buildStrictRegexForKey(key) : buildLenientRegexForKey(key);
    const used = await fileContains(regex);
    if (!used) unused.push(key);
  }

  unused.sort();
  const total = allKeys.length;
  console.log(`Total keys: ${total}`);
  console.log(`Mode: ${isStrict ? 'STRICT' : 'LENIENT'}`);
  console.log(`Unused keys (${unused.length}):`);
  for (const k of unused) console.log(k);

  if (unused.length) {
    console.log('\nTip: Use --strict for fewer assumptions; verify dynamic usages before removing.');
  } else {
    console.log('\nGreat! No unused keys detected in this mode.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
