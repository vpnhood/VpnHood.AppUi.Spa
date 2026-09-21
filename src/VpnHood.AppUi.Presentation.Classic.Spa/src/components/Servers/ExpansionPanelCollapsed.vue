<script setup lang="ts">
import { type ClientProfileInfo, ServerLocationItem } from '@/services/VpnHood.Client.Api';
import { Util } from '@/helpers/Util';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { UiConstants } from '@/helpers/UiConstants';

const vhApp = VpnHoodApp.instance;

const props = defineProps<{
  clientProfileInfo: ClientProfileInfo,
}>()

function isShowFlagOnCollapseState(serverLocationInfo: ServerLocationItem, index: number): boolean{
  return !serverLocationInfo.isNestedCountry
    && !vhApp.data.isLocationAutoSelected(serverLocationInfo.countryCode)
    && index <= UiConstants.locationNumberOnCollapsedProfile;
}
</script>

<template>
  <div class="d-flex align-center bg-expansion-panels-collapsed py-3 px-2 mx-4 text-start rounded-lg">

    <!-- Countries flag -->
    <template v-for="(serverLocationInfo, index) in props.clientProfileInfo.locationInfos">
      <span
        v-if="isShowFlagOnCollapseState(serverLocationInfo, index)"
        :key="index"
        class="rounded-circle overflow-hidden d-inline-flex align-center me-1 justify-center border"
        style="width: 25px; height: 25px;"
      >
        <!-- Auto select icon -->
        <v-icon
          v-if="vhApp.data.isLocationAutoSelected(serverLocationInfo.countryCode)"
          icon="mdi-earth"
          color="fastest-server"
          size="27"
        />

        <!-- Country flag -->
        <img
          v-else
          :src="vhApp.getCountryFlag(serverLocationInfo.countryCode)"
          height="100%"
          alt="country flag"
        />
      </span>
    </template>

    <!-- More countries number -->
    <span
      v-if="Util.calcLocationCount(clientProfileInfo) > UiConstants.locationNumberOnCollapsedProfile"
      class="text-body-small text-lowercase ps-3"
    >
      +{{ Util.calcLocationCount(clientProfileInfo) - UiConstants.locationNumberOnCollapsedProfile }}
    </span>
  </div>
</template>
