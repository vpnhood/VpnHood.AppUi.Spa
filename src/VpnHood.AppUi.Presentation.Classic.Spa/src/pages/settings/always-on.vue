<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';
import { AppFeature } from '@/services/VpnHood.Client.Api';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
</script>

<template>
  <feature-page-layout
    title="ALWAYS_ON_COLORED"
    description="ALWAYS_ON_DESC"
    image="always-on.webp"
    :list-step="[
      locale('ALWAYS_ON_HOW_TO_TURN_ON_STEP_1'),
      locale('ALWAYS_ON_HOW_TO_TURN_ON_STEP_2',{appName: vhApp.data.features.appName, icon: '⚙️'}),
      locale('ALWAYS_ON_HOW_TO_TURN_ON_STEP_3')
    ]"
    button-text="OPEN_VPN_SETTINGS"
    :button-click="()=>vhApp.intentsClient.openAlwaysOnSettings()"
    :is-premium="vhApp.data.isPremiumFeature(AppFeature.AlwaysOn)"
    :is-action-button-available="vhApp.data.intentFeatures.isAlwaysOnSettingsSupported"
  />
</template>
