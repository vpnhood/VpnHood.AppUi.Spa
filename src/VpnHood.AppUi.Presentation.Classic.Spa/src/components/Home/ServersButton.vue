<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import CountryFlagWrapper from '@/components/CountryFlagWrapper.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

function getActiveServerNameOrLocation(): string {
  // Show profile if the App is not single server mode
  if (!vhApp.isSingleProfileMode())
    return (vhApp.data.state.clientProfile?.clientProfileName ?? i18n.global.t('NO_SERVER_SELECTED'));

  // show user selected location
  const serverLocationInfo = vhApp.data.state.serverLocationInfo;
  if (!serverLocationInfo)
    return i18n.global.t('NO_LOCATION_SELECTED');

  if (serverLocationInfo.isAuto)
    return i18n.global.t('AUTO_SELECT');

  const text = serverLocationInfo.hasRegion && serverLocationInfo.hasMultipleRegions
    ? serverLocationInfo.translatedCountryName + ' (' + serverLocationInfo.regionName + ')'
    : serverLocationInfo.translatedCountryName;

  return text.replace('United States (', 'USA (');
}

function buttonClickHandler() {
    // This is a special case that should not happen
    if (!vhApp.data.features.isAddAccessKeySupported && vhApp.data.clientProfileInfos.length== 0) {
      vhApp.showErrorMessage(locale('NO_CLIENT_PROFILE_AVAILABLE'));
      return;
    }

    // The server does not have a list, and only one country is available
    if (!vhApp.data.features.isAddAccessKeySupported &&
      vhApp.data.clientProfileInfos.length == 1 &&
      vhApp.data.clientProfileInfos[0].locationInfos.length < 2) {
      vhApp.showErrorMessage(locale('NO_ADDITIONAL_LOCATION_AVAILABLE'));
      return;
    }

    router.push({ name: 'SERVERS' });
}
</script>

<template>
  <home-config-btn id="serverButton" prepend-icon="mdi-earth" tabindex="5" class="align-center mb-1"
    @click="buttonClickHandler()">
    <span class="config-btn-title" tabindex="-1">
      {{ vhApp.isSingleProfileMode() ? locale('LOCATION') : locale('SERVER') }}
    </span>
    <v-icon :icon="Util.getLocalizedRightChevron()" />
    <span
      class="config-btn-value text-white text-capitalize text-body-small text-truncate limited-width-to-truncate opacity-50">
      {{ getActiveServerNameOrLocation() }}
    </span>

    <template v-slot:append>
      <!-- Country flag -->
      <country-flag-wrapper v-if="vhApp.data.state.serverLocationInfo?.isAuto === false"
        :country-code="vhApp.data.state.serverLocationInfo?.countryCode" />

      <!-- Auto server -->
      <v-chip v-else :text="locale('AUTO')" color="white" variant="tonal" size="small" density="compact"
        class="text-capitalize opacity-50 px-2" tabindex="-1" />
    </template>

  </home-config-btn>
</template>
