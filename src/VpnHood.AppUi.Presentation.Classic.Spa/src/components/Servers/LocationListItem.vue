<script setup lang="ts">
import { Util } from '@/helpers/Util'
import { ServerLocationItem } from '@/services/VpnHood.Client.Api';
import { VpnHoodApp } from '@/services/VpnHoodApp'
import i18n from '@/locales/i18n'
import { ConnectManager } from '@/helpers/ConnectManager';
import PremiumIcon from '@/components/PremiumIcon.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  vpnProfileId: string,
  locationsList: ServerLocationItem[],
  isPremiumGroup: boolean,
  isPremiumLocationSelected: boolean,
}>();

function internalConnect(location: ServerLocationItem): void {
  if (!vhApp.isSingleProfileMode() && Util.isSingleLocation(props.locationsList.length))
    return;

  // User is currently connected to the selected location
  if (vhApp.data.isConnected && isActiveItem(location)){
    vhApp.showGeneralSnackbar(i18n.global.t('ALREADY_CONNECTED_TO_LOCATION'), "active");
    return;
  }

  ConnectManager.connectWithLocation({vpnProfileId: props.vpnProfileId, serverLocation: location.serverLocation, isPremiumLocation: props.isPremiumGroup, isDiagnose: false});
}
function isActiveItem(location: ServerLocationItem): boolean{
  // This situation happened in the Client app
  if (!vhApp.isActiveVpnProfile(props.vpnProfileId))
    return false;

  const serverLocation = vhApp.data.state.vpnProfile?.selectedLocationInfo?.serverLocation;

  // Check premium items
  if (props.isPremiumLocationSelected){
    return (location.serverLocation === serverLocation && props.isPremiumGroup) ??
      (location.isDefault && props.isPremiumGroup);
  }

  // Check free items
  return (location.serverLocation === serverLocation && !props.isPremiumGroup) ??
    (location.isDefault && !props.isPremiumGroup );
}
function listItemClass(index: number): string{
  const defaultClass = "location-item";
  if (Util.isSingleLocation(props.locationsList.length))
    return defaultClass + " mx-4 rounded-lg bg-expansion-panels-collapsed";
  return index !== (props.locationsList.length - 1) ? defaultClass + " border-b" : defaultClass;
}
</script>

<template>
  <v-list-item
    v-for="(location, index) in props.locationsList"
    :key="index"
    tabindex="0"
    :value="isPremiumGroup ? `premium_${location.serverLocation}` : `free_${location.serverLocation}`"
    :class="listItemClass(index)"
    :active="isActiveItem(location)"
    color="active-server"
    @click="internalConnect(location)"
  >

    <v-list-item-title
      class="d-flex align-center justify-space-between text-label-large"
      :class="{'ps-4': location.isNestedCountry}"
    >

      <!------------------------------- Location flag ------------------------------->
        <!---- Fastest icon ---->
        <v-icon
          v-if="vhApp.data.isLocationAutoSelected(location.countryCode)"
          icon="mdi-lightning-bolt-outline"
          size="31"
          :color="!isActiveItem(location) ? 'fastest-server' : ''"
        />

        <!-- Country flag -->
        <span v-else
          class="overflow-hidden d-inline-flex align-center justify-center item-flag me-2"
          :class="{'nested-item': location.isNestedCountry}"
        >
          <img :src="vhApp.getCountryFlag(location.countryCode)" height="100%" alt="country flag"/>
        </span>
      <!---------------------------- End of location flag ---------------------------->

      <!------------------------------- Location name -------------------------------->
        <div :class="[{'text-body-small': location.isNestedCountry},'text-truncate flex-1-1-0']">

          <!---- Fastest name ---->
          <template v-if="vhApp.data.isLocationAutoSelected(location.countryCode)" >
            <span>{{ locale('FASTEST') }}</span>
            <span class="flasher text-disabled text-body-small ms-1">({{ locale('RECOMMENDED') }})</span>
          </template>

          <!---- Country name ---->
          <span v-else >
            {{ location.isNestedCountry ? location.regionName : location.translatedCountryName }}
          </span>

        </div>
      <!------------------------------ End of location name ---------------------------->

      <!------------------------------- Location status -------------------------------->
      <div class="d-flex align-center text-no-wrap ga-1">

        <!---- Active location badge ---->
        <v-chip v-if="isActiveItem(location)"
                color="active-server-chip"
                variant="flat"
                :text="locale('ACTIVE')"
                size="x-small"
                tabindex="-1"
        />

        <!---- Unblockable location icon: a property of the LOCATION, so it marks one in any build ---->
        <v-icon v-if="location.options.hasUnblockable && isPremiumGroup"
                icon="mdi-sword-cross"
                size="16"
                :color="vhApp.data.premiumIconColor" />

        <!---- Premium location icon ---->
        <premium-icon :is-premium="props.isPremiumGroup"/>

      </div>
      <!---------------------------- End of location status ---------------------------->

    </v-list-item-title>
  </v-list-item>
</template>

<!--suppress CssUnusedSymbol -->
<style scoped>
.item-flag {
  width: 24px;
  height: 16px;
  border-radius: 2px;
}
.item-flag.nested-item {
  width: 22px;
  height: 14px;
}
</style>
<!--suppress CssUnusedSymbol -->
<style>
.v-list-group__items .v-list-item.location-item {
  padding-inline-start: 16px !important;
}
</style>
