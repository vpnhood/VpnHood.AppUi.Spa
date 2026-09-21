<script setup lang="ts">
import SplitDomainInput from '@/components/SplitTunneling/SplitDomainInput.vue';
import SplitTunnelingDisabledAlert from '@/components/SplitTunneling/SplitTunnelingDisabledAlert.vue';
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { AppFeature, SplitDomains, TcpProxyUsageReason } from '@/services/VpnHood.Client.Api';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';
import SettingsToggleItem from '@/components/Settings/SettingsToggleItem.vue';
import { computed, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import i18n from '@/locales/i18n';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

function createNormalizedSplitDomains(value?: SplitDomains | null): SplitDomains {
  return new SplitDomains({
    excludes: value?.excludes ?? '',
    includes: value?.includes ?? '',
    blocks: value?.blocks ?? ''
  });
}

const isLoading = ref<boolean>(true);
const splitDomains = ref<SplitDomains>(createNormalizedSplitDomains());
const showRevertButton = ref<boolean>(false);
let savedDomains = createNormalizedSplitDomains();

const isDomainFilterAffectedByServer = computed<boolean>(
  () => vhApp.data.state.tcpProxyUsageReason === TcpProxyUsageReason.ServerRequiredOff
);

const isEnabled = computed<boolean>({
  get: () => vhApp.data.userSettings.splitTunneling.useDomain,
  set: async (value: boolean) => {
    vhApp.data.userSettings.splitTunneling.useDomain = value;
    await vhApp.saveUserSetting();
  }
});

// master gate: the controls below are inert while splitting is off; SplitTunnelingDisabledAlert
// explains and repairs
const isSplitTunnelingEnabled = computed<boolean>(() => vhApp.data.userSettings.splitTunneling.enabled);

onMounted(async () => {
  splitDomains.value = createNormalizedSplitDomains(await vhApp.appClient.getSplitDomains());
  savedDomains = createNormalizedSplitDomains(splitDomains.value);
  isLoading.value = false;
});

async function saveDomainList(): Promise<void> {
  await vhApp.appClient.setSplitDomains(createNormalizedSplitDomains(splitDomains.value));
  await vhApp.saveUserSetting();
}

// Returning false cancels the navigation; returning nothing allows it (vue-router 5 guard style).
onBeforeRouteLeave(async () => {
  try {
    if (splitDomains.value.excludes !== savedDomains.excludes ||
      splitDomains.value.includes !== savedDomains.includes ||
      splitDomains.value.blocks !== savedDomains.blocks)
      await saveDomainList();
  } catch (err: unknown) {
    showRevertButton.value = true;
    await vhApp.processError(err);
    return false;
  }
});

function revertCurrentChange(): void {
  splitDomains.value = createNormalizedSplitDomains(savedDomains);
  showRevertButton.value = false;
}
</script>

<template>
  <feature-page-layout
    v-if="!vhApp.data.isPremiumFeatureAllowed(AppFeature.SplitDomain)"
    title="SPLIT_DOMAINS"
    description="SPLIT_DOMAINS_DESC"
    image="split-ip.webp"
    :is-premium="vhApp.data.isPremiumFeature(AppFeature.SplitDomain)"
    :is-action-button-available="false"
  />

  <v-sheet v-else>
    <app-bar/>

    <split-tunneling-disabled-alert/>

    <settings-toggle-item
      v-model="isEnabled"
      :title="locale('SPLIT_DOMAINS')"
      :disabled="!isSplitTunnelingEnabled || !vhApp.data.isPremiumFeatureAllowed(AppFeature.SplitDomain)"
    >
      <alert-warning v-if="isDomainFilterAffectedByServer" :text="locale('DOMAIN_FILTER_SERVER_NO_CLOAK')" class="mt-2" />
    </settings-toggle-item>
    <split-domain-input
      :excludes="splitDomains.excludes"
      :includes="splitDomains.includes"
      :blocks="splitDomains.blocks"
      :loading="isLoading"
      :disabled="!isSplitTunnelingEnabled || !isEnabled"
      @update:excludes="splitDomains.excludes = $event"
      @update:includes="splitDomains.includes = $event"
      @update:blocks="splitDomains.blocks = $event"
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
