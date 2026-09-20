export class UiConstants {
  static millisecondPerDay: number = 24 * 60 * 60 * 1000;
  // Every feature illustration under assets/images is authored at 640x656 (checked across all eight
  // the settings pages use). Handing the ratio to v-img lets it reserve the box before the file
  // arrives, so the page stops re-flowing under the user when the image lands. A ratio and not a
  // height: the box still scales with the container, and each caller's own max-height still caps it.
  static featureImageAspectRatio: number = 640 / 656;
  static logFileLocation: string = '/api/app/log.txt';
  static promotionFileLocation: string = '/api/app/promotion.jpg';
  static locationNumberOnCollapsedProfile: number = 8;
  // Where to send a user who wants the CONNECT app. Interpolated into GET_SERVER_KEY_METHODS_DESC
  // rather than written into the locale files: a store-specific URL baked into 13 translations
  // reaches every platform, and an App Store build may not point at another mobile platform's
  // store (App Review guideline 2.3.10).
  // NOTE: this page offers Android / Android TV / Windows / Linux and carries Google Play badges —
  // it has no iOS build, so it is NOT a valid destination for an App Store build. See the caller.
  static connectAppUrl: string = 'https://www.vpnhood.com/free-vpn/download';
  // The marketing site root. '/home' — used here until now — 404s.
  static websiteUrl: string = 'https://www.vpnhood.com/';
}

export enum ComponentName {
  NavigationDrawer = 'NavigationDrawer',
  ErrorDialog = 'ErrorDialog',
  ConfirmDialog = 'ConfirmDialog',
  AddServerDialog = 'AddServerDialog',
  RenameServerDialog = 'RenameServerDialog',
  ConfirmDeleteServerDialog = 'ConfirmDeleteServerDialog',
  EnterPremiumCode = 'EnterPremiumCode',
  CustomEndpoint = 'CustomEndpoint',
  BadgeDialog = 'BadgeDialog',
  AddOrEditProxySheet = "AddOrEditProxySheet",
  OpenOnPhoneDialog = 'OpenOnPhoneDialog',
  RemoteAccessDialog = 'RemoteAccessDialog',
  SignInDialog = 'SignInDialog',
}

// The account backend's own sign-in method (AuthProviders in the app): its credential form, which is
// not an identity provider and so never the primary button.
export const AuthProviderIds = {
  Password: 'password',
} as const;

// Why the remote-access dialog was opened. The dialog adds one line for it - where on the phone to
// go next - over the same code and address; nothing else about the dialog changes with it.
export enum RemoteAccessHint {
  Servers = 'Servers',
  Settings = 'Settings',
  SignIn = 'SignIn',
}

// Debug commands the SPA acts on by itself — the app declares them in DebugCommands (so they are
// offered in the developer dialog's dropdown) but does nothing with them. They are set in DebugData1
// through that dialog, which is developer-only, so a feature behind one stays hidden from users.
export enum DebugCommand {
  StarlinkTools = '/starlink',
}

export enum LanguagesCode {
  SystemDefault = 'sys',
  English = 'en',
}

// Lives here rather than beside VhFirebaseApp so that naming an event does not statically pull the
// Firebase SDK into the caller's chunk — the SDK is loaded on demand.
export enum AnalyticsCustomEvent {
  AlertDialogEventName = 'vh_alert_dialog_message',
}

export enum IPFilterType {
  FilterByDevice,
  FilterByApp
}

export enum AppPackageName {
  VpnHoodConnect = 'com.vpnhood.connect.android',
  VpnHoodClient = 'com.vpnhood.client.android'
}

