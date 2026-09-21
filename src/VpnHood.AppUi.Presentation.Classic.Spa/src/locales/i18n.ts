import { createI18n } from 'vue-i18n';
import type { I18nOptions } from 'vue-i18n';
import { availableLocales } from 'virtual:vh-locales';

// Every locale the assets folder ships, known at build time without loading any of them
// (build/assets-folder-plugin.ts). VpnHoodApp reports this list to the backend before a language
// has been chosen, so it cannot be derived from the loaded messages.
export { availableLocales };

// Typed as I18nOptions['messages'] rather than left to inference: a concrete object would narrow
// the instance's locale type and then reject every language loaded later.
const messages: I18nOptions['messages'] = {};

const i18n = createI18n({
  legacy: false,
  warnHtmlMessage: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages
});

// Reads one locale's file from the assets folder and registers it, so a user downloads their own
// language and no other. Await this before activating the locale, otherwise the UI renders in the
// fallback language instead - and load 'en' before anything renders: it is the fallback.
export async function loadLocale(code: string): Promise<void> {
  if (i18n.global.availableLocales.includes(code)) return;
  if (!availableLocales.includes(code)) throw new Error(`No locale file is shipped for '${code}'.`);

  const response = await fetch(`/assets/locales/${code}.json`);
  if (!response.ok) throw new Error(`The locale file for '${code}' could not be read: HTTP ${response.status}.`);

  i18n.global.setLocaleMessage(code, await response.json());
}

export default i18n;
