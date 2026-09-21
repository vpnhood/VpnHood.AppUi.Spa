<script setup lang="ts">
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import PremiumIcon from '@/components/PremiumIcon.vue';
import i18n from '@/locales/i18n';
import type { RouteLocationRaw } from 'vue-router';

const locale = i18n.global.t;

const props = defineProps< {
  title: string,
  subtitle: string,
  isPremium: boolean,
  click: RouteLocationRaw,
  selectedItem?: string,
  warning?: string,
  status?: {
    state: boolean,
    onText: string,
    offText: string,
    // color of the on-state chip; a setting whose on-state weakens protection passes 'warning' so the
    // chip does not read as a healthy state
    onColor?: string,
  },
  isShow: boolean,
  // dims the whole item and blocks navigation; stored values keep showing so the user sees what
  // would come back when the item's master switch is turned on again
  disabled?: boolean,
  languageMoreAction?: boolean
}>();

const emit = defineEmits<{
  (e: 'warning-click'): void,
}>();



async function activate(): Promise<void> {
  if (props.disabled)
    return;
  await router.push(props.click);
}
</script>

<template>
  <!-- The click belongs on the card, not on an inner div: a VCard only becomes interactive when it
       carries the handler itself, and without that the row answers a tap with nothing at all — no
       ripple, no pressed state — until the next page finishes animating in, which reads as lag. -->
  <!-- tabindex + Enter: a VCard with a click is mouse-and-touch only. Vuetify 4 gives it v-card--link
       and onClick but no tabindex and no key handling, so a remote could neither reach the row nor
       press it. tabindex puts it under the D-pad; Enter is the remote's centre press. .prevent, so a
       WebView that already turns Enter into a click cannot navigate twice. -->
  <config-card
    v-if="props.isShow"
    class="pa-3"
    :disabled="props.disabled"
    :tabindex="props.disabled ? -1 : 0"
    @click="activate()"
    @keydown.enter.prevent="activate()"
  >

    <div>

      <!-- Title, selected item and status (If available) and premium icon (If available) -->
      <div class="d-flex align-center justify-space-between pb-1">

        <!-- Title, selected item and status (If available) -->
        <div class="d-flex align-center justify-space-between ga-2">
          <span>{{ props.title }}</span>

          <!-- Selected item if available -->
          <v-chip v-if="props.selectedItem"
            :text="props.selectedItem"
            size="small"
            variant="tonal"
            density="comfortable"
            color="switch-btn"
          />

          <!-- Status if available -->
          <v-chip v-else-if="props.status?.state !== undefined"
            :text="props.status.state ? props.status.onText : props.status.offText"
            size="small"
            variant="tonal"
            density="comfortable"
            :disabled="!props.status.state"
            :color="props.status.state ? (props.status.onColor ?? 'enable-premium') : ''"
          />

          <!-- Warning chip if available (e.g. a setting whose current posture can leak); shown alongside
               the selected item or status, never instead of them. Opens its own explanation instead of
               following the item's link. -->
          <v-chip v-if="props.warning"
            :text="props.warning"
            size="small"
            variant="tonal"
            density="comfortable"
            color="warning"
            @click.stop="emit('warning-click')"
          />

        </div>

        <!-- Premium icon for premium features -->
        <premium-icon :is-premium="props.isPremium" />

      </div>

      <!-- Item description (Show chevron icon if the item does not have the model) -->
      <v-card-subtitle class="d-flex align-center justify-space-between ga-3 pa-0">
        <span>{{ props.subtitle }}</span>
        <v-icon :icon="Util.getLocalizedRightChevron()"/>
      </v-card-subtitle>

    </div>

    <!-- Language contribute link. Swallows its own clicks now that the whole card navigates:
         reaching for the GitHub link must not open the language page instead. -->
    <div v-if="props.languageMoreAction" class="text-body-small" @click.stop>
      <v-divider class="my-3"/>

      <!-- Description -->
      <p class="text-disabled mb-2">{{ locale('CONTRIBUTE_EDIT_LANGUAGES_DESC') }}</p>

      <!-- Link -->
      <a
        class="text-highlight text-decoration-none"
        href="https://github.com/vpnhood/VpnHood.Client.WebUI/tree/main/src/locales"
        target="_blank"
      >
        {{ locale('CONTRIBUTE_EDIT_LANGUAGES_Title') }}
        <v-icon icon="mdi-open-in-new" />
      </a>
    </div>

  </config-card>
</template>
