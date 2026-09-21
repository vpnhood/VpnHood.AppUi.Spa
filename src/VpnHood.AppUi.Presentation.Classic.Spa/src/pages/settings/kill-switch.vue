<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
</script>

<template>
  <feature-page-layout
    title="KILL_SWITCH_COLORED"
    description="KILL_SWITCH_DESC"
    image="kill-switch.webp"
    :list-step="[
      locale('KILL_SWITCH_HOW_TO_TURN_ON_STEP_1'),
      locale('KILL_SWITCH_HOW_TO_TURN_ON_STEP_2',{appName: vhApp.data.features.appName, icon: '⚙️'}),
      locale('KILL_SWITCH_HOW_TO_TURN_ON_STEP_3')
    ]"
    button-text="OPEN_VPN_SETTINGS"
    :button-click="()=>vhApp.intentsClient.openKillSwitchSettings()"
    :is-premium="false"
    :is-action-button-available="vhApp.data.intentFeatures.isKillSwitchSettingsSupported"
  />
</template>
