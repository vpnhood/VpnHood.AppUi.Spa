// VpnHoodAppData must be a separate class to prevent VpnHoodApp reactive
import { UiState } from '@/helpers/UiState';
import { UserState } from '@/helpers/UserState';
import {
  AppConnectionState,
  AppFeature,
  AppFeatures,
  AppOsType,
  DeviceIntentFeatures,
  AppState,
  ChannelProtocol,
  ClientProfileInfo,
  DnsMode,
  SplitCountryMode,
  UiCultureInfo,
  UserSettings,
  SplitAppMode
} from '@/services/VpnHood.Client.Api';
import i18n from '@/locales/i18n';
import { DebugCommand } from '@/helpers/UiConstants';

export class VpnHoodAppData {
  public readonly serverUrl: string | undefined = import.meta.env.VITE_API_BASE_URL;
  public uiState: UiState = new UiState();
  public userState: UserState = new UserState();
  public state: AppState;
  public userSettings: UserSettings;
  public features: AppFeatures;
  public intentFeatures: DeviceIntentFeatures;
  public clientProfileInfos: ClientProfileInfo[];
  public cultureInfos: UiCultureInfo[];
  public locale = i18n.global.t;

  // Another device on the LAN, not the app's own web view. Decided by the app per request from
  // where the request came, so a browser on a PC's own LAN address counts too.
  public readonly isRemote: boolean;

  public constructor(
    state: AppState,
    userSettings: UserSettings,
    features: AppFeatures,
    intentFeatures: DeviceIntentFeatures,
    clientProfileInfos: ClientProfileInfo[],
    cultureInfos: UiCultureInfo[],
    isRemote: boolean
  ) {
    this.state = state;
    this.userSettings = userSettings;
    this.features = features;
    this.intentFeatures = intentFeatures;
    this.clientProfileInfos = clientProfileInfos;
    this.cultureInfos = cultureInfos;
    this.isRemote = isRemote;
  }

  // Render the TV layout: the device is a TV (or /tv-mode says so) AND this is its own screen. A
  // phone that opened the app over the LAN renders the full layout of the same app, which is what
  // it is there for. Layout, focus and link handling key off this; the crash report keeps
  // features.isTv, the device fact.
  get isTvUi(): boolean {
    return this.features.isTv && !this.isRemote;
  }

  // The other side of the same pairing: a browser on the network driving a TV's app. The full
  // layout, plus a banner saying so, and a flow whose UI opens on the TV (the store's sign-in, its
  // payment sheet) tells the person to look at the TV - see VpnHoodApp.withContinueOnTv.
  get isManagingTv(): boolean {
    return this.features.isTv && this.isRemote;
  }

  get connectionState(): AppConnectionState {
    const orgConnectionState = this.state.connectionState;

    if (this.uiState.uiConnectInProgress && orgConnectionState === AppConnectionState.None) {
      return AppConnectionState.Connecting;
    }

    if (this.uiState.uiDisconnectInProgress && (
      orgConnectionState === AppConnectionState.Connected ||
      orgConnectionState === AppConnectionState.Connecting ||
      orgConnectionState === AppConnectionState.Initializing ||
      orgConnectionState === AppConnectionState.Waiting ||
      orgConnectionState === AppConnectionState.Unstable
    )) {
      return AppConnectionState.None;
    }

    return orgConnectionState === AppConnectionState.Unstable ? AppConnectionState.Connected : orgConnectionState;
  }

