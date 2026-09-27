import { myColors } from './colors';
import type { ThemeColorNames } from './types';

// Helper to enforce exact keys (TS 4.9+ recommended)
const defineTheme = <T extends ThemeColorNames>(t: T) => t;

// -- violet --
export const vhVioletThemeColors = defineTheme({
  background: myColors.purple['500'],
  surface: myColors.purple['500'],
  'on-background':'#ffffff',
  'colored-bg-light': myColors.purple['500'],
  'colored-bg-dark': myColors.purple['600'],
  'app-bg': myColors.purple['500'],
  'rate-icon': myColors.purple['200'],
  'rate-dialog-border': myColors.purple['200'],
  'rate-dialog-thanks': myColors.green['200'],

  'app-bar': myColors.purple['500'],
  'on-app-bar': '#ffffff',
  'skeleton-loader': myColors.purple['300'],

  'navigation-drawer': myColors.purple['400'],
  'navigation-drawer-header': myColors.purple['500'],
  'navigation-drawer-version': myColors.green['200'],

  'home-app-bar': '#ffffff',

  'home-bg-grad-1': myColors.purple['500'],
  'home-bg-grad-2': myColors.purple['500'],

  'connect-btn-disconnected-grad-1': myColors.cream['100'],
  'connect-btn-disconnected-grad-2': myColors.cream['100'],
  'connect-btn-connected': myColors.purple['200'],
  'on-connect-btn-disconnected': myColors.purple['300'],
  'on-connect-btn-connected': '#ffffff',

  'count-down-normal': myColors.green['200'],
  'count-down-alert': myColors.cream['100'],
  'count-down-warning': myColors.red['100'],

  'go-premium-btn': myColors.cream['100'],
  'on-go-premium-btn': myColors.purple['500'],

  'promote-premium-border': myColors.purple['200'],
  'promote-premium-color-premium': myColors.green['200'],
  'on-promote-premium-color-premium': myColors.purple['600'],
  'promote-premium-color-free': myColors.purple['200'],
  'on-promote-premium-color-free': '#ffffff',
  'premium-features-icon': myColors.purple['200'],
  'premium-code-btn': myColors.purple['200'],
  'purchase-subscription-btn': myColors.green['200'],
  'on-purchase-subscription-btn': myColors.purple['600'],
  'activate-code-btn': myColors.purple['200'],
  'on-activate-code-btn': '#ffffff',

  'suppress-snackbar': myColors.cream['100'],
  'on-suppress-snackbar': myColors.gray['800'],

  'update-snackbar-alert': myColors.purple['200'],
  'update-snackbar-warning': myColors.cream['100'],
  'btn-on-update-snackbar': myColors.purple['500'],

  'connection-speed': myColors.purple['200'],
  'total-bandwidth': myColors.purple['200'],

  'expire-date-alert': myColors.purple['100'],
  'expire-date-warning': myColors.red['100'],

  'config-btn-bg': myColors.purple['500'],
  'on-config-btn-bg': myColors.cream['100'],

  'active-server': myColors.green['200'],
  'fastest-server': myColors.purple['200'],
  'active-server-chip': myColors.green['200'],
  'on-active-server-chip': myColors.purple['500'],

  'expansion-panels-collapsed': myColors.purple['400'],
  'active-profile-radio': myColors.green['300'],
  'inactive-profile-radio': myColors.gray['300'],

  'config-card-bg': myColors.purple['400'],
  'zebra-on-config-card-bg': myColors.purple['500'],
  'config-card-on-expansion-panel': myColors.purple['400'],

  'dialog-light': myColors.green['200'],
  'on-dialog-light': '#ffffff',
  'dialog-light-text': '#ffffff',

  'dialog-dark': myColors.purple['400'],
  'on-dialog-dark': myColors.cream['100'],
  'dialog-dark-text': '#ffffff',

  'grad-bg-container-bg': myColors.purple['600'],
  'tonal-icon-btn': myColors.purple['200'],
  'card-on-grad-bg': myColors.purple['300'],
  'on-card-on-grad-bg': '#ffffff',

  'general-dialog': myColors.purple['500'],
  'on-general-dialog': myColors.purple['200'],
  'general-dialog-text': myColors.gray['300'],

  'dialog-alert': myColors.cream['100'],
  'on-dialog-alert': myColors.purple['500'],
  'dialog-alert-text': myColors.gray['800'],
  'dialog-alert-btn': myColors.purple['500'],

  'sample-ip-filter-bg': myColors.gray['800'],
  'sample-ip-filter-text': myColors.gray['400'],

  'btn-style-1': myColors.green['200'],
  'on-btn-style-1': myColors.purple['500'],

  'btn-style-2': myColors.purple['200'],
  'on-btn-style-2': '#ffffff',

  'btn-style-3': myColors.cream['100'],
  'on-btn-style-3': myColors.purple['500'],

  'btn-style-4': myColors.purple['200'],

  'btn-style-5': myColors.gray['300'],
  'on-btn-style-5': '#ffffff',

  'btn-style-6': '#ffffff',
  'on-btn-style-6': myColors.purple['500'],

  'btn-style-7': '#ffffff',

  'switch-btn': myColors.purple['200'],
  'connection-circle-border': myColors.cream['100'],
  'connection-circle-shine': myColors.green['200'],

  active: myColors.green['200'],
  'on-active': myColors.purple['500'],
  highlight: myColors.purple['200'],
  'enable-premium': myColors.green['200'],
  'disable-premium': myColors.cream['100'],
  'good': myColors.green['300'],
  'very-poor': myColors.yellow['200'],
  'learn-more': myColors.blue['280'],

  'disconnect-warning': myColors.purple['100'],
  'on-disconnect-warning': myColors.purple['600'],

  'version-on-home-debug': myColors.cream['100'],
  'on-version-on-home-debug': myColors.purple['600'],

  info: myColors.purple['400'],
  'on-info': myColors.gray['400'],
  note: myColors.purple['400'],
  'on-note': myColors.purple['100'],
  error: myColors.red['100'],
  warning: myColors.orange['100'],
  'on-warning': myColors.orange['300'],

  'scroll-track': myColors.purple['500'],
  'scroll-thumb': myColors.purple['300'],
  'scroll-thumb-hover': myColors.purple['200'],
} as const satisfies ThemeColorNames);

