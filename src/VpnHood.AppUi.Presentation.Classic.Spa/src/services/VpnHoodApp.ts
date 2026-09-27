import {
  ApiException,
  AppClient,
  AppFeatures,
  SignInOptions,
  SignInResult,
  SignInState,
  VpnProfileClient,
  VpnProfileInfo,
  VpnProfileUpdateParams,
  ConfigParams,
  DeviceAppInfo,
  IntentsClient,
  PatchOfBoolean,
  PatchOfString,
  ProxyEndPointClient,
  SessionSuppressType,
} from '@/services/VpnHood.Client.Api';
import { ClientApiFactory } from '@/services/ClientApiFactory';
import { AuthProviderIds, ComponentName, RemoteAccessHint } from '@/helpers/UiConstants';
import type { ShowErrorActions } from '@/helpers/ErrorHandler';
import { ComponentRouteController } from '@/services/ComponentRouteController';
import { reactive } from 'vue';
import i18n, { availableLocales } from '@/locales/i18n';
import router from '@/services/router';
import type { VhFirebaseApp } from '@/services/Firebase';
import { ErrorHandler } from '@/helpers/ErrorHandler';
import { VpnHoodAppData } from '@/services/VpnHoodAppData';
import { createDeferred, type Deferred } from '@/helpers/Deferred';
import { type ConnectParams } from '@/helpers/ConnectParams';

export class VpnHoodApp {
  public data: VpnHoodAppData;
  public appClient: AppClient;
  public vpnProfileClient: VpnProfileClient;
  public intentsClient: IntentsClient;
  public proxyEndPointClient: ProxyEndPointClient;
  public vhFirebase: VhFirebaseApp | null;
  public confirmDialogDeferred: Deferred<boolean> | null = null;
  public errorDialogModel: ComponentRouteController;
  public openOnPhoneDialogModel: ComponentRouteController;
  public remoteAccessDialogModel: ComponentRouteController;
  public confirmDialogModel: ComponentRouteController;
  private lastReloadNumber: number = 0;
  private lastStateJson: string = '';
  private lastSavedUserSettingsJson: string = '';
  private isSaving: boolean = false;

  private constructor(
    appClient: AppClient,
    vpnProfileClient: VpnProfileClient,
    intentsClient: IntentsClient,
    proxyEndPointClient: ProxyEndPointClient,
    appData: VpnHoodAppData,
    vhFirebase: VhFirebaseApp | null,
  ) {
    if (VpnHoodApp._instance) throw new Error('VpnHoodApp has been already initialized.');

    this.data = reactive(appData);
    this.appClient = appClient;
    this.vpnProfileClient = vpnProfileClient;
    this.intentsClient = intentsClient;
    this.proxyEndPointClient = proxyEndPointClient;
    this.vhFirebase = vhFirebase;
    this.errorDialogModel = new ComponentRouteController(ComponentName.ErrorDialog);
    this.openOnPhoneDialogModel = new ComponentRouteController(ComponentName.OpenOnPhoneDialog);
    this.remoteAccessDialogModel = new ComponentRouteController(ComponentName.RemoteAccessDialog);
    this.confirmDialogModel = new ComponentRouteController(ComponentName.ConfirmDialog);
    this.data.uiState.configTime = this.data.state.configTime;
    this.data.uiState.isReportSendingAvailable = vhFirebase !== null;
    // appData arrives freshly fetched, so it is the persisted truth saveUserSetting diffs against.
    this.lastSavedUserSettingsJson = JSON.stringify(appData.userSettings);
    VpnHoodApp._instance = this;
  }

  public static get instance(): VpnHoodApp {
    if (VpnHoodApp._instance == null) throw new Error('VpnHoodApp has not been initialized.');
    return VpnHoodApp._instance;
  }

  private static _instance: VpnHoodApp | null;

