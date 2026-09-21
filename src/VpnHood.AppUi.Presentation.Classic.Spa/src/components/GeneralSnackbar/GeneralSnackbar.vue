<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { computed, ref, watch } from 'vue';
import type { GeneralSnackbarState } from '@/helpers/ui-state/GeneralSnackbarState';
import i18n from '@/locales/i18n';
import vuetify from '@/theme/vuetify';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
}>();

const snackbarState = ref<GeneralSnackbarState>(VpnHoodApp.instance.data.uiState.generalSnackbarState);
const timeOut = computed(() => {
  if (snackbarState.value.hasTimer){
    return snackbarState.value.timeOut ?? 3000;
  }
  return -1;
});

// Remount the countdown bar on each show so its CSS animation restarts from full width
const countdownKey = ref<number>(0);
watch(() => props.modelValue, (isShow) => {
  if (isShow) countdownKey.value++;
});

const variantIcon = computed(() => {
  switch (snackbarState.value.bgColor) {
    case 'active': return 'mdi-check-circle';
    case 'warning': return 'mdi-alert-circle';
    default: return 'mdi-information';
  }
});

function hasCloseButton(): boolean{
  if (snackbarState.value.hasCloseBtn !== null)
    return snackbarState.value.hasCloseBtn;

  return !snackbarState.value.hasTimer;
}
function onCloseButton(){
  // Set ignore time by user for 'suppress to' to prevent showing up again until a new connection is created
  if (vhApp.data.state.sessionInfo?.suppressedTo && vhApp.data.state.connectRequestTime)
    vhApp.data.uiState.userIgnoreSuppressToTime = vhApp.data.state.connectRequestTime;

  emit('update:modelValue',false);
}
</script>

<template>
  <v-snackbar
    :modelValue="props.modelValue"
    @update:modelValue="$emit('update:modelValue',false)"
    location="top"
    :class="{'mt-5': !vuetify.display.smAndDown.value}"
    class="pt-2 general-snackbar"
    :style="`margin-top: ${vhApp.data.edgeToEdgeTopHeight}px;`"
    rounded="xl"
    :timeout="timeOut"
    :content-class="snackbarState.textColor ? `text-${snackbarState.textColor}` : ''"
    :color="snackbarState.bgColor"
  >
    <div class="d-flex align-center ga-3">
      <v-icon :icon="variantIcon" size="22" />
      <span>{{ snackbarState.message }}</span>
    </div>
    <div
      v-if="snackbarState.hasTimer"
      :key="countdownKey"
      class="countdown-bar"
      :style="`animation-duration: ${timeOut}ms;
        transform-origin: ${vuetify.locale.isRtl.value ? 'right' : 'left'};`"
    />
    <template v-slot:actions v-if="hasCloseButton()">
      <v-btn :text="locale('CLOSE')" size="small" @click="onCloseButton" />
    </template>
  </v-snackbar>
</template>

<style scoped>
/* Anchor the countdown bar to the card, not the overlay */
.general-snackbar :deep(.v-snackbar__wrapper) {
  position: relative;
}
/* CSS-animated countdown: runs on the compositor, so it stays smooth while JS is busy */
.countdown-bar {
  position: absolute;
  inset-inline: 0;
  bottom: 0;
  height: 3px;
  background: rgba(255, 255, 255, 0.45);
  animation: countdown linear forwards;
}
@keyframes countdown {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
</style>
