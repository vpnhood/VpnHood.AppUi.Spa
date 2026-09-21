<script setup lang="ts">
import { Util } from '@/helpers/Util';
import router from '@/services/router';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

function formatSpeed(speed: number): string | void {
  return ((speed * 10) / 1000000).toFixed(2);
}
</script>

<template>
  <v-row
    align-content="center"
    justify="center"
    dir="ltr"
    :class="[vhApp.data.isConnected ? 'opacity-100' : 'opacity-0', 'mb-2', 'connection-info-row']"
  >

    <!-- ConnectionStatistics -->
    <v-col cols="12" class="d-flex justify-center align-center text-white text-body-medium opacity-40">
      <v-btn
        :text="locale('STATISTICS')"
        :tabindex="vhApp.data.isConnected ? '3' : null"
        dir="auto"
        variant="text"
        rounded="pill"
        class="d-inline-flex"
        :append-icon="Util.getLocalizedRightChevron()"
        @click="vhApp.data.isConnected ? router.push({ name: 'STATISTICS' }) : null"
      />
    </v-col>

    <!-- Download speed -->
    <v-col cols="auto" dir="ltr" class="d-inline-flex">
      <v-icon
        color="active"
        size="small"
        icon="mdi-arrow-down-thin"
        tabindex="-1"
      />
      <span class="pe-1 text-body-medium text-white">
        {{ formatSpeed(vhApp.data.state.sessionStatus?.speed.received ?? 1) }}
      </span>
      <span class="text-white opacity-40 align-self-center" style="font-size: 10px">Mbps</span>
    </v-col>

    <!-- Upload speed -->
    <v-col cols="auto" dir="ltr" class="d-inline-flex">
      <v-icon
        color="error"
        size="small"
        icon="mdi-arrow-up-thin"
        tabindex="-1"
      />
      <span class="pe-1 text-body-medium text-white">
        {{ formatSpeed(vhApp.data.state.sessionStatus?.speed.sent ?? 1) }}
      </span>
      <span class="text-white opacity-40 order-last align-self-center" style="font-size: 10px">Mbps</span>
    </v-col>
  </v-row>
</template>

<style scoped>
/* Vuetify 4's grid spaces columns with a 24px row gap instead of per-column padding, which pushed
   the speed row far below the Statistics button (and down toward the connect circle). Restore the
   pre-upgrade 4px vertical rhythm through the grid's own variable. */
.connection-info-row {
  --v-col-gap-y: 4px;
}

/* The speeds belong visually to the Statistics button above them, not to the connect circle below.
   The Vuetify-3 grid compat (override.css) spaces the two wrapped grid lines with 12px + 12px of
   column padding; stripping that padding would shrink the row and pull the circle up, so the speed
   columns are instead painted 24px higher — a transform moves no layout box, the row keeps its
   height and the circle stays put. The 24px mirrors those compat paddings and goes with them. */
.connection-info-row > .v-col:not(:first-child),
.connection-info-row > [class*="v-col-"]:not(:first-child) {
  transform: translateY(-24px);
}
</style>