  public static async create(): Promise<VpnHoodApp> {
    const apiClient: AppClient = ClientApiFactory.instance.createAppClient();
    const vpnProfileClient: VpnProfileClient = ClientApiFactory.instance.createVpnProfileClient();
    const intentsClient: IntentsClient = ClientApiFactory.instance.createIntentClient();
    const proxyEndpointClient: ProxyEndPointClient = ClientApiFactory.instance.createProxyEndPointClient();
    // availableLocales, not i18n.global.availableLocales: only the fallback is loaded at this point,
    // so asking the i18n instance would report a single culture to the backend.
    const config = await apiClient.configure(new ConfigParams({ availableCultures: availableLocales }));
    const appData = new VpnHoodAppData(
      config.state,
      config.userSettings,
      config.features,
      config.intentFeatures,
      config.vpnProfileInfos,
      config.availableCultureInfos,
      config.isRemote,
    );

    const firebase = import.meta.env.DEV || !config.userSettings.allowAnonymousTracker
      ? null
      : await VpnHoodApp.createFirebase(config.features);

    return new VpnHoodApp(apiClient, vpnProfileClient, intentsClient, proxyEndpointClient, appData, firebase);
  }

  // Firebase does analytics and report uploads. Loading it as its own chunk keeps the SDK out of
  // the startup bundle, but it stays best-effort: tryCreate already degrades to null on a bad
  // config, so a chunk that fails to load must degrade the same way rather than fail the launch.
  //
  // Only ever called once the user's allowAnonymousTracker consent is known to be granted. Merely
  // constructing the SDK contacts Google (installations + remote config) and stamps a persistent
  // per-install id via setUserId, so an opted-out user must not reach it at all — disabling
  // collection after the fact would be too late.
  private static async createFirebase(features: AppFeatures): Promise<VhFirebaseApp | null> {
    try {
      // A build without firebaseOptions can never create the SDK; decide that before the dynamic
      // import so such builds never download and parse the Firebase chunk at all.
      if (!features.customData?.firebaseOptions) {
        console.log('the firebaseOptions is not set in the app features -> customData -> firebaseOptions.');
        return null;
      }

      const { VhFirebaseApp } = await import('@/services/Firebase');

      return VhFirebaseApp.tryCreate(features.customData?.firebaseOptions, features.clientId);
    }
    catch (err: unknown) {
      console.error('Firebase: Failed to load the Firebase module.', err);
      return null;
    }
  }

  // The consent toggle can flip at any time from the settings page while the SDK was decided once at
  // startup, so neither direction may be left stale: withdrawing consent must silence a live SDK, and
  // granting it must not force a restart to take effect.
  private async syncAnalyticsConsent(): Promise<void> {
    if (import.meta.env.DEV) return;

    // Already in sync — the common case, since this runs on every settings reload and consent
    // rarely changes. Bail before touching the SDK: re-enabling an enabled SDK is a wasted call
    // per save, and the no-SDK path below would re-attempt a Firebase init inside the awaited
    // save chain. Consent-on with a null SDK still falls through, so a failed init keeps its
    // retry on the next reload.
    const isTrackerAllowed = this.data.userSettings.allowAnonymousTracker;
    const isTrackerActive = this.vhFirebase !== null;
    if (isTrackerAllowed === isTrackerActive)
      return;

    if (!isTrackerAllowed) {
      this.vhFirebase?.setCollectionEnabled(false);
      this.vhFirebase = null;
    }
    else if (this.vhFirebase) 
      this.vhFirebase.setCollectionEnabled(true);
    else 
      this.vhFirebase = await VpnHoodApp.createFirebase(this.data.features);

    this.data.uiState.isReportSendingAvailable = this.vhFirebase !== null;
  }

