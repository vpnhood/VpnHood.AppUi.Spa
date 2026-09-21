<script setup lang="ts">
import { ClientProfileInfo } from '@/services/VpnHood.Client.Api';
import { VpnHoodApp } from '@/services/VpnHoodApp'
import LocationListItem from '@/components/Servers/LocationListItem.vue'
import i18n from '@/locales/i18n'
import { ref } from 'vue';
import LocationGroup from '@/components/Servers/LocationGroup.vue';

enum locationListType{
  Free = "free",
  Premium = "premium"
}

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  clientProfile: ClientProfileInfo
}>();

// Locations groups
const freeLocations = props.clientProfile.locationInfos.filter(x => x.options.hasFree);
const premiumLocations = props.clientProfile.locationInfos.filter(x => x.options.hasPremium);

// Group open state
const openedListGroupsModel = ref<string[]>([locationListType.Free, locationListType.Premium]);

function isListHasGroup(): boolean{
  if (freeLocations.length === 0)
    return false;
  return premiumLocations.length > 0;
}

function isShowLocationGroups(): boolean{
  if (!isListHasGroup())
    return false;
  return !vhApp.data.isPremiumSupported || !vhApp.data.isPremiumUser
}
</script>

<template>

  <v-list
    v-model:opened="openedListGroupsModel"
    open-strategy="multiple"
    bg-color="transparent"
    :class="{'px-4 pb-2': isShowLocationGroups() && !vhApp.isSingleProfileMode()}"
  >
    <!-- Categorised locations -->
    <template v-if="isShowLocationGroups()">

      <!-- Free locations group -->
      <location-group
        :list-type="locationListType.Free"
        :group-title="locale('FREE_LOCATIONS')"
        :client-profile-id="props.clientProfile.clientProfileId"
        :location-list="freeLocations"
        :is-premium-location-selected="props.clientProfile.isPremiumLocationSelected ?? false"
      />

      <!-- Premium locations group -->
      <location-group
        :list-type="locationListType.Premium"
        :group-title="locale('PREMIUM_LOCATIONS')"
        :client-profile-id="props.clientProfile.clientProfileId"
        :location-list="premiumLocations"
        :is-premium-location-selected="props.clientProfile.isPremiumLocationSelected ?? false"
      />

    </template>

    <!-- Only the Premium locations must be shown -->
    <config-card
      v-else-if="isListHasGroup() && !isShowLocationGroups()"
      color="config-card-on-expansion-panel"
    >
      <LocationListItem
       :client-profile-id="props.clientProfile.clientProfileId"
       :locations-list="premiumLocations"
       :is-premium-group="premiumLocations.length > 0"
       :is-premium-location-selected="props.clientProfile.isPremiumLocationSelected ?? false"
      />
    </config-card>


    <!-- The locations does not have groups -->
    <LocationListItem v-else
      :client-profile-id="props.clientProfile.clientProfileId"
      :locations-list="props.clientProfile.locationInfos"
      :is-premium-group="premiumLocations.length > 0"
      :is-premium-location-selected="props.clientProfile.isPremiumLocationSelected ?? false"
    />


  </v-list>

</template>

<!--suppress CssUnusedSymbol -->
<style>
.server-item-group>.v-list-item__overlay{display: none;}
.server-item-group .v-list-item__append > .v-icon ~ .v-list-item__spacer{
  width: 10px;
}
</style>