  get connectionStateText(): string {
    switch (this.state.connectionState) {
      case AppConnectionState.None:
        return this.locale('DISCONNECTED');
      case AppConnectionState.Initializing:
        return this.locale('INITIALIZING');
      case AppConnectionState.Waiting:
        return this.locale('WAITING');
      case AppConnectionState.Diagnosing:
        return this.locale('DIAGNOSING');
      case AppConnectionState.ValidatingProxies:
        return this.locale('VALIDATING_PROXIES');
      case AppConnectionState.Connecting:
        return this.locale('CONNECTING');
      case AppConnectionState.Connected:
        return this.locale('CONNECTED');
      case AppConnectionState.Disconnecting:
        return this.locale('DISCONNECTING');
      case AppConnectionState.WaitingForAd:
        return this.locale('LOADING_AD');
      case AppConnectionState.FindingReachableServer:
        return this.locale('FINDING_NETWORK');
      case AppConnectionState.FindingBestServer:
        return this.locale('FINDING_BEST_SERVER');
      case AppConnectionState.Unstable:
        return this.locale('UNSTABLE');
    }
  }

  // DebugData1 holds the debug commands as a space separated list, the same shape the app parses.
  public hasDebugCommand(command: DebugCommand): boolean {
    return this.userSettings.debugData1?.split(' ').includes(command) === true;
  }

  // Android only: the tools drive the Starlink app/dish, which exists on no other platform.
  // A debug build bypasses that check, so the page stays reachable while developing it.
  get isStarlinkToolsEnabled(): boolean {
    if (!this.hasDebugCommand(DebugCommand.StarlinkTools))
      return false;

    return this.features.isDebugMode || this.features.osType === AppOsType.Android;
  }

  get isConnected(): boolean {
    return this.connectionState === AppConnectionState.Connected || this.connectionState === AppConnectionState.Unstable;
  }

  get isUnstable(): boolean {
    return this.state.connectionState === AppConnectionState.Unstable;
  }

  // The one place "does this build have a premium tier at all" is asked. Null features.premium is
  // not "premium locked": it is the FULL app — no crown, no promotion, every feature allowed.
  get isPremiumSupported(): boolean {
    return this.features.premium != null;
  }

  get premiumIconColor(): string {
    return (!this.isPremiumSupported || this.isPremiumUser) ? 'enable-premium' : 'disable-premium';
  }

  // The split flags come from the app state, never computed here: the app owns the business logic
  // (the super toggle's AND, premium gating, the live session's word) and the UI just displays it.
  get isSplitTunnelingActive(): boolean {
    return this.state.splitTunnelingState.isSplittingTraffic;
  }

  get isSplitDomainActive(): boolean {
    return this.state.splitTunnelingState.isDomainSplit;
  }

  get isSplitIpViaDeviceActive(): boolean {
    return this.state.splitTunnelingState.isIpViaDeviceSplit;
  }

  get isSplitIpViaAppActive(): boolean {
    return this.state.splitTunnelingState.isIpViaAppSplit;
  }

  get isSplitAppsActive(): boolean {
    return this.state.splitTunnelingState.isAppSplit;
  }

  get isSplitLocalNetworkActive(): boolean {
    return this.state.splitTunnelingState.isLocalNetworkSplit;
  }

  // DNS-over-TLS is in use on the current link. This is true even in Android's default "Automatic"
  // (opportunistic) mode, so it does not mean the user configured anything.
  get isPrivateDnsActive(): boolean {
    return this.state.systemPrivateDns?.isActive === true;
  }

  // The user picked a provider hostname in the system settings (Android "hostname"/strict mode).
  // The provider is reported only in that mode, so it is what tells a deliberate choice from the default.
  get isPrivateDnsCustomized(): boolean {
    return !!this.state.systemPrivateDns?.provider;
  }

  get isDnsCustomized(): boolean{
    if (this.isPrivateDnsCustomized)
      return true;

    return this.userSettings.dnsMode === DnsMode.AdapterDns && this.isPremiumFeatureAllowed(AppFeature.CustomDns);
  }


  get isCustomEndpointActive(): boolean {
    const clientProfile = this.state.clientProfile;
    if (!clientProfile?.isCustomServerEndpointsEnabled)
      return false;

    const customServerEndpoints = clientProfile.customServerEndpoints;
    return !!customServerEndpoints && customServerEndpoints.length > 0;
  }

