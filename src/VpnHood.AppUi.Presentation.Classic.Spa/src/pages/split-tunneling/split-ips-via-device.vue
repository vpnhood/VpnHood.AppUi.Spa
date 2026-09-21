<script setup lang="ts">
import SplitIpInput from '@/components/SplitTunneling/SplitIpInput.vue';
import SplitTunnelingDisabledAlert from '@/components/SplitTunneling/SplitTunnelingDisabledAlert.vue';
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { SplitIpsViaDevice } from '@/services/VpnHood.Client.Api';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';
import SettingsToggleItem from '@/components/Settings/SettingsToggleItem.vue';
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import i18n from '@/locales/i18n';
import { AppFeature } from '@/services/VpnHood.Client.Api';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

function createNormalizedSplitIps(value?: SplitIpsViaDevice | null): SplitIpsViaDevice {
  return new SplitIpsViaDevice({
    includes: value?.includes ?? '',
    excludes: value?.excludes ?? ''
  });
}

const isLoading = ref<boolean>(true);
const ipFilters = ref<SplitIpsViaDevice>(createNormalizedSplitIps());
const showRevertButton = ref<boolean>(false);
let savedIps = createNormalizedSplitIps();

const isEnabled = computed<boolean>({
  get: () => vhApp.data.userSettings.splitTunneling.useIpViaDevice,
  set: async (value: boolean) => {
    vhApp.data.userSettings.splitTunneling.useIpViaDevice = value;
    await vhApp.saveUserSetting();
  }
});

// master gate: the controls below are inert while splitting is off; SplitTunnelingDisabledAlert
// explains and repairs
const isSplitTunnelingEnabled = computed<boolean>(() => vhApp.data.userSettings.splitTunneling.enabled);

onMounted(async () => {
  ipFilters.value = createNormalizedSplitIps(await vhApp.appClient.getSplitIpsViaDevice());
  savedIps = createNormalizedSplitIps(ipFilters.value);
  isLoading.value = false;
});

async function saveIpList(): Promise<void> {
  await vhApp.appClient.setSplitIpsViaDevice(createNormalizedSplitIps(ipFilters.value));
  await vhApp.saveUserSetting();
}

// Returning false cancels the navigation; returning nothing allows it (vue-router 5 guard style).
onBeforeRouteLeave(async () => {
  try {
    if (ipFilters.value.excludes !== savedIps.excludes ||
      ipFilters.value.includes !== savedIps.includes)
      await saveIpList();
  } catch (err: unknown) {
    showRevertButton.value = true;
    await vhApp.processError(err);
    return false;
  }
});

function revertCurrentChange(): void {
  ipFilters.value = createNormalizedSplitIps(savedIps);
  showRevertButton.value = false;
}
</script>

<template>
  <feature-page-layout
    v-if="!vhApp.data.isPremiumFeatureAllowed(AppFeature.SplitIpViaDevice)"
    title="SPLIT_IPS_VIA_DEVICE"
    description="SPLIT_IPS_VIA_DEVICE_DESC"
    image="split-ip.webp"
    :is-premium="vhApp.data.isPremiumFeature(AppFeature.SplitIpViaDevice)"
    :is-action-button-available="false"
  />

  <v-sheet v-else>
    <app-bar/>

    <split-tunneling-disabled-alert/>

    <settings-toggle-item
      v-model="isEnabled"
      :title="locale('SPLIT_IPS_VIA_DEVICE')"
      :description="locale('SPLIT_IPS_VIA_DEVICE_SHORT_DESC')"
      :disabled="!isSplitTunnelingEnabled || !vhApp.data.isPremiumFeatureAllowed(AppFeature.SplitIpViaDevice)"
    />
    <split-ip-input
      :excludes="ipFilters.excludes"
      :includes="ipFilters.includes"
      :loading="isLoading"
      :disabled="!isSplitTunnelingEnabled || !isEnabled"
      @update:excludes="ipFilters.excludes = $event"
      @update:includes="ipFilters.includes = $event"
    />
    <btn-style-3
      v-if="showRevertButton"
      block
      class="mt-4"
      :text="locale('REVERT')"
      @click="revertCurrentChange()"
    />
  </v-sheet>
</template>
