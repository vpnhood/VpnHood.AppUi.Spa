<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';
import { AppFeature } from '@/services/VpnHood.Client.Api';
import { onMounted, ref } from 'vue';
import router from '@/services/router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const isShowSkipBtn = ref<boolean>(false);
const supportedRequestQuickLaunchSteps = [
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_STEP_1'),
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_STEP_2')
]
const unsupportedRequestQuickLaunchSteps = [
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_ALTERNATIVE_STEP_1'),
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_ALTERNATIVE_STEP_2'),
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_ALTERNATIVE_STEP_3',{appName: vhApp.data.features.appName}),
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_ALTERNATIVE_STEP_4'),
  locale('QUICK_LAUNCH_HOW_TO_TURN_ON_ALTERNATIVE_STEP_5')
]

async function addQuickLaunchHandler() {
  const result = await vhApp.intentsClient.requestQuickLaunch();
  if (result)
    router.go(-1);
}

onMounted(() => {
  isShowSkipBtn.value = vhApp.data.state.isQuickLaunchRecommended;
  if (!vhApp.data.userSettings.isQuickLaunchPrompted){
    vhApp.data.userSettings.isQuickLaunchPrompted = true;
    vhApp.saveUserSetting();
  }
})
</script>

<template>
  <feature-page-layout
    title="QUICK_LAUNCH_COLORED"
    description="QUICK_LAUNCH_DESC"
    image="quick-launch.webp"
    :list-step=" vhApp.data.intentFeatures.isRequestQuickLaunchSupported ? supportedRequestQuickLaunchSteps : unsupportedRequestQuickLaunchSteps"
    button-text="QUICK_LAUNCH_TURN_ON"
    :button-click="()=>addQuickLaunchHandler()"
    :is-premium="vhApp.data.isPremiumFeature(AppFeature.QuickLaunch)"
    :is-action-button-available="vhApp.data.intentFeatures.isRequestQuickLaunchSupported"
    :is-show-skip-btn="isShowSkipBtn"
  />
</template>
