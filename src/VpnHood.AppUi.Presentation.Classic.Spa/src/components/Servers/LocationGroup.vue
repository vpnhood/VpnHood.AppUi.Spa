<script setup lang="ts">
import LocationListItem from '@/components/Servers/LocationListItem.vue';
import type { ServerLocationItem } from '@/services/VpnHood.Client.Api';
import { VpnHoodApp } from '@/services/VpnHoodApp';

const vhApp = VpnHoodApp.instance;
const componentProps = defineProps<{
  listType: string,
  groupTitle: string,
  clientProfileId: string,
  locationList: ServerLocationItem[],
  isPremiumLocationSelected: boolean
}>();
</script>

<template>
    <config-card :color="vhApp.isSingleProfileMode() ? 'config-card-on-expansion-panel' : 'expansion-panels-collapsed'">
        <v-list-group :value="componentProps.listType">

          <!-- Group title -->
          <template v-slot:activator="{ props }">
            <v-list-item
              v-bind="props"
              class="server-item-group text-body-small"
              base-color="disabled"
            >
              <div class="d-flex align-center ga-3">
                <span>{{ componentProps.groupTitle }}</span>
                <span class="flex-grow-1 border-b border-opacity-25"></span>
              </div>
            </v-list-item>
          </template>

          <!-- Group items -->
          <LocationListItem
            :client-profile-id="componentProps.clientProfileId"
            :locations-list="componentProps.locationList"
            :is-premium-group="componentProps.listType === 'premium'"
            :is-premium-location-selected="componentProps.isPremiumLocationSelected"
          />
        </v-list-group>
    </config-card>
</template>
