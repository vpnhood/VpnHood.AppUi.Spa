<script setup lang="ts">
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { AppFeature, SplitDnsMode, SplitUnsupportedIpMode } from '@/services/VpnHood.Client.Api';
import SmallFeatureImageAndDescription from '@/components/Settings/SmallFeatureImageAndDescription.vue';
import SettingsItem from '@/components/Settings/SettingsItem.vue';
import SettingsToggleItem from '@/components/Settings/SettingsToggleItem.vue';
import SettingsSectionTitle from '@/components/Settings/SettingsSectionTitle.vue';
import { computed } from 'vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

// Every display — on/off states AND mode labels — comes from the app state (already resolved by
// the super toggle and premium gating); the UI adds no logic of its own. Only the toggle's v-model
// reads and writes the stored setting.
const splitState = computed(() => vhApp.data.state.splitTunnelingState);

// Split apps is the only platform-gated row on this page, so it is the only section title that can
// be left standing over nothing. The guard names its sibling too, so it stays correct if the sibling
// ever gains a gate of its own; the remaining sections hold ungated rows and are always shown.
const isShowSplitApps = computed(() =>
  vhApp.data.features.isExcludeAppsSupported || vhApp.data.features.isIncludeAppsSupported);
const isShowSplitDomains: boolean = true;
const isShowAppsAndDomainsSection = computed(() => isShowSplitApps.value || isShowSplitDomains);

const isEnabled = computed<boolean>({
  get: () => vhApp.data.userSettings.splitTunneling.enabled,
  set: async (value: boolean) => {
    vhApp.data.userSettings.splitTunneling.enabled = value;
    await vhApp.saveUserSetting();
  }
});
</script>

