// The icon font is the subset in the assets folder, not @mdi/font's 1.3 MB stylesheet and four
// font files: build/icon-font-plugin.ts writes this module with the @font-face and one class per
// icon the pages use.
import 'virtual:vh-icon-font.css';
import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import { en, fa } from 'vuetify/locale';
// Components rendered as <v-*> are imported by vite-plugin-vuetify's autoImport. These four are
// imported by hand because the aliases below reference them as values, not as template tags.
import { VCard, VAlert, VBtn, VSheet } from 'vuetify/components';
import { vhBlueThemeColors, vhVioletThemeColors } from '@/theme/themes';
import { vuetifyDefaults, buttonAliases } from '@/theme/defaults';

export default createVuetify({
  locale: {
    locale: 'en',
    fallback: 'en',
    messages: { en, fa },
    rtl: { ar: true, fa: true, isRtl: true },
  },
  aliases: {
    GradSheet: VSheet,
    TonalIconBtn: VBtn,
    HomeConfigBtn: VBtn,
    ConfigCard: VCard,
    CardOnGrad: VCard,
    AlertWarning: VAlert,
    AlertInfo: VAlert,
    AlertSuccess: VAlert,
    AlertNote: VAlert,
    ...buttonAliases, // BtnStyle1..7
  },
  defaults: vuetifyDefaults,
  theme: {
    defaultTheme: 'blue',
    themes: {
      blue: {
        dark: true,
        colors: vhBlueThemeColors,
        variables: {
          'medium-emphasis-opacity': '0.8',
          'border-opacity': '0.03',
          'disabled-opacity': '0.6',
        },
      },
      violet: {
        dark: true,
        colors: vhVioletThemeColors,
        variables: {
          'medium-emphasis-opacity': '0.8',
          'border-opacity': '0.03',
        },
      },
    },
  },
});
