<script lang="ts" setup>
import i18n from '@/locales/i18n';
import router from '@/services/router';
import AppBar from '@/components/AppBar.vue';
import { AppFeature, AppProxyMode } from '@/services/VpnHood.Client.Api';
import { LanguagesCode } from '@/helpers/UiConstants';
import SettingsItem from '@/components/Settings/SettingsItem.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import SettingsSectionTitle from '@/components/Settings/SettingsSectionTitle.vue';
import { computed, ref } from 'vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const proxySelectedMode = ref(vhApp.data.userSettings.proxySettings?.mode);
const splitState = computed(() => vhApp.data.state.splitTunnelingState);

// Row visibility is named here instead of written inline because every section heading reuses it: a
// platform that hides all of a section's rows must not be left with a title and a divider over
// nothing. Rows with no platform gate are declared too, so the section guards below stay honest if
// one of them ever gains a gate.
const isShowLanguage: boolean = true;
const isShowNotifications = computed(() => vhApp.data.intentFeatures.isAppNotificationSettingsSupported);
const isShowQuickLaunch = computed(() => vhApp.data.intentFeatures.isQuickLaunchSupported);
const isShowProxies: boolean = true;
const isShowSplitTunneling: boolean = true;
const isShowDns: boolean = true;
const isShowPrivacy: boolean = true;
const isShowKillSwitch = computed(() => vhApp.data.intentFeatures.isKillSwitchSettingsSupported);
const isShowAlwaysOn = computed(() => vhApp.data.intentFeatures.isAlwaysOnSettingsSupported);

const isShowAppSettingsSection = computed(() =>
  isShowLanguage || isShowNotifications.value || isShowQuickLaunch.value);
const isShowConnectivitySection = computed(() =>
  isShowProxies || isShowSplitTunneling || isShowDns);
const isShowPrivacyAndSecuritySection = computed(() =>
  isShowPrivacy || isShowKillSwitch.value || isShowAlwaysOn.value);

</script>