<template>

  <v-sheet>
    <app-bar/>

    <small-feature-image-and-description image="split-ip.webp" :description="locale('SPLIT_TUNNELING_DESC')" />

    <!-- The super toggle: allow splitting at all. Off is the one-tap guarantee that nothing escapes
         the tunnel; every item below turns inert except the local network (it cannot leak the
         public IP, so it is exempt). The warning chip is the whole caution of the feature, said
         quietly and only while it applies. -->
    <settings-toggle-item
      v-model="isEnabled"
      class="mb-4"
      :title="locale('SPLIT_TUNNELING_TOGGLE')"
      :warning="splitState.isEnabled ? locale('LEAK_IP') : undefined"
      :description="splitState.isEnabled ? locale('SPLIT_TUNNELING_TOGGLE_DESC') : locale('SPLIT_TUNNELING_DISABLED_DESC')"
    />

    <!-- The server leaves some public destinations outside the tunnel while splitting is allowed -->
    <alert-info v-if="splitState.isSplitByServer" :text="locale('SERVER_SPLIT_TRAFFIC_NOTICE')" class="mb-4"/>

    <!-- Apps & Domains -->
    <settings-section-title :title="locale('APPS_AND_DOMAINS')" :is-show="isShowAppsAndDomainsSection"/>

    <!-- Split apps: exempt from the super toggle — an app kept out of the VPN is a per-app choice
         and cannot expose the IP of the apps that stay inside, same reasoning as the local network.
         A status rather than a selected item, so a mode that splits nothing dims to 'Off'; no
         warning color because the on-state is not a leak. -->
    <settings-item
      :title="locale('SPLIT_APPS')"
      :subtitle="locale('SPLIT_APPS_SHORT_DESC')"
      :is-premium="false"
      :is-show="isShowSplitApps"
      :status="{
        state: splitState.isAppSplit,
        onText: vhApp.data.splitAppsStatusText,
        offText: locale('OFF'),
        onColor: 'switch-btn'
      }"
      :click="{name: 'SPLIT_APPS'}"
    />

    <!-- Split domains -->
    <settings-item
      :title="locale('SPLIT_DOMAINS')"
      :subtitle="locale('SPLIT_DOMAINS_SHORT_DESC')"
      :is-premium="vhApp.data.isPremiumFeature(AppFeature.SplitDomain)"
      :is-show="isShowSplitDomains"
      :status="{
        state: splitState.isDomainSplit,
        onText: locale('ON'),
        offText: locale('OFF')
      }"
      :disabled="!splitState.isEnabled"
      :click="{name: 'SPLIT_DOMAINS'}"
    />

    <!-- IP Addresses -->
    <settings-section-title :title="locale('IP_ADDRESSES')" :is-show="true"/>

    <!-- Filter by device -->
    <settings-item
      :title="locale('SPLIT_IPS_VIA_DEVICE')"
      :subtitle="locale('SPLIT_IPS_VIA_DEVICE_SHORT_DESC')"
      :is-premium="vhApp.data.isPremiumFeature(AppFeature.SplitIpViaDevice)"
      :is-show="true"
      :status="{
        state: splitState.isIpViaDeviceSplit,
        onText: locale('ON'),
        offText: locale('OFF')
      }"
      :disabled="!splitState.isEnabled"
      :click="{name: 'SPLIT_IPS_VIA_DEVICE'}"
    />

    <!-- Filter by App -->
    <settings-item
      :title="locale('SPLIT_IPS_VIA_APP')"
      :subtitle="locale('SPLIT_IPS_VIA_APP_SHORT_DESC')"
      :is-premium="vhApp.data.isPremiumFeature(AppFeature.SplitIpViaApp)"
      :is-show="true"
      :status="{
        state: splitState.isIpViaAppSplit,
        onText: locale('ON'),
        offText: locale('OFF')
      }"
      :disabled="!splitState.isEnabled"
      :click="{name: 'SPLIT_IPS_VIA_APP'}"
    />

    <!-- IPv6 on a server that cannot carry it: bypass or block. The chip answers whether IPv6 is
         being split out, so the safe mode reads 'Off' like every other row and only the mode that
         lets IPv6 leave the tunnel spells out its effect. -->
    <settings-item
      :title="locale('SPLIT_IPV6')"
      :subtitle="locale('SPLIT_IPV6_SHORT_DESC')"
      :is-premium="false"
      :is-show="true"
      :status="{
        state: splitState.unsupportedIpV6Mode === SplitUnsupportedIpMode.Exclude,
        onText: locale('SPLIT_IPV6_EXCLUDE'),
        offText: locale('OFF'),
        onColor: 'warning'
      }"
      :disabled="!splitState.isEnabled"
      :click="{name: 'SPLIT_IPV6'}"
    />

    <!-- Location -->
    <settings-section-title :title="locale('LOCATIONS')" :is-show="true"/>

    <!-- Local network: exempt from the super toggle — LAN traffic cannot expose the public IP -->
    <settings-item
      :title="locale('SPLIT_LOCAL_NETWORK')"
      :subtitle="locale('SPLIT_LOCAL_NETWORK_SHORT_DESC')"
      :is-show="true"
      :is-premium="false"
      :status="{
        state: splitState.isLocalNetworkSplit,
        onText: locale('ON'),
        offText: locale('OFF')
      }"
      :click="{name: 'SPLIT_LOCAL_NETWORK'}"
    />

    <!-- Split countries: a status rather than a selected item, so a mode that splits nothing dims to
         'Off' like its neighbours; the active chip keeps the selected-item color it always had -->
    <settings-item
      :title="locale('SPLIT_COUNTRIES')"
      :subtitle="locale('SPLIT_COUNTRIES_SHORT_DESC')"
      :is-premium="vhApp.data.isPremiumFeature(AppFeature.SplitCountry)"
      :is-show="true"
      :status="{
        state: splitState.isCountrySplit,
        onText: vhApp.data.splitCountryStatusText,
        offText: locale('OFF'),
        onColor: 'switch-btn'
      }"
      :disabled="!splitState.isEnabled"
      :click="{name: 'SPLIT_COUNTRIES'}"
    />

    <!-- DNS -->
    <settings-section-title :title="locale('DNS')" :is-show="true"/>

    <!-- Split DNS -->
    <settings-item
      :title="locale('SPLIT_DNS')"
      :subtitle="locale('SPLIT_DNS_SHORT_DESC')"
      :is-show="true"
      :is-premium="false"
      :status="{
        state: splitState.dnsMode === SplitDnsMode.DefaultRoute,
        onText: locale('SPLIT_DNS_DEFAULT_ROUTE'),
        offText: locale('OFF'),
        onColor: 'warning'
      }"
      :disabled="!splitState.isEnabled"
      :click="{name: 'SPLIT_DNS'}"
    />

  </v-sheet>
</template>
