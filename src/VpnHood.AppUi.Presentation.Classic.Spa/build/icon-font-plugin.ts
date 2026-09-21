import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import subsetFont from 'subset-font';

/**
 * The icon font of the assets folder: Material Design Icons, cut down to the icons this UI names
 * (`mdi-*` in src, and Vuetify's own aliases) plus the ones the native UI names
 * (build/native-ui-icons.txt), written as ONE ttf that a WebView and Avalonia both read. @mdi/font
 * ships the full set as 1.3 MB in four formats; the subset is under 100 KB in one.
 *
 * The stylesheet that goes with it - the @font-face and one class per icon the pages use - is the
 * virtual module `virtual:vh-icon-font.css`, imported where @mdi/font's stylesheet used to be.
 *
 * The font is written beside the text faces it joins, in src/assets/fonts, so the assets-folder
 * plugin serves and copies it like every other file there; it is generated on every build and dev
 * start, so it is gitignored.
 */
export function iconFont(): Plugin {
  let root = '';
  let icons: Icons | undefined;

  return {
    name: 'vh-icon-font',

    configResolved(config) {
      root = config.root;
    },

    async buildStart() {
      icons = collectIcons(root);
      const target = path.join(root, fontSource);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, await subsetIconFont(root, icons));
    },

    resolveId(id) {
      return id === cssId ? resolvedCssId : undefined;
    },

    load(id) {
      if (id !== resolvedCssId)
        return undefined;
      if (!icons)
        throw new Error('The icon stylesheet was loaded before buildStart collected the icons.');

      return renderStylesheet(icons.web);
    }
  };
}

const fontFamily = 'Material Design Icons';
const fontFile = 'assets/fonts/MaterialDesignIcons.ttf'; // in the bundle, and in the url() below
const fontSource = 'src/assets/fonts/MaterialDesignIcons.ttf'; // where it is written and served from
const cssId = 'virtual:vh-icon-font.css';
const resolvedCssId = '\0' + cssId;
const sourceFont = 'node_modules/@mdi/font/fonts/materialdesignicons-webfont.ttf';
const sourceStylesheet = 'node_modules/@mdi/font/css/materialdesignicons.css';
const vuetifyIconSet = 'node_modules/vuetify/lib/iconsets/mdi.js';
const nativeUiIcons = 'build/native-ui-icons.txt';

interface Icons {
  /** name → code point: the icons the web UI's pages and Vuetify name */
  web: Map<string, number>;
  /** name → code point: every icon the font must carry */
  all: Map<string, number>;
}

function collectIcons(root: string): Icons {
  const codePoints = readCodePoints(root);
  function resolve(name: string, where: string): [string, number] {
    const codePoint = codePoints.get(name);
    if (codePoint === undefined)
      throw new Error(`'mdi-${name}' (${where}) is not an icon of @mdi/font.`);

    return [name, codePoint];
  }

  const web = new Map<string, number>();
  for (const name of namesIn(readTree(path.join(root, 'src'), ['.vue', '.ts'])))
    web.set(...resolve(name, 'src'));
  for (const name of namesIn(readFileSync(path.join(root, vuetifyIconSet), 'utf8')))
    web.set(...resolve(name, vuetifyIconSet));

  const all = new Map(web);
  for (const line of readFileSync(path.join(root, nativeUiIcons), 'utf8').split('\n')) {
    const name = line.trim();
    if (name.length === 0 || name.startsWith('#'))
      continue;

    all.set(...resolve(name, nativeUiIcons));
  }

  return { web, all };
}

/** Every `mdi-<name>` in the text, by name. */
function namesIn(text: string): Set<string> {
  const names = new Set<string>();
  for (const match of text.matchAll(/\bmdi-([a-z0-9]+(?:-[a-z0-9]+)*)/g))
    names.add(match[1]);

  return names;
}

/** name → code point, as @mdi/font's stylesheet assigns them. */
function readCodePoints(root: string): Map<string, number> {
  const stylesheet = readFileSync(path.join(root, sourceStylesheet), 'utf8');
  const codePoints = new Map<string, number>();
  for (const match of stylesheet.matchAll(/\.mdi-([a-z0-9-]+)::before\s*\{\s*content:\s*"\\([0-9A-F]+)"/g))
    codePoints.set(match[1], parseInt(match[2], 16));

  if (codePoints.size === 0)
    throw new Error(`No icon was read from ${sourceStylesheet}; has @mdi/font changed its stylesheet?`);

  return codePoints;
}

/** The text of every file under the folder with one of the extensions, joined. */
function readTree(folder: string, extensions: string[]): string {
  const parts: string[] = [];
  for (const entry of readdirSync(folder, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && extensions.includes(path.extname(entry.name)))
      parts.push(readFileSync(path.join(entry.parentPath, entry.name), 'utf8'));
  }

  return parts.join('\n');
}

async function subsetIconFont(root: string, icons: Icons): Promise<Buffer> {
  const font = readFileSync(path.join(root, sourceFont));
  const text = [...icons.all.values()].map(codePoint => String.fromCodePoint(codePoint)).join('');
  return subsetFont(font, text, { targetFormat: 'sfnt' });
}

// @mdi/font's own base rule, verbatim, and one rule per icon the pages use
function renderStylesheet(web: Map<string, number>): string {
  const rules = [...web.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, codePoint]) => `.mdi-${name}::before{content:"\\${codePoint.toString(16).toUpperCase()}"}`);

  return [
    `@font-face{font-family:"${fontFamily}";src:url("/${fontFile}") format("truetype");font-weight:normal;font-style:normal}`,
    `.mdi:before,.mdi-set{display:inline-block;font:normal normal normal 24px/1 "${fontFamily}";font-size:inherit;text-rendering:auto;line-height:inherit;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}`,
    ...rules
  ].join('\n');
}