  public async reloadState(): Promise<void> {
    if (this.isSaving) return;

    // Only reload state for the last reload.
    this.lastReloadNumber++;
    const reloadNumber = this.lastReloadNumber;
    const state = await this.appClient.getState();

    if (reloadNumber !== this.lastReloadNumber) return; // Discard old data

    // data is reactive, so publishing the freshly parsed object graph invalidates every component
    // that reads any part of state — once a second, even when nothing changed. Publish only real
    // changes; the getState above still runs every poll, since its JSON is what tells them apart.
    const stateJson = JSON.stringify(state);
    if (stateJson !== this.lastStateJson) {
      this.lastStateJson = stateJson;
      this.data.state = state;
    }

    // Setting has change and must reload
    if (this.data.uiState.configTime.getTime() !== this.data.state.configTime.getTime()) {
      this.data.uiState.configTime = this.data.state.configTime;
      await this.reloadSettings();
    }

    // Show the last error message if the user has not ignored
    if (this.data.state.lastError && this.data.uiState.stateLastErrorMessage !== this.data.state.lastError?.message) {
      this.data.uiState.stateLastErrorMessage = this.data.state.lastError.message;
      await this.processError(ApiException.fromApiError(this.data.state.lastError));
    }

    // Show the internal ad
    if (this.data.state.isWaitingForInternalAd) await router.replace({ name: 'INTERNAL_AD' });
    // Show the Quick launch page if the internal ad is not shown
    else if (this.data.state.isQuickLaunchRecommended) await router.push({ name: 'QUICK_LAUNCH' });

    // Show the update message if the user has not ignored or more than 24 hours have passed
    if (this.data.state.updaterStatus?.prompt) this.data.uiState.showUpdateSnackbar = true;

    // Show 'suppress to' message
    if (
      this.data.isConnected &&
      this.data.state.sessionInfo?.suppressedTo &&
      this.data.state.sessionInfo?.suppressedTo === SessionSuppressType.Other &&
      this.data.uiState.userIgnoreSuppressToTime?.toString() !== this.data.state.connectRequestTime?.toString() &&
      !this.data.uiState.generalSnackbarState.isShow
    ) {
      this.showGeneralSnackbar(
        i18n.global.t('SESSION_SUPPRESSED_TO_OTHER'),
        'suppress-snackbar',
        false,
        undefined,
        true,
      );
    }
  }

  private async reloadSettings(): Promise<void> {
    const appInfo = await this.appClient.getInfo();

    // Publish only real changes, per field — same reasoning as in reloadState. A save bumps
    // configTime, which lands here on the next poll; the fetched settings then equal what the UI
    // already shows, and republishing them re-rendered every settings reader right after each save.
    if (JSON.stringify(appInfo.features) !== JSON.stringify(this.data.features))
      this.data.features = appInfo.features;
    
    const userSettingsJson = JSON.stringify(appInfo.userSettings);
    if (userSettingsJson !== JSON.stringify(this.data.userSettings))
      this.data.userSettings = appInfo.userSettings;
    // Either way the fetch is the persisted truth, so it is what saveUserSetting diffs against.
    // The vpnProfileId repairs below stay after this line on purpose: they change local
    // settings, and the stale snapshot is what makes the next saveUserSetting persist them.
    this.lastSavedUserSettingsJson = userSettingsJson;

    // Remove the built-in VPN profile if the user is premium
    if (JSON.stringify(appInfo.vpnProfileInfos) !== JSON.stringify(this.data.vpnProfileInfos))
      this.data.vpnProfileInfos = appInfo.vpnProfileInfos;

    // userSettings just came back from the backend, so this is the one place that sees every change
    // to the analytics consent flag regardless of which page made it.
    await this.syncAnalyticsConsent();

    if (appInfo.vpnProfileInfos.length === 0) this.data.userSettings.vpnProfileId = null;

    // select first profile if the current selected profile is not exist anymore after reload
    if (
      this.data.userSettings.vpnProfileId &&
      !appInfo.vpnProfileInfos.some((p) => p.vpnProfileId === this.data.userSettings.vpnProfileId)
    )
      this.data.userSettings.vpnProfileId = appInfo.vpnProfileInfos[0]?.vpnProfileId ?? null;
  }

