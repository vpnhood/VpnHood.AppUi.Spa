<script setup lang="ts">
import router from '@/services/router';
import CountDown from '@/components/Home/CountDown.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { ref } from 'vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const isPremiumSupported = ref(vhApp.data.isPremiumSupported);
function isShowCountdown(): boolean {
  // Do not display the expiry countdown for premium users. The expiration status of a premium account is
  // already shown elsewhere in the app. The countdown timer should only be visible for users on rewarded
  // ads or trial account.
  const hasExpireTime = !!vhApp.data.state.sessionStatus?.sessionExpirationTime;
  return !vhApp.data.isPremiumUser && hasExpireTime && vhApp.data.isConnected;
}
</script>

<template>
  <!-- Countdown and extend session button -->
  <count-down v-if="isShowCountdown()" tabindex="2" />

  <!-- You are premium button -->
  <v-chip
    v-else-if="isPremiumSupported && vhApp.data.isPremiumUser"
    prepend-icon="mdi-crown"
    :text="locale('YOU_ARE_PREMIUM')"
    color="enable-premium"
    variant="tonal"
    tabindex="2"
    tag="h6"
    @click="router.push({ name: 'ACCOUNT' })"
  />

  <!-- Go Premium button -->
  <v-btn
    v-else-if="isPremiumSupported && vhApp.data.state.clientProfile?.canGoPremium == true"
    variant="outlined"
    color="go-premium-btn"
    rounded="pill"
    tabindex="2"
    size="small"
    height="35"
    class="ps-1 pe-3 text-capitalize"
    @click="router.push({ name: 'PURCHASE_SUBSCRIPTION' })"
  >
    <v-icon
      icon="mdi-crown"
      size="25"
      class="bg-go-premium-btn rounded-circle me-2"
    />
    {{ locale('GO_PREMIUM') }}
  </v-btn>
</template>
