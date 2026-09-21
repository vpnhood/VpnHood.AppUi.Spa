<script setup lang="ts">
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  errorMessage: string,
  isRetrying: boolean,
}>();

// Retry is the whole offer while the store cannot be reached: there is no cached catalog to fall
// back on, and starting a purchase against unconfirmed products would charge at the store with
// nowhere to redeem the proof.
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <v-card
    class="py-3 px-3 rounded-lg text-white mb-4 border border-error border-opacity-100"
    color="rgba(var(--v-theme-card-on-grad-bg), 0.3)"
  >
    <v-icon class="pe-3" color="error" icon="mdi-alert-circle-outline" />
    <span class="text-error text-body-small">{{ locale('ONLINE_PURCHASE_IS_NOT_AVAILABLE') }}</span>
    <v-btn
      :text="locale('TRY_AGAIN')"
      :loading="props.isRetrying"
      color="error"
      variant="flat"
      rounded="pill"
      size="small"
      block
      prepend-icon="mdi-refresh"
      class="text-lowercase mt-2"
      @click="emit('retry')"
    />
    <v-btn
      :text="locale('MORE_INFO')"
      color="error"
      variant="tonal"
      rounded="pill"
      size="small"
      block
      class="text-lowercase mt-2"
      @click="vhApp.showErrorMessage(props.errorMessage)"
    />
  </v-card>
</template>