  public async connect(connectParams: ConnectParams): Promise<void> {
    // Just for Development info
    console.debug(`connect. Serverlocation: ${connectParams.serverLocation}, Planid: ${connectParams.planId}, GoTohome: ${connectParams.goToHome}`);

    // Navigate to home page
    if ((connectParams.goToHome ?? true) && router.currentRoute.value.name !== 'HOME')
       await router.replace({ name: 'HOME' });

    this.data.uiState.uiConnectInProgress = true;

    try {
      if (connectParams.isDiagnose) await this.diagnose();
      else await this.appClient.connect(connectParams.vpnProfileId, connectParams.serverLocation, connectParams.planId);

      // VpnProfile will be updated after connecting.
      await this.updateVpnProfile(
        connectParams.vpnProfileId,
        new VpnProfileUpdateParams({
          isPremiumLocationSelected: new PatchOfBoolean({ value: connectParams.isPremium }),
          selectedLocation: new PatchOfString({ value: connectParams.serverLocation }),
        }),
      );
      this.data.userSettings.vpnProfileId = connectParams.vpnProfileId;
      await this.saveUserSetting();
    } finally {
      // Reload to apply the latest vpnProfileInfos updates
      await this.reloadSettings();
      this.data.uiState.uiConnectInProgress = false;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      this.data.uiState.uiDisconnectInProgress = true;
      await this.appClient.disconnect();
    } finally {
      await this.reloadState();
      this.data.uiState.uiDisconnectInProgress = false;
    }
  }

  public getAppVersion(isFull: boolean): string {
    const fullVersion: string = this.data.features.version;
    return isFull ? fullVersion.substring(0, fullVersion.lastIndexOf('.')) : fullVersion.split('.')[2];
  }

  // Save any change by user
  public async saveUserSetting(): Promise<void> {
    // Skip when nothing changed since the last save. Several pages save on route-leave as a
    // backstop after having saved each edit already, and blocking that navigation on a no-op
    // round trip (set + state reload + config reload) is felt as click-to-navigate delay.
    const userSettingsJson = JSON.stringify(this.data.userSettings);
    if (userSettingsJson === this.lastSavedUserSettingsJson) 
      return;

    try {
      this.isSaving = true;
      await this.appClient.setUserSettings(this.data.userSettings);
      // Only a successful post is a save — on failure the snapshot stays stale so the next call retries.
      this.lastSavedUserSettingsJson = userSettingsJson;
    } finally {
      this.isSaving = false;
    }

    await this.reloadState();
  }

  // Select a profile by user
  public async updateVpnProfile(
    vpnProfileId: string,
    vpnProfileUpdateParam: VpnProfileUpdateParams,
  ): Promise<void> {
    await this.vpnProfileClient.update(vpnProfileId, vpnProfileUpdateParam);
    await this.reloadSettings();
  }

  public async addAccessKey(accessKey: string): Promise<VpnProfileInfo> {
    const vpnProfileInfo = await this.vpnProfileClient.addByAccessKey(accessKey);
    await this.reloadSettings();
    return vpnProfileInfo;
  }

  public async deleteVpnProfile(vpnProfileId: string): Promise<void> {
    await this.vpnProfileClient.delete(vpnProfileId);
    await this.reloadSettings();
  }

  public async diagnose(): Promise<void> {
    try {
      await this.appClient.diagnose(this.data.userSettings.vpnProfileId);
    } catch (err: unknown) {
      console.log(err);
    }
  }

  // Get the error message
  public async processError(err: unknown): Promise<void> {
    // For developer
    console.error(err);
    console.log('Error is typeof: ', typeof err);

    await ErrorHandler.processError(err);
  }

