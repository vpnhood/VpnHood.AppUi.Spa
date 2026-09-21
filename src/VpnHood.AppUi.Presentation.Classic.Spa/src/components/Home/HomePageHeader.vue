<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed, ref } from 'vue';
import { ComponentRouteController } from '@/services/ComponentRouteController';
import { ComponentName } from '@/helpers/UiConstants';
import { usePageHeaderAnchor } from '@/helpers/PageHeaderAnchor';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const pageHeaderRef = usePageHeaderAnchor();

const openDebugDialogCounter = ref<number>(0);
const navigationDrawerModel = ref(new ComponentRouteController(ComponentName.NavigationDrawer));
const isDebugDataHasValue = computed<boolean>( () => {
  return vhApp.data.userSettings.debugData1 !== null || vhApp.data.userSettings.debugData2 !== null
});

function openDebugDialog() {
  openDebugDialogCounter.value++;

  if (isDebugDataHasValue.value || openDebugDialogCounter.value === 5)
    vhApp.data.uiState.isShowDeveloperDialog = true;

  // reset counter if no click within 5 second
  setTimeout(() => {
    openDebugDialogCounter.value = 0;
  }, 5000);
}
</script>

<template>
  <v-row ref="pageHeaderRef" class="align-center v-row--no-gutters mx-0">

    <!-- Navigation drawer button. On the TV UI the drawer is never opened: everything it leads to
         is done from a phone through remote access, and the way there is the Settings row at the
         end of the home page (pages/index.vue), so the header holds nothing to focus. The column
         stays, to keep the app name centred. -->
    <v-col cols="3">
      <v-app-bar-nav-icon
        v-if="!vhApp.data.isTvUi"
        tabindex="1"
        color="home-app-bar"
        class="ms-n3 me-0"
        @click="navigationDrawerModel.show()"
      />
    </v-col>

    <!-- App name -->
    <v-col cols="6" class="text-center text-home-app-bar" tabindex="-1">
      <h4 dir="ltr">
        {{vhApp.data.features.appName}}
      </h4>
    </v-col>

    <!-- App mini version -->
    <v-col cols="3" class="text-end">
      <v-chip
        tabindex="-1"
        size="small"
        density="compact"
        :color="isDebugDataHasValue ? 'version-on-home-debug' : 'disabled'"
        :variant="isDebugDataHasValue ? 'flat' : 'text'"
        :class="[isDebugDataHasValue ? 'px-2' : 'px-0']"
        @click="openDebugDialog()"
      >
        <span :class="{ 'text-white opacity-40': !isDebugDataHasValue }">
          {{ 'v' + vhApp.getAppVersion(false) }}
        </span>
      </v-chip>
    </v-col>

  </v-row>
</template>
