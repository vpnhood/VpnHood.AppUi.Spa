<script setup lang="ts">
import { SplitAppMode } from '@/services/VpnHood.Client.Api';
import {UiConstants} from "@/helpers/UiConstants";
import { Util } from '@/helpers/Util';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed, onMounted, ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import FilterList, { type IListItemInfo } from '@/components/Settings/FilterList.vue';
import { onBeforeRouteLeave } from 'vue-router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const appList = ref<IListItemInfo[]>([]);
const splitMode = computed<SplitAppMode>({
  get: () => vhApp.data.userSettings.splitTunneling.appMode,
  set: async (value: SplitAppMode) => vhApp.data.userSettings.splitTunneling.appMode = value
});
const selectedApps = computed<string[]>({
  get: () => vhApp.data.userSettings.splitTunneling.apps,
  set: async (apps: string[]) => vhApp.data.userSettings.splitTunneling.apps = apps
});
const isSaveRejected = computed(() => splitMode.value === SplitAppMode.Include && selectedApps.value.length == 0);

onMounted(async () => {
  if (vhApp.data.features.isExcludeAppsSupported || vhApp.data.features.isIncludeAppsSupported) {
    const installedApps = await vhApp.getInstalledApps();

    // Add isSelected to all app items
    appList.value = installedApps.map(app => ({
      id: app.appId,
      name: app.appName,
      icon: 'data:image/png;base64, ' + app.iconPng,
      isSelected: (splitMode.value === SplitAppMode.All)
        || (splitMode.value === SplitAppMode.Include && selectedApps.value.some(x => x === app.appId))
        || (splitMode.value === SplitAppMode.Exclude && selectedApps.value.every(x => x !== app.appId))
    }));

    const futureInstalledAppInfo: IListItemInfo = {
      id: "$",
      name: locale('ALL_FUTURE_APPS'),
      icon: Util.getAssetPath(`future-apps-${vhApp.data.features.uiTheme}.png`),
      isSelected: splitMode.value === SplitAppMode.All || splitMode.value === SplitAppMode.Exclude
    };
    appList.value.push(futureInstalledAppInfo);
    sortApps(appList.value);
  }
})

function sortApps(installedApps: IListItemInfo[]) {
  const isFutureAppSelected = appList.value.some(x => x.id === "$" && x.isSelected);
  installedApps.sort((a, b) => {
    // The first condition displays first the enabled apps
    // Second condition displays first the disabled apps
    if (a.isSelected !== b.isSelected) return isFutureAppSelected
      ? Number(a.isSelected) - Number(b.isSelected)
      : Number(b.isSelected) - Number(a.isSelected);
    // Display first the "All Future Apps" option
    if (a.id === "$") return -1;
    if (b.id === "$") return +1;
    // Alphabetic sort
    return a.name.localeCompare(b.name);
  });
}

async function handleListUpdate(newList: IListItemInfo[]){
  appList.value = newList;

  // All apps
  const isAllSelectedApp = newList.every(x => x.isSelected);
  if (isAllSelectedApp) {
    splitMode.value = SplitAppMode.All;
    selectedApps.value = [];
    await vhApp.saveUserSetting();
    return;
  }

  // All apps except selected
  const isFutureAppSelected = newList.some(x => x.id === "$" && x.isSelected);
  if (isFutureAppSelected) {
    splitMode.value = SplitAppMode.Exclude;
    selectedApps.value = newList
      .filter(x => !x.isSelected && x.id !== "$")
      .map(x => x.id);
    await vhApp.saveUserSetting();
    return;
  }

  // Only selected apps
  splitMode.value = SplitAppMode.Include;
  selectedApps.value = newList
    .filter(x => x.isSelected && x.id !== "$")
    .map(x => x.id);

  if (!isSaveRejected.value)
    await vhApp.saveUserSetting();
}

// Returning false cancels the navigation; returning nothing allows it (vue-router 5 guard style).
onBeforeRouteLeave(async () => {
  // Show error when the user excluded all apps
  if (isSaveRejected.value) {
    await vhApp.processError(locale("ALL_APPS_EXCLUDED_ERROR_MSG"));
    return false;
  }

  await vhApp.saveUserSetting();
});
</script>

<template>
  <v-sheet>
    <app-bar/>

    <!-- Feature description -->
    <p class="text-disabled text-body-small mb-4">{{locale("SPLIT_APPS_DESC")}}</p>

      <!-- Apps list -->
      <filter-list
        :list="appList"
        :loading="appList.length < 1"
        icon-size="30"
        @update:list="handleListUpdate"
      />
  </v-sheet>
</template>
