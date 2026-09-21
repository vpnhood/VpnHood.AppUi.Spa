<script setup lang="ts">
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';

// The one line that tells a browser on the network whose app it is driving. In the page's flow, at
// the top of every page, never dismissed: the pairing lasts exactly as long as the TV keeps its
// Remote Access screen open (TV plan §4.3), and that is the fact the person needs in front of them
// while they work. Same-origin with the app, so nothing here has to know which device it is.
const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
</script>

<template>
  <v-alert
    v-if="vhApp.data.isManagingTv"
    type="info"
    variant="tonal"
    density="compact"
    rounded="0"
    icon="mdi-television"
    class="managing-tv-banner text-body-small"
    :text="locale('MANAGING_TV_BANNER')"
  />
</template>
