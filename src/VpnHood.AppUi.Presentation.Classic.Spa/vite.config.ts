import { defineConfig } from 'vite';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'url';
import VueRouter from 'vue-router/vite'
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';
import legacy from '@vitejs/plugin-legacy';
import postcssPresetEnv from 'postcss-preset-env';
import { markdownContent } from './build/markdown-content-plugin';
import { iconFont } from './build/icon-font-plugin';
import { assetsFolder } from './build/assets-folder-plugin';
import { version } from './package.json';

// The SPA carries its own version line, bumped by CI on every published build, so a shipped bundle
// traces back to a commit in this repo. Local builds do NOT bump — the published version alone
// cannot tell a fresh local build from a stale one. A local build number can: it lives in an
// untracked file beside this config (so it is per-machine and never conflicts between developers)
// and steps by one on every local `vite build`. It is shown under the version for local builds.
// GitHub Actions sets CI=true.
const isCiBuild = process.env.CI === 'true';
const localBuildNumberFile = fileURLToPath(new URL('./.local-build-number', import.meta.url));

// A hand-edited or truncated counter file must not silently restart the count: a repeated build
// number is exactly the stale-bundle confusion this counter exists to prevent. Only a missing file
// is a legitimate "never built here yet".
function readLocalBuildNumber(): number {
  if (!existsSync(localBuildNumberFile))
    return 0;

  const raw = readFileSync(localBuildNumberFile, 'utf8').trim();
  const buildNumber = Number(raw);
  if (!Number.isInteger(buildNumber) || buildNumber < 0)
    throw new Error(`${localBuildNumberFile} holds "${raw}", which is not a build number. Delete the file to restart the count.`);

  return buildNumber;
}

// Only a real local build consumes a number; `vite dev`/`preview` and CI just report the last one.
function nextLocalBuildNumber(command: string): number {
  const buildNumber = readLocalBuildNumber();
  if (isCiBuild || command !== 'build')
    return buildNumber;

  writeFileSync(localBuildNumberFile, `${buildNumber + 1}\n`, 'utf8');
  return buildNumber + 1;
}

// https://vite.dev/config/
// noinspection JSUnusedGlobalSymbols
export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    }
  },
  server: {
    //host: '0.0.0.0',
    port: 8080,
  },
  // autoImport rewrites templates to per-component subpath imports (vuetify/components/VBtn, ...),
  // which the dep optimizer only discovers as lazy routes are visited — each discovery forces a
  // re-optimize + full reload and can 404 stale pre-bundled chunks. Vuetify is ESM, so skip it.
  optimizeDeps: {
    exclude: ['vuetify'],
  },
  // The assets folder: /assets in the bundle holds the images, the flags, the fonts, the locale
  // files and the content documents under their own names - no hash, no inlining - because the
  // pages load them from there at runtime, and so does the native UI (Avalonia) from the same
  // extracted folder. src/assets is its source (with src/locales and src/content); the two plugins add what is generated (the
  // subset icon font) and what the translator owns (locales, content). Vite's own hashed output
  // goes to /bundle so the two never mix.
  build: {
    assetsDir: 'bundle',
  },
  plugins: [
    markdownContent(),
    iconFont(),
    assetsFolder(),
    VueRouter({
      extensions: ['.vue'],
      importMode: 'async', // Keep lazy-loading
      routesFolder: [
        {
          src: 'src/pages',
          path: (file) => {
            const prefix = 'src/pages';
            // Customize path naming
            return file.slice(file.lastIndexOf(prefix) + prefix.length + 1).replace(/index$/, '').replace(/\.vue$/, '');
          },
        },
      ],
      extendRoute(route) {
        // vue-router types a nameless route as `false`; every file-based route here carries a name.
        const rawName = route.name === false ? '' : route.name;

        // Remove leading and trailing slashes, then extract the segment after the last "/"
        const segments = rawName.replace(/^\/|\/$/g, '').split('/');
        const lastSegment = segments[segments.length - 1];

        const name = rawName === '/' ? 'HOME' : lastSegment.toUpperCase().replace(/-/g, '_');
        route.name = name;

        const pageTitle = name.toLowerCase().split('_');
        route.meta = {
          title: pageTitle.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
        };
      }
    }),
    vue(),
    // Imports only the Vuetify components a template actually renders. Without this the app
    // registers all of them up front, which is most of the main chunk.
    vuetify({ autoImport: true }),
    //--- Handle legacy browsers ---
    legacy(),
    //------------------------------
  ],
  //--- Handle legacy browsers ---
  css: {
    postcss: {
      plugins: [
        postcssPresetEnv({
          features:{
            'not-pseudo-class':true,
            'logical-properties-and-values': false,
            'logical-viewport-units': false,
            // Vuetify ships @layer with revert-layer, which the cascade-layers polyfill cannot
            // emulate; it warns and flattens to different styles. Keep layers native instead.
            'cascade-layers': false
          }
        }),
      ]
    }
  },
  //------------------------------
  define: {
    'import.meta.env.PACKAGE_VERSION': JSON.stringify(version),
    'import.meta.env.SPA_LOCAL_BUILD_NUMBER': JSON.stringify(nextLocalBuildNumber(command)),
    'import.meta.env.SPA_IS_CI_BUILD': JSON.stringify(isCiBuild),
  }
}));