// -- blue, the default --
export const vhBlueThemeColors = defineTheme({
  background: myColors.blue['330'],
  surface: myColors.blue['330'],
  'on-background': '#ffffff',
  'colored-bg-light': myColors.blue['330'],
  'colored-bg-dark': myColors.blue['500'],
  'app-bg': myColors.blue['400'],
  'app-bar': myColors.blue['330'],
  'on-app-bar': '#ffffff',
  'skeleton-loader': myColors.blue['300'],
  'rate-icon': myColors.blue['100'],
  'rate-dialog-border': myColors.blue['100'],
  'rate-dialog-thanks': myColors.green['200'],

  'navigation-drawer': myColors.blue['290'],
  'navigation-drawer-header': myColors.blue['330'],
  'navigation-drawer-version': myColors.green['200'],

  'home-app-bar': '#ffffff',

  'home-bg-grad-1': myColors.blue['200'],
  'home-bg-grad-2': myColors.blue['300'],

  'connect-btn-disconnected-grad-1': myColors.blue['100'],
  'connect-btn-disconnected-grad-2': myColors.green['100'],
  'connect-btn-connected': myColors.blue['100'],
  'on-connect-btn-disconnected': myColors.blue['400'],
  'on-connect-btn-connected': '#ffffff',

  'count-down-normal': myColors.green['200'],
  'count-down-alert': myColors.yellow['200'],
  'count-down-warning': myColors.red['100'],

  'go-premium-btn': myColors.green['200'],
  'on-go-premium-btn': myColors.blue['200'],

  'promote-premium-border': myColors.blue['100'],
  'promote-premium-color-premium': myColors.green['200'],
  'on-promote-premium-color-premium': myColors.blue['500'],
  'promote-premium-color-free': myColors.blue['100'],
  'on-promote-premium-color-free': '#ffffff',
  'premium-features-icon': myColors.blue['100'],
  'premium-code-btn': myColors.blue['100'],
  'purchase-subscription-btn': myColors.green['200'],
  'on-purchase-subscription-btn': myColors.blue['500'],
  'activate-code-btn': myColors.blue['200'],
  'on-activate-code-btn': '#ffffff',

  'suppress-snackbar': myColors.purple['200'],
  'on-suppress-snackbar': myColors.purple['20'],

  'update-snackbar-alert': myColors.blue['20'],
  'update-snackbar-warning': myColors.green['200'],
  'btn-on-update-snackbar': myColors.blue['400'],

  'connection-speed': myColors.blue['100'],
  'total-bandwidth': myColors.blue['100'],

  'expire-date-alert': myColors.purple['100'],
  'expire-date-warning': myColors.red['100'],

  'config-btn-bg': myColors.blue['300'],
  'on-config-btn-bg': myColors.blue['100'],

  'active-server': myColors.green['200'],
  'fastest-server': myColors.blue['100'],
  'active-server-chip': myColors.green['200'],
  'on-active-server-chip': myColors.blue['500'],

  'expansion-panels-collapsed': myColors.blue['280'],
  'active-profile-radio': myColors.green['200'],
  'inactive-profile-radio': myColors.gray['300'],

  'config-card-bg': myColors.blue['290'],
  'zebra-on-config-card-bg': myColors.blue['400'],
  'config-card-on-expansion-panel': myColors.blue['290'],

  'dialog-light': myColors.green['200'],
  'on-dialog-light': '#ffffff',
  'dialog-light-text': '#ffffff',

  'dialog-dark': myColors.purple['400'],
  'on-dialog-dark': myColors.cream['100'],
  'dialog-dark-text': '#ffffff',

  'grad-bg-container-bg': myColors.blue['500'],
  'tonal-icon-btn': myColors.blue['100'],
  'card-on-grad-bg': myColors.blue['330'],
  'on-card-on-grad-bg': '#ffffff',

  'general-dialog': myColors.blue['330'],
  'on-general-dialog': myColors.blue['100'],
  'general-dialog-text': myColors.gray['200'],

  'dialog-alert': '#ffffff',
  'on-dialog-alert': myColors.blue['400'],
  'dialog-alert-text': myColors.gray['800'],
  'dialog-alert-btn': myColors.blue['400'],

  'sample-ip-filter-bg': myColors.gray['800'],
  'sample-ip-filter-text': myColors.gray['400'],

  'btn-style-1': myColors.green['200'],
  'on-btn-style-1': myColors.blue['500'],

  'btn-style-2': myColors.blue['100'],
  'on-btn-style-2': '#ffffff',

  'btn-style-3': myColors.cream['100'],
  'on-btn-style-3': myColors.purple['500'],

  'btn-style-4': myColors.blue['100'],

  'btn-style-5': myColors.gray['300'],
  'on-btn-style-5': '#ffffff',

  'btn-style-6': myColors.blue['100'],
  'on-btn-style-6': myColors.blue['400'],

  'btn-style-7': '#000000',

  'switch-btn': myColors.blue['100'],
  'connection-circle-border': myColors.blue['100'],
  'connection-circle-shine': myColors.green['50'],

  active: myColors.green['200'],
  'on-active': myColors.blue['400'],
  highlight: myColors.blue['100'],
  'enable-premium': myColors.green['200'],
  'disable-premium': myColors.yellow['200'],
  'good': myColors.green['300'],
  'very-poor': myColors.yellow['200'],
  'learn-more': myColors.blue['280'],

  'disconnect-warning': myColors.yellow['50'],
  'on-disconnect-warning': myColors.yellow['300'],

  'version-on-home-debug': myColors.yellow['200'],
  'on-version-on-home-debug': myColors.blue['400'],

  info: myColors.green['20'],
  'on-info': myColors.green['400'],
  note: myColors.purple['20'],
  'on-note': myColors.purple['300'],
  error: myColors.red['100'],
  warning: myColors.orange['100'],
  'on-warning': myColors.orange['300'],

  'scroll-track': myColors.blue['330'],
  'scroll-thumb': myColors.blue['200'],
  'scroll-thumb-hover': myColors.blue['100'],
} as const satisfies ThemeColorNames);
