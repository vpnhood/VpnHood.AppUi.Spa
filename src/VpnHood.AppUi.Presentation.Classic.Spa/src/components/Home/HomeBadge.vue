<script setup lang="ts">
import { ComponentRouteController } from '@/services/ComponentRouteController';
import { ComponentName } from '@/helpers/UiConstants';
import { ref, computed } from 'vue';
import { getFeatureItems } from '@/components/Home/FeatureIcons';
import FeatureIconDisplay from '@/components/Home/FeatureIconDisplay.vue';

const badgeDialogModel = ref(new ComponentRouteController(ComponentName.BadgeDialog));

const featureItems = computed(() => getFeatureItems());
</script>

<template>
<div
  v-if="featureItems.find(x => x.isActive)"
  class="d-flex flex-column align-center"
  style="position: absolute; top: 15px; right: 10px; z-index: 999"
>
  <template v-for="(item, index) in featureItems" :key="index">
    <v-btn
      v-if="item.isActive"
      icon
      size="small"
      variant="text"
      color="white"
      class="opacity-60 pb-1" 
       :class="{ 'twoIcon': item.secondIcon }"
      tabindex="-1"
      @click="badgeDialogModel.show()"
    >
      <template v-slot:default>
        <FeatureIconDisplay :icon="item.icon" :second-icon="item.secondIcon" :class="{ 'twoIcon': item.secondIcon }" />
      </template>
    </v-btn>
  </template>
</div>
</template>

<style>
.twoIcon .v-btn__content{
  margin-left: -5px;
}
</style>
