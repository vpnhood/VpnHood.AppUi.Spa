/// <reference types="vite/client" />
// vite-env.d.ts

// Stamped by vite.config.ts at build time.
interface ImportMetaEnv {
  readonly PACKAGE_VERSION: string;
  readonly SPA_LOCAL_BUILD_NUMBER: number;
  readonly SPA_IS_CI_BUILD: boolean;
}

// The locales the assets folder ships, listed at build time by build/assets-folder-plugin.ts.
declare module 'virtual:vh-locales' {
  export const availableLocales: string[];
}

// Long-form content in src/content/<lang>/: build/markdown-content-plugin.ts renders each file to
// an HTML fragment at build time, so nothing parses markdown at runtime.
declare module '*.md' {
  /** The front matter's title, or '' when the document has none. */
  export const title: string;
  /** The rendered HTML fragment. */
  const html: string;
  export default html;
}