  // Show error dialog
  public async showErrorMessage(text: string, action?: ShowErrorActions): Promise<void> {
    const errorDialogState = this.data.uiState.errorDialogState;
    errorDialogState.message = text;
    errorDialogState.showLogButton = this.data.state.promptForLog;
    errorDialogState.showDiagnoseButton = (action?.showDiagnose && !this.data.state.hasDiagnoseRequested) ?? false;
    errorDialogState.showChangeServerToAutoButton = action?.showChangeServerToAuto ?? false;
    errorDialogState.showAccessCodeActions = action?.showAccessCodeActions ?? false;
    errorDialogState.showChangeAccessCode = action?.showChangeAccessCode ?? false;
    errorDialogState.showTryPremium = action?.showTryPremium ?? false;

    await this.errorDialogModel.show(true);
  }

  // Get the installed apps list on the user device
  public getInstalledApps(): Promise<DeviceAppInfo[]> {
    return this.appClient.getInstalledApps();
  }

  public async postPoneUpdate(): Promise<void> {
    await this.appClient.versionCheckPostpone();
  }

  public async checkForUpdate(): Promise<void> {
    await this.appClient.versionCheck();
  }

  // The flag of a country, one PNG per ISO code in the assets folder (src/assets/flags).
  public getCountryFlag(countryCode: string | null | undefined): string {
    const code = countryCode?.trim().toLowerCase();
    return `/assets/flags/${code ? code : 'no-flag'}.png`;
  }

  public isActiveVpnProfile(vpnProfileId: string): boolean {
    return vpnProfileId === this.data.userSettings.vpnProfileId;
  }

  // One built-in profile, called "location", against a list of servers the user adds keys for:
  // the list is fixed exactly when no key can be added.
  public isSingleProfileMode(): boolean {
    return !this.data.features.isAddAccessKeySupported;
  }

  // Decided entirely by the app (AppFeatures) - never by which product the SPA thinks it is.
  // Null means the build ships no such document: hide the link, never guess an address.
  public privacyPolicyUrl(): string | null {
    return this.data.features.privacyPolicyUrl;
  }

  public termsOfUseUrl(): string | null {
    return this.data.features.termsOfUseUrl;
  }

  // A TV is not guaranteed to have a browser: target="_blank" fires an intent that nothing on the
  // device handles, so the tap either dies silently or takes the WebView down with it. Every
  // outbound link therefore keeps its real href - which a phone, a desktop and a reviewer's click
  // all follow - and only on a TV is that click intercepted and turned into a code to scan, with the
  // address printed beneath it for anyone who would rather type it. Dropping the link there is not
  // an option: both stores require the legal documents reachable from inside the app, and a dead <a>
  // satisfies nobody. App.vue catches the click for every link at once, so nothing opts in here.
  // url is nullable only so a caller can pass privacyPolicyUrl() through without asserting it - a
  // build with no such document renders no link, so nothing can be clicked. Event rather than
  // MouseEvent because a keyboard activation reports as one, and all this needs is preventDefault().
  public onExternalLinkClick(event: Event, url: string | null, title: string): void {
    if (!this.data.isTvUi || url === null)
      return;

    event.preventDefault();

    const dialogState = this.data.uiState.openOnPhoneDialogState;
    dialogState.url = url;
    dialogState.title = title;

    // Shown through the route, not a bare flag: that is what puts a history entry behind the dialog,
    // so the remote's Back button closes it. A plain v-model dialog would let Back navigate the page
    // away and leave the code hanging over whatever loaded next.
    this.openOnPhoneDialogModel.show(true).then();
  }

  // Whether an outbound link can get anywhere from this device - a browser to open it, or the TV
  // fallback in onExternalLinkClick. Ask this before hiding a link for want of a browser. A remote
  // browser is a browser: the link opens right there, whatever the TV can do.
  public isExternalLinkUsable(): boolean {
    return this.data.isRemote || this.data.intentFeatures.isWebBrowserSupported || this.data.isTvUi;
  }

