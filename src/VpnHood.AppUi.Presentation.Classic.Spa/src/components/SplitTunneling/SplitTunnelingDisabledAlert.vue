<script setup lang="ts">
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

// writes the master flag itself; the alert hides instantly because the v-if reads the same setting
async function turnOn(): Promise<void> {
  vhApp.data.userSettings.splitTunneling.enabled = true;
  await vhApp.saveUserSetting();
}
</script>

<template>
  <!-- Entry-point guard for toggle-gated split pages: the split-tunneling index dims its rows while
       splitting is off, but home shortcuts and deep links land on these pages directly — so the page
       explains why its edits have no effect instead of relying on every caller, and repairs it in
       one tap. -->
  <alert-warning v-if="!vhApp.data.userSettings.splitTunneling.enabled" class="mb-4">
    {{ locale('SPLIT_TUNNELING_DISABLED_ALERT') }}
    <a class="text-decoration-underline font-weight-bold" href="#" @click.prevent="turnOn()">
      {{ locale('TURN_ON') }}
    </a>
  </alert-warning>
</template>