<template>
  <v-sheet>
    <app-bar/>

    <!-- APP SETTINGS SECTION: how the app presents itself on this device -->
   <settings-section-title :title="locale('APP_SETTINGS')" :is-show="isShowAppSettingsSection"/>
    <!-- Language -->
    <settings-item
      :title="locale('LANGUAGE')"
      :subtitle="locale('APP_LANGUAGE_DESC')"
      :isPremium=false
      :is-show="isShowLanguage"
      :status="{
        state: vhApp.data.userSettings.cultureCode != null,
        onText: vhApp.data.state.currentUiCultureInfo.nativeName,
        offText: locale('SYSTEM_DEFAULT_LANGUAGE')
      }"
      :click="{name: 'LANGUAGE'}"
      :languageMoreAction="i18n.global.locale.value !== LanguagesCode.English"
    />

    <!-- Notification -->
    <settings-item
      :title="locale('NOTIFICATIONS')"
      :subtitle="locale('NOTIFICATIONS_DESC')"
      :isPremium="false"
      :status="{
        state: vhApp.data.isNotificationEnabled,
        onText: locale('ON'),
        offText: locale('OFF')
      }"
      :isShow="isShowNotifications"
      :click="{name: 'NOTIFICATIONS'}"
    />

    <!-- Quick launch: a device-surface integration like Notifications, not a connectivity setting —
         it adds a tile to the system Quick Settings panel, it does not change how traffic is carried. -->
    <settings-item
      :title="locale('QUICK_LAUNCH')"
      :subtitle="locale('QUICK_LAUNCH_DESC')"
      :isPremium="vhApp.data.isPremiumFeature(AppFeature.QuickLaunch)"
      :is-show="isShowQuickLaunch"
      :click="{name:'QUICK_LAUNCH'}"
    />

    <!-- CONNECTIVITY SECTION: how traffic is carried — reaching the server, what enters the tunnel,
         and how names are resolved -->
    <settings-section-title :title="locale('CONNECTIVITY')" :is-show="isShowConnectivitySection"/>

    <!-- Proxies -->
    <settings-item
      :title="locale('PROXIES')"
      :subtitle="locale('PROXIES_DESC')"
      :isPremium="false"
      :is-show="isShowProxies"
      :status="{
        state: proxySelectedMode != AppProxyMode.NoProxy,
        onText: proxySelectedMode === AppProxyMode.Device ? locale('SYSTEM') : locale('MANUAL'),
        offText: locale('NO_PROXY')
      }"
      :click="{name:'PROXIES'}"
    />

    <!-- Split Tunneling: two chips for two facts. The status mirrors the master switch, except that
         the local network split is exempt from the super toggle — while the master is off but the
         LAN stays out of the tunnel, the chip says 'Local Network' instead of a false 'Off'. The
         warning fires only while public traffic actually leaves the tunnel (isSplittingTraffic
         already resolves the toggle, the plan, the server's IPv6 support, and server-side splits).
         The warning chip swallows its own click, so it is wired to the same page as the row. -->
    <settings-item
      :title="locale('SPLIT_TUNNELING')"
      :subtitle="locale('SPLIT_TUNNELING_DESC')"
      :is-show="isShowSplitTunneling"
      :isPremium="false"
      :status="{
        state: splitState.isEnabled || splitState.isLocalNetworkSplit,
        onText: splitState.isEnabled ? locale('ON') : locale('LOCAL_NETWORK'),
        offText: locale('OFF')
      }"
      :warning="vhApp.data.isSplitTunnelingActive ? locale('LEAK_IP') : undefined"
      @warning-click="router.push({name: 'SPLIT_TUNNELING'})"
      :click="{name: 'SPLIT_TUNNELING'}"
    />

    <!-- DNS: name resolution is plumbing, not a protection guarantee like the kill switch, and it is
         coupled to the split tunneling above it through SplitDnsMode. Private DNS is the one privacy
         feature inside the page, and it stays discoverable as the page's first card. -->
    <settings-item
      :title="locale('DNS')"
      :subtitle="locale('DNS_DESC')"
      :status="{
        state: vhApp.data.isDnsCustomized,
        onText: vhApp.data.isPrivateDnsCustomized ? locale('PRIVATE_DNS') : locale('CUSTOM'),
        offText: locale('DEFAULT')
      }"
      :isPremium="vhApp.data.isPremiumFeature(AppFeature.CustomDns)"
      :is-show="isShowDns"
      :click="{name: 'DNS'}"
    />

    <!-- PRIVACY & SECURITY SECTION: what the app guarantees about the user's data and exposure -->
    <settings-section-title :title="locale('PRIVACY_AND_SECURITY')" :is-show="isShowPrivacyAndSecuritySection"/>

    <!-- Privacy: analytics consent + the privacy policy link. No status chip: the row opens a page
         that is more than one switch, and an On/Off chip on "Privacy" reads as if privacy itself were
         switched off. The chip's on-state is styled as the healthy one, which is backwards here —
         "on" means MORE data is shared, not that the user is better protected. -->
    <settings-item
      :title="locale('PRIVACY')"
      :subtitle="locale('PRIVACY_DESC')"
      :isPremium="false"
      :is-show="isShowPrivacy"
      :click="{name: 'PRIVACY'}"
    />

    <!-- Kill switch -->
    <settings-item
      :title="locale('KILL_SWITCH')"
      :subtitle="locale('KILL_SWITCH_DESC')"
      :isPremium="false"
      :is-show="isShowKillSwitch"
      :click="{name:'KILL_SWITCH'}"
    />

    <!-- Always on -->
    <settings-item
      :title="locale('ALWAYS_ON')"
      :subtitle="locale('ALWAYS_ON_DESC')"
      :isPremium="vhApp.data.isPremiumFeature(AppFeature.AlwaysOn)"
      :is-show="isShowAlwaysOn"
      :click="{name:'ALWAYS_ON'}"
    />

  </v-sheet>
</template>
