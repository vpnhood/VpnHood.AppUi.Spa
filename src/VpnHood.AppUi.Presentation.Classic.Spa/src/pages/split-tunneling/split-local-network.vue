<script setup lang="ts">
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { computed } from 'vue';
import i18n from '@/locales/i18n';
import SmallFeatureImageAndDescription from '@/components/Settings/SmallFeatureImageAndDescription.vue';
import SettingsToggleItem from '@/components/Settings/SettingsToggleItem.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const isEnabled = computed<boolean>({
  get: () => vhApp.data.userSettings.splitTunneling.useLocalNetwork,
  set: async (value: boolean) => {
    vhApp.data.userSettings.splitTunneling.useLocalNetwork = value;
    await vhApp.saveUserSetting();
  }
});
</script>

<template>
  <v-sheet>
    <app-bar/>

    <small-feature-image-and-description image="access-local-network.webp"  />

    <!-- Enforced by server alert -->
    <alert-warning v-if="!vhApp.data.isLocalNetworkAvailable" :text="locale('ENFORCED_BY_SERVER')" class="mb-4" />

    <settings-toggle-item
      v-model="isEnabled"
      :title="locale('SPLIT_LOCAL_NETWORK')"
      :description="locale('SPLIT_LOCAL_NETWORK_DESC')"
      :disabled="!vhApp.data.isLocalNetworkAvailable"
    />
  </v-sheet>
</template>