  get isPremiumUser(): boolean {
    return this.state.clientProfile?.isPremium == true;
  }
  // Premium granted through the signed-in account's store subscription (Play or App Store —
  // whichever store the platform build bills on), as opposed to a premium code.
  //
  // A subscription now DELIVERS a code like every other channel, so "where did this code come from"
  // is no longer a question the app can answer — it keeps no such provenance (keyring plan §9). The
  // honest question, and the one every caller actually meant, is whether this account is paying a
  // subscription.
  get isPremiumByAccount(): boolean{
    return this.isPremiumUser && this.userState.userAccount?.subscription != null;
  }
  get isPremiumByCode(): boolean{
    return this.isPremiumUser && !this.isPremiumByAccount;
  }

  // THE gate for offering code ENTRY anywhere (keyring plan §8): the server's per-token policy AND
  // this build's own capability — one store forbids unlocking with a code at all. Both halves are
  // combined server-side into one field, so nothing is re-derived here and no screen can check only
  // half of it. NOT the location's premiumByCode: that answers "can this person upgrade" and is
  // false once they are already premium — which is precisely when Change code is offered.
  get canImportAccessCode(): boolean{
    return this.state.clientProfile?.canImportAccessCode == true;
  }

  // Reading the code this device already holds is a SEPARATE permission, and a wider one: the
  // store that forbids typing a code does not forbid showing the one the buyer's own purchase
  // produced. They read it here and type it on their Android or Windows device — premium follows
  // the person, not the platform.
  get canViewAccessCode(): boolean{
    return this.state.clientProfile?.canViewAccessCode == true;
  }

  get canTryPremium(): boolean {
    return this.state.clientProfile?.canTryPremium == true;
  }
  get clientProfileId(): string | null{
    return this.state.clientProfile?.clientProfileId ?? this.userSettings.clientProfileId ?? null;
  }

  get edgeToEdgeTopHeight(): number | null {

    // Only available in the production mode.
    if (import.meta.env.DEV)
      return null;

    let topHeight = this.state.systemBarsInfo.topHeight;
    if (topHeight > 0)
      topHeight = Math.ceil(topHeight / window.devicePixelRatio) + 3;

    return topHeight > 0 ? topHeight : null;
  }

  get edgeToEdgeBottomHeight(): number | null {

    // Only available in the production mode.
    if (import.meta.env.DEV)
      return null;

    let bottomHeight = this.state.systemBarsInfo.bottomHeight;
    if (bottomHeight > 0)
      bottomHeight = Math.ceil(bottomHeight / window.devicePixelRatio) + 3;

    return bottomHeight > 0 ? bottomHeight : null;
  }

  get isNotificationEnabled(): boolean{
    return this.state.isNotificationEnabled === true
  }

  get activeProtocol(): ChannelProtocol{
    if (this.isConnected)
      return this.state.channelProtocol;
    return this.userSettings.channelProtocol;
  }

  public isProtocolEnabled(protocol: ChannelProtocol): boolean {
    if (this.state.sessionInfo)
      return this.state.sessionInfo.channelProtocols.includes(protocol);
    return this.isShowProtocol(protocol);
  }

  public isShowProtocol(protocol: ChannelProtocol): boolean {
    return this.features.channelProtocols.includes(protocol);
  }

  // Does this build collect anonymous data at all? features.isAnonymousTrackerSupported answers for the
  // native side — it is false when the tracker collapsed to a NullTracker — but this WebView has analytics
  // of its own, which a build enables by shipping firebaseOptions. Either engine makes the consent real;
  // neither means there is nothing to consent to, and the privacy page must not claim otherwise.
  get isAnonymousTrackerSupported(): boolean {
    return this.features.isAnonymousTrackerSupported ||
      !!this.features.customData?.firebaseOptions;
  }

