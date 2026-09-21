<script setup lang="ts">
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { ConnectManager } from '@/helpers/ConnectManager';
import { computed } from 'vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

// Under the page title, which is the slot Android apps give a persistent banner — not over it, and
// above all not in the status bar strip, which is where a plain top:0 lands once edge-to-edge moves
// the page down. The page's header publishes that offset (see PageHeaderAnchor); until one has been
// laid out, the status bar height alone at least keeps the bar out from under the notch.
const topOffset = computed<number>(() =>
  vhApp.data.uiState.pageHeaderBottom ?? vhApp.data.edgeToEdgeTopHeight ?? 0);

// A connect-only setting changed while a session runs (see AppState.isReconnectRequired). The flag
// lives in the app: it clears itself on connect/disconnect, and dismissing acknowledges it away
// through the api (same pattern as clearLastError) — no local state to keep in sync.
async function dismiss(): Promise<void> {
  // update the local copy first so the bar hides instantly; the next state poll confirms it
  vhApp.data.state.isReconnectRequired = false;
  await vhApp.appClient.clearReconnectRequired();
}

async function reconnect(): Promise<void> {
  await vhApp.disconnect();
  await ConnectManager.connectWithCurrentProfile();
}
</script>

<template>
  <!-- Overlaid on top of the page content instead of participating in layout: showing the bar
       must not push the page (and the mobile footer) down. Anchors to v-main, which App.vue
       makes position-relative, and sits at the page header's bottom edge — see topOffset. -->
  <transition name="reconnect-alert">
    <v-alert
      v-if="vhApp.data.state.isReconnectRequired && vhApp.data.isConnected"
      closable
      :icon="false"
      density="compact"
      type="warning"
      class="text-body-small reconnect-alert-bar elevation-3"
      :style="`top: ${topOffset}px;`"
      @click:close="dismiss()"
    >
      {{ locale('RECONNECT_REQUIRED_MSG') }}
      <a class="text-decoration-underline font-weight-bold" href="#" @click.prevent="reconnect()">
        {{ locale('RECONNECT') }}
      </a>
    </v-alert>
  </transition>
</template>

<style scoped>
/* Physical left/right rather than logical inset properties: their postcss transpilation is
   disabled for legacy browsers (see vite.config.ts), and the bar is symmetric so RTL is unaffected.
   'top' is bound inline — it follows the page header. */
.reconnect-alert-bar {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 5;
}

.reconnect-alert-enter-active,
.reconnect-alert-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.reconnect-alert-enter-from,
.reconnect-alert-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