  // The pairing screen: a code for a phone to scan and manage this device with. Only the TV UI
  // opens it - the home Settings button, and the places whose job cannot be done with a remote,
  // which pass a hint saying where on the phone to go next. Shown through the route for the same
  // reason as the open-on-phone dialog: the history entry is what lets Back close it.
  // False when this build runs no listener a phone could reach: the three remote-access calls
  // throw then, so nothing may offer the screen. Every head that serves this SPA has one, so it
  // guards a head added later rather than one shipping today.
  public isRemoteAccessSupported(): boolean {
    return this.data.features.isRemoteAccessSupported;
  }

  public showRemoteAccessDialog(hint: RemoteAccessHint | null = null): void {
    if (!this.isRemoteAccessSupported())
      return;
    this.data.uiState.remoteAccessDialogState.hint = hint;
    this.remoteAccessDialogModel.show(true).then();
  }

  public async clearLastError(): Promise<void> {
    this.data.uiState.stateLastErrorMessage = null;
    await this.appClient.clearLastError();
    this.data.state.lastError = null;
    await this.reloadState();
  }

  public showGeneralSnackbar(
    message: string,
    bgColor: string = 'highlight',
    hasTimer: boolean = true,
    textColor?: string,
    hasCloseButton?: boolean,
  ): void {
    this.data.uiState.generalSnackbarState.message = message;
    this.data.uiState.generalSnackbarState.bgColor = bgColor;
    this.data.uiState.generalSnackbarState.hasTimer = hasTimer;
    this.data.uiState.generalSnackbarState.textColor = textColor ?? null;
    this.data.uiState.generalSnackbarState.hasCloseBtn = hasCloseButton ?? null;
    this.data.uiState.generalSnackbarState.isShow = true;
  }

  public async removePremiumCode(): Promise<void> {
    const vpnProfile = this.data.state.vpnProfile;

    if (!vpnProfile) throw new Error('Could not find the profile in the state for remove premium code.');

    if (!vpnProfile.hasAccessCode) throw new Error('The profile does not have a premium code.');

    // Signed-out only (keyring plan §7): there the device's copy is the only one that exists, so
    // removing it here removes it everywhere it was. Signed in there is no Remove at all — the
    // ranking replaces a dead code by itself, and what an account holds is the panel's business.
    // Nothing account-wide is attempted from here; the app has no door to the account's slot.
    this.data.uiState.showLoadingDialog = true;
    try {
      if (this.data.isConnected) await this.disconnect();

      await this.vpnProfileClient.update(
        vpnProfile.vpnProfileId,
        new VpnProfileUpdateParams({ accessCode: new PatchOfString({ value: null }) }),
      );
    } finally {
      this.data.uiState.showLoadingDialog = false;
    }
  }

  // The store/IdP method (the primary sign-in everywhere it exists). "password" is the portal's own
  // credential form, deliberately never the primary: it is appended by the provider, so the first
  // method that is not "password" is the store one.
  public primaryProviderId(): string | undefined {
    return this.data.features.authProviderIds.find((x) => x !== AuthProviderIds.Password);
  }

  // Whether a tap on Sign in needs the chooser dialog: more than one way in (a store method beside
  // the account website's password), or password alone, which vhApp.signIn() cannot take.
  public hasSignInChoice(): boolean {
    const ids = this.data.features.authProviderIds;
    return ids.length > 1 || ids[0] === AuthProviderIds.Password;
  }

  // Runs a step whose UI belongs to the device the app is on: the store's sign-in, its payment
  // sheet, its restore, the in-app review prompt. On the device itself nothing changes. Asked from
  // a browser that manages a TV over the network, the sheet opens on the TV, not in the browser,
  // so the browser says where to look and waits; the call returns when the TV is done, or when
  // the person cancels there, and the notice goes with it.
  public async withContinueOnTv<T>(work: () => Promise<T>): Promise<T> {
    if (!this.data.isManagingTv)
      return work();

    this.data.uiState.showContinueOnTvDialog = true;
    try {
      return await work();
    } finally {
      this.data.uiState.showContinueOnTvDialog = false;
    }
  }