  //Add padding to the pages for handle edge-to-edge feature
  public edgeToEdge(): void {

    // Only available in the production mode.
    if (import.meta.env.DEV)
      return;

    const paddingTop = this.edgeToEdgeTopHeight;
    const paddingBottom = this.edgeToEdgeBottomHeight;

    if (paddingTop === this.uiState.edgeToEdgeTop && paddingBottom === this.uiState.edgeToEdgeBottom)
      return;

    this.uiState.edgeToEdgeTop = paddingTop;
    this.uiState.edgeToEdgeBottom = paddingBottom;

    // Unique ID for the injected style
    const styleId = 'edge-to-edge-style';

    // Find and remove existing style element
    const existingStyle = document.getElementById(styleId);
    if (existingStyle) {
      existingStyle.remove();
    }

    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
      .v-main > .v-sheet {
        ${paddingTop ? `padding-top: ${paddingTop}px !important;` : ''}
        ${paddingBottom ? `padding-bottom: ${paddingBottom}px !important;` : ''}
      }
    `;
    document.head.appendChild(styleElement);
  }

  public isLocationAutoSelected(value?: string): boolean {
    const autoSelectValues = ['*', '*/*'];
    const locationToCheck = value ?? this.state.clientProfile?.selectedLocationInfo?.serverLocation;

    return autoSelectValues.includes(locationToCheck ?? '');
  }

  public isLocalNetworkAvailable(): boolean {
    if (!this.isConnected)
      return true;

    return this.state.sessionInfo?.isLocalNetworkAllowed === true;
  }

  public isPremiumFeature(appFeature: AppFeature): boolean {
    // a build with no premium tier sells no feature — everything is everyone's
    return this.features.premium?.features.includes(appFeature) ?? false;
  }

  public isPremiumFeatureAllowed(appFeature : AppFeature): boolean {

    // not a premium feature
    if (!this.isPremiumFeature(appFeature))
      return true;

    // check if the current profile is premium
    return this.isPremiumUser;
  }

  get isSplitCountryActive(): boolean {
    return this.state.splitTunnelingState.isCountrySplit;
  }

  get splitCountryStatusText(): string {
    // the EFFECTIVE mode from state: a split the toggle or the plan silenced reads as 'Off'.
    // Every branch that splits nothing reports 'Off' rather than naming its mode: the row asks
    // whether traffic is being split, and 'All' answers that question with its own opposite.
    const mode = this.state.splitTunnelingState.countryMode;
    const excludedCountries = this.state.splitTunnelingState.countries ?? [];
    const allCountriesCount = this.uiState.allCountriesCount;
    const maxFlags = 3;

    if (mode === SplitCountryMode.IncludeAll)
      return this.locale('OFF');
    if (mode === SplitCountryMode.ExcludeMyCountry)
      return this.locale('EXCLUDE_MY_COUNTRY');
    if (mode === SplitCountryMode.ExcludeList) {
      const count = excludedCountries.length;
      if (count === 0) return this.locale('OFF');
      if (count < maxFlags) return this.locale('EXCLUDE');
      if (count < allCountriesCount / 2) return this.locale('ALL_EXCEPT_X', { x: count });
      return this.locale('ONLY_X', { x: allCountriesCount - count });
    }
    return this.locale('OFF');
  }

  get splitAppsStatusText(): string {
    // branches mirror IsAppSplit in StateHelper: an empty exclude list excludes nothing, so it
    // reads 'Off' rather than 'All Except 0', and mode All splits nothing so it reads 'Off' too
    const splitApps = this.userSettings.splitTunneling.apps ?? [];
    switch (this.userSettings.splitTunneling.appMode) {
      case SplitAppMode.Exclude:
        return splitApps.length > 0
          ? this.locale('ALL_EXCEPT_X', { x: splitApps.length })
          : this.locale('OFF');
      case SplitAppMode.Include:
        return this.locale('ONLY_X', { x: splitApps.length });
      default:
        return this.locale('OFF');
    }
  }
}
