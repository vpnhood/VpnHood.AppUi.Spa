//--- Handle legacy browsers ---
import "core-js/stable";
import "regenerator-runtime/runtime";
//------------------------------
import {createApp} from 'vue'
import App from './App.vue'
import { VpnHoodApp } from './services/VpnHoodApp'
import vuetify from './theme/vuetify'
import i18n, { availableLocales, loadLocale } from './locales/i18n'
import router from './services/router'
import EngineError from "./pages/engine-error.vue"
import './assets/styles/general.css'
import './assets/styles/override.css'
import './assets/styles/rtl.css'

async function main(): Promise<void> {
  try {
    console.log("Current Mode: " + import.meta.env.MODE);

    // The fallback language, from the assets folder, before anything renders - the error page
    // below included, which is why it comes before the app is created.
    await loadLocale('en');

    // Init app
    const vpnHoodApp: VpnHoodApp = await VpnHoodApp.create();
    const app = createApp(App);

    // Set the app theme
    vuetify.theme.change(vpnHoodApp.data.features.uiTheme);

    // Set the default UI language. Its messages live in their own chunk, so they must arrive before
    // the app mounts — otherwise the first paint is in English and then snaps to the real language.
    const cultureCode: string = vpnHoodApp.data.state.currentUiCultureInfo.code;
    if (availableLocales.includes(cultureCode)) {
      await loadLocale(cultureCode);
      i18n.global.locale.value = cultureCode;
    }
    // Set Vuetify current language
    vuetify.locale.current.value = i18n.global.locale.value;

    // Add language code as a class to the body element
    window.document.body.classList.add(i18n.global.locale.value);

    // The document must carry the real language, not index.html's static lang="en". The production
    // build lowers Vuetify's logical properties (border-start-start-radius, …) into :lang()-guarded
    // physical rules for older engines, so with a wrong lang the RTL branch never matches and RTL
    // fields draw their rounded caps on the wrong side. Dev builds skip the lowering, which hides
    // the bug there.
    window.document.documentElement.lang = i18n.global.locale.value;

    // Apply custom CSS for scrollbar on the Windows platform
    if (vuetify.display.platform.value.win) {
      const styleElement = document.createElement('style');
      styleElement.textContent = `

    ::-webkit-scrollbar {
      width: 5px;
    }
    ::-webkit-scrollbar:hover {
      width: 8px;
    }

    ::-webkit-scrollbar-track {
      background-color: rgb(var(--v-theme-scroll-track));
      border-radius: 5px;
    }

    ::-webkit-scrollbar-thumb {
      background: rgb(var(--v-theme-scroll-thumb));
      transition: all .5s ease;
      border-radius: 5px;
    }

    ::-webkit-scrollbar-thumb:hover {
      background: rgb(var(--v-theme-scroll-thumb-hover));
    }
  `;
      document.head.appendChild(styleElement);
    }

    // To compensate for the delay in applying edge to edge on the first run, call it in this section as well;
    // otherwise it is called every second on the App.vue.
    vpnHoodApp.data.edgeToEdge();

    // Global catch exception
    app.config.errorHandler = (err: unknown) => vpnHoodApp.processError(err);

    // Init Vue
    app.use(i18n)
      .use(router)
      .use(vuetify)
      .mount('#app');
  }
  catch (ex: unknown) {
    console.error("Could not create client app.", ex);

    // show error page
    const app = createApp(EngineError);
    app.use(i18n)
      .use(vuetify)
      .mount('#app')
  }
}
// noinspection JSIgnoredPromiseFromCall
main();