  public async signIn(onPurchase = false): Promise<void> {
    // the spinner, unless the notice that the sign-in is on the TV takes its place
    this.data.uiState.showLoadingDialog = !this.data.isManagingTv;
    try {
      const accountClient = ClientApiFactory.instance.createAccountClient();
      // The method id comes from the API (self-declared by the app's auth provider — free-form
      // string, not an enum, so third-party providers flow through untouched); the UI never
      // assumes one.
      const providerId = this.primaryProviderId();
      if (!providerId)
        throw new Error('This build reports no sign-in method.');
      await this.withContinueOnTv(() => accountClient.signIn(new SignInOptions({ providerId: providerId })));
      await this.afterSignedIn(onPurchase);
    } catch (err: unknown) {
      if (!(err instanceof ApiException)) throw err;

      const { exceptionTypeName, statusCode } = err;

      switch (exceptionTypeName) {
        case 'TaskCanceledException':
          if (onPurchase) {
            throw new Error(i18n.global.t('SIGN_IN_CANCELED_BY_USER'));
          }
          return; // Silent cancel if not a purchase

        // The provider's own failure (Apple/Google both throw AuthenticationException). The raw
        // message is an untranslated NSError/SDK chain; the app has already logged it in full for
        // the report, so the dialog gets the localized summary only.
        case 'AuthenticationException':
          throw new Error(i18n.global.t('SIGN_IN_FAILED_MSG'));

        case 'HttpRequestException':
          if (statusCode === 400) {
            throw new Error(i18n.global.t('LOGIN_CONNECTION_ERROR_MSG'));
          }

          // Only a build with an account: signed in here, but the app could not find the user
          // account in its storage. Invalid credential.
          if (
            statusCode === 401 &&
            VpnHoodApp.instance.data.features.isAccountSupported &&
            !VpnHoodApp.instance.data.userState.userAccount
          ) {
            await VpnHoodApp.instance.signOut();
            throw new Error(i18n.global.t('AUTHENTICATION_ERROR'));
          }
          break;

        default:
          throw err;
      }
    } finally {
      this.data.uiState.showLoadingDialog = false;
    }
  }

  /**
   * The portal's own credential form (the account website's email + password) — the SECONDARY
   * sign-in, offered under the store method. Returns a state other than SignedIn when the account
   * uses a second factor: nothing is signed in yet, complete with completeSignInChallenge. Errors carry
   * the portal's machine code in err.data.Code (invalid_credentials, too_many_attempts, …) — the
   * dialog maps them to localized messages; nothing here can tell whether an email exists,
   * by design.
   */
  public async signInWithPassword(email: string, password: string): Promise<SignInResult> {
    const accountClient = ClientApiFactory.instance.createAccountClient();
    const result = await accountClient.signIn(
      new SignInOptions({ providerId: 'password', userName: email, password }),
    );
    if (result.state === SignInState.SignedIn) await this.afterSignedIn(false);
    return result;
  }

  /** The second step of the password form: the authenticator code or the account's backup code. */
  public async completeSignInChallenge(code: string): Promise<SignInResult> {
    const accountClient = ClientApiFactory.instance.createAccountClient();
    const result = await accountClient.signIn(
      new SignInOptions({ providerId: 'password', twoFactorCode: code }),
    );
    if (result.state === SignInState.SignedIn) await this.afterSignedIn(false);
    return result;
  }

