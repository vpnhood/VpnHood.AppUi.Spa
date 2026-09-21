<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { onMounted } from 'vue';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';

const vhApp = VpnHoodApp.instance;


onMounted(() => {
  if (!vhApp.data.userSettings.isTcpProxyPrompted){
    vhApp.data.userSettings.isTcpProxyPrompted = true;
    vhApp.saveUserSetting();
  }
})
</script>

<template>
  <feature-page-layout
    title="CLOAK_MODE_COLORED"
    image="cloak-mode.webp"
    :is-premium="false"
    :is-action-button-available="false"
  />
</template>
