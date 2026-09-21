<script setup lang="ts">
import { Util } from '@/helpers/Util';
import i18n from '@/locales/i18n';
import { ref } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import router from '@/services/router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const remainingTimeSecond = ref<number>(0);

const fiveMinutes = 299;
const fifteenMinutes = 899;
function calcRemainingTime(): string{
  const currentDate: Date = new Date();
  const expireTime = vhApp.data.state.sessionStatus?.sessionExpirationTime;
  if (!expireTime)
    return "";

  const diffTime = expireTime.getTime() - currentDate.getTime();
  remainingTimeSecond.value = diffTime > 0 ? Math.floor(diffTime / 1000) : 0;

  const hrs = Math.floor(remainingTimeSecond.value / 3600);
  const mins = Math.floor((remainingTimeSecond.value % 3600) / 60);
  const secs = remainingTimeSecond.value % 60;
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}
function pad(num: number): string{
  return num.toString().padStart(2, '0');
}
function getCountdownColor(): string{
  if (remainingTimeSecond.value < fiveMinutes)
    return 'count-down-warning';
  if (remainingTimeSecond.value < fifteenMinutes)
    return 'count-down-alert';
  return 'count-down-normal';
}
</script>

<template>
  <v-chip
    prepend-icon="mdi-crown"
    :color="getCountdownColor()"
    class="pe-1"
    variant="tonal"
  >
    <span class="text-start" style="width: 63px">{{ calcRemainingTime() }}</span>
    <v-chip
      v-if="vhApp.data.state.sessionStatus?.canExtendByRewardedAd"
      variant="flat"
      :color="getCountdownColor()"
      class="text-capitalize font-weight-bold"
      :append-icon="Util.getLocalizedRightChevron()"
      size="small"
      :text="locale('EXTEND_IT')"
      @click="router.push({name: 'EXTEND_SESSION'})"
    />
  </v-chip>
</template>
