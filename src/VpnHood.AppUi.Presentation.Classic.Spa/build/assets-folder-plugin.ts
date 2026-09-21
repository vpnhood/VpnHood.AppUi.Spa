import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * The assets folder of the bundle: the files both UIs load BY NAME at run time - this SPA over its
 * web server, and the app's native (Avalonia) UI from the same folder on disk once the app has
 * extracted the bundle. One copy on the device serves both, so nothing here may be hashed, inlined
 * or renamed by the bundler.
 *
 * The files stay in src/ where they are authored and reviewed; this plugin is what puts them in the
 * bundle verbatim, serves them from src/ in dev, and - because a name is now a contract rather than
 * an import - CHECKS at build time that every name either UI asks for is a file that exists:
 *
 *   - this SPA's names: the "/assets/..." URLs and the bare file names in src (Util.getAssetPath,
 *     the constants it is handed, the url()s in styles);
 *   - the native UI's names: build/native-ui-images.txt, written from its C# by _sync-native-assets.ps1.
 *
 * `virtual:vh-locales` names the locales shipped, known at build time without loading any of them.
 */
export function assetsFolder(): Plugin {
  let root = '';
  let outDir = '';

  return {
    name: 'vh-assets-folder',

    configResolved(config) {
      root = config.root;
      outDir = path.resolve(config.root, config.build.outDir);
    },

    buildStart() {
      checkNames(root);
    },

    resolveId(id) {
      return id === localesId ? resolvedLocalesId : undefined;
    },

    load(id) {
      if (id !== resolvedLocalesId)
        return undefined;

      return `export const availableLocales = ${JSON.stringify(localeCodes(root))};`;
    },

    // in dev there is no bundle: the files are served from where they are authored
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = sourceOf(root, request.url ?? '');
        if (file === null) {
          next();
          return;
        }

        response.setHeader('Content-Type', contentTypes[path.extname(file)] ?? 'application/octet-stream');
        response.end(readFileSync(file));
      });
    },

    closeBundle() {
      for (const folder of Object.keys(folders))
        copyFolder(path.join(root, folders[folder]), path.join(outDir, assetsFolderName, folder));
    }
  };
}

const localesId = 'virtual:vh-locales';
const resolvedLocalesId = '\0' + localesId;
const assetsFolderName = 'assets';

// what the folder holds, and where each kind is authored
const folders: Record<string, string> = {
  images: 'src/assets/images',
  flags: 'src/assets/flags',
  fonts: 'src/assets/fonts',
  locales: 'src/locales',
  content: 'src/content'
};

const contentTypes: Record<string, string> = {
  '.json': 'application/json',
  '.md': 'text/markdown',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.ttf': 'font/ttf'
};

const nativeUiImages = 'build/native-ui-images.txt';
const brandingFolder = 'public/branding';

function localeCodes(root: string): string[] {
  return readdirSync(path.join(root, folders.locales))
    .filter(name => name.endsWith('.json'))
    .map(name => name.slice(0, -'.json'.length))
    .sort();
}

/** The source file behind a request for a file of the assets folder; null for any other request. */
function sourceOf(root: string, url: string): string | null {
  const pathname = url.split('?')[0];
  const match = pathname.match(new RegExp(`^/${assetsFolderName}/([a-z]+)/(.+)$`));
  if (!match || !(match[1] in folders) || match[2].includes('..'))
    return null;

  const file = path.join(root, folders[match[1]], match[2]);
  return existsSync(file) && statSync(file).isFile() ? file : null;
}

function copyFolder(source: string, target: string): void {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    if (entry.isDirectory())
      copyFolder(from, path.join(target, entry.name));
    else if (entry.isFile())
      copyFileSync(from, path.join(target, entry.name));
  }
}

/**
 * Every name either UI asks for must be a file in the folder. A name is not an import any more, so
 * nothing else would catch a typo or a file removed from under a caller: here it fails the build,
 * where the bundler's own missing-import error used to be.
 */
function checkNames(root: string): void {
  const present = new Set<string>();
  for (const folder of Object.keys(folders)) {
    for (const name of readdirSync(path.join(root, folders[folder])))
      present.add(`${folder}/${name}`);
  }

  const missing: string[] = [];
  for (const [name, where] of referencedNames(root)) {
    if (!present.has(name))
      missing.push(`${name} (${where})`);
  }

  if (missing.length > 0)
    throw new Error(`The assets folder has no such file:\n  ${missing.join('\n  ')}`);
}

/** name in the folder ("images/rocket.webp") → where it was asked for. */
function referencedNames(root: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const file of sourceFiles(path.join(root, 'src'), ['.vue', '.ts', '.css'])) {
    const text = readFileSync(file, 'utf8');
    const where = path.relative(root, file).replaceAll('\\', '/');

    // A full URL of the folder, as a style's url() or a template's src writes it. Only the folders
    // it actually holds: "@/assets/styles/general.css" is an import of this bundle's own styles.
    for (const match of text.matchAll(new RegExp(`/${assetsFolderName}/([a-z]+)/([\\w.()-]+)`, 'g'))) {
      if (match[1] in folders)
        names.set(`${match[1]}/${match[2]}`, where);
    }

    // a bare file name, as a constant handed to Util.getAssetPath writes it
    for (const match of text.matchAll(/["'`]([\w.()-]+\.(?:webp|png|svg|mp4))["'`]/g))
      names.set(`images/${match[1]}`, where);
  }

  // one picture per look, named at run time from the theme by both UIs (split-apps.vue,
  // SplitAppsView.axaml.cs): every theme the branding folder declares must have its own
  for (const theme of readdirSync(path.join(root, brandingFolder), { withFileTypes: true }).filter(entry => entry.isDirectory()))
    names.set(`images/future-apps-${theme.name}.png`, `${brandingFolder}/${theme.name}`);

  // the native UI's names, exported from its C# by _sync-native-assets.ps1
  const nativeFile = path.join(root, nativeUiImages);
  for (const line of readFileSync(nativeFile, 'utf8').split('\n')) {
    const name = line.trim();
    if (name.length > 0 && !name.startsWith('#'))
      names.set(`images/${name}`, nativeUiImages);
  }

  return names;
}

function sourceFiles(folder: string, extensions: string[]): string[] {
  return readdirSync(folder, { withFileTypes: true, recursive: true })
    .filter(entry => entry.isFile() && extensions.includes(path.extname(entry.name)))
    .map(entry => path.join(entry.parentPath, entry.name));
}