  private async afterSignedIn(onPurchase: boolean): Promise<void> {
    await this.loadAccount();

    // sign-in is otherwise silent: the drawer just closes, leaving no sign the
    // account is now attached. A purchase confirms itself, so it stays quiet.
    if (!onPurchase) {
      const email = this.data.userState.userAccount?.email;
      if (email) this.showGeneralSnackbar(i18n.global.t('SIGNED_IN_AS_X', { email }));
    }

    // NOTE: no "save this code to your account?" prompt any more (keyring plan §9). Typing a code
    // IS choosing to use it, so the upload rides along with the profile write and needs no second
    // answer. The only moment that still deserves a question is BEFORE signing in, where the choice
    // is still free — sync it, sign in without it, or cancel (§6).
  }

  public async signOut(): Promise<void> {
    const result = await this.showConfirmDialog(
      i18n.global.t('CONFIRM_SIGN_OUT_TITLE'),
      i18n.global.t('CONFIRM_SIGN_OUT_DESC'),
    );
    if (!result) return;

    // the confirm dialog closes on click, so without this the app looks frozen while the
    // portal revokes the session and the account reloads
    this.data.uiState.showLoadingDialog = true;
    try {
      const accountClient = ClientApiFactory.instance.createAccountClient();
      await accountClient.signOut();
      await this.loadAccount();
      await router.replace({ name: 'HOME' });
    } finally {
      this.data.uiState.showLoadingDialog = false;
    }
  }

  // Permanent account deletion (Apple 5.1.1(v) / Play account-deletion policy). Nothing blocks it:
  // the backend cancels website billing at the end of its paid period instead of refusing, and it
  // never touches a store subscription — signing in again brings that back by itself. The
  // CONFIRMATION lives with the caller (a static warning + explicit acknowledgement — the screen
  // warns, the farewell MAIL delivers the codes); this method only executes.
  public async deleteAccount(): Promise<void> {
    this.data.uiState.showLoadingDialog = true;
    try {
      const accountClient = ClientApiFactory.instance.createAccountClient();
      await accountClient.delete();

      // Account-granted premium goes with the account. Drop the tunnel too: a session opened while
      // premium must not keep running on a premium server after the account that paid for it
      // stopped existing. A code the person owns (typed, or an applied website code) stays on the
      // profile — it was bought outright, and the farewell mail carries it one last time.
      if (this.data.isConnected) await this.disconnect();
      await this.loadAccount();
      await router.replace({ name: 'HOME' });
    } finally {
      this.data.uiState.showLoadingDialog = false;
    }
  }

  public async loadAccount(withRefresh: boolean = false): Promise<void> {
    const accountClient = ClientApiFactory.instance.createAccountClient();

    // Best-effort: the portal is often exactly what is blocked here, and a page that cannot reach it
    // must still show what it knows instead of an error. get() below serves the cached account.
    if (withRefresh) {
      try {
        await accountClient.refresh();
      } catch (error: unknown) {
        console.debug('Could not refresh the account. Showing the saved one.', error);
      }
    }

    this.data.userState.userAccount = await accountClient.get();
    // For developer
    console.debug(
      'IsPremiumUser: ',
      this.data.isPremiumUser,
      ' IsPremiumByAccount: ',
      this.data.isPremiumByAccount,
      ' CanGoPremium: ',
      this.data.state.vpnProfile?.canGoPremium,
      ' isPremiumSupported: ',
      this.data.isPremiumSupported,
      'User Account: ',
      this.data.userState.userAccount,
    );
    await this.reloadSettings();
  }

  // Route-controlled like every other dialog, so that Back closes it as No instead of moving the
  // page underneath it (a TV remote, or the keyboard's Backspace standing in for it). The answer
  // comes from the dialog: Yes, No, or its closing by Back.
  public showConfirmDialog(title: string, message: string): Promise<boolean> {
    const confirmDialogState = this.data.uiState.confirmDialogState;
    confirmDialogState.title = title;
    confirmDialogState.message = message;

    this.confirmDialogDeferred = createDeferred<boolean>();
    this.confirmDialogModel.show(true).then();
    return this.confirmDialogDeferred.promise;
  }
}
