<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { AppFeature } from '@/services/VpnHood.Client.Api';
import { computed } from 'vue';

const vhApp = VpnHoodApp.instance;

const props = defineProps<{
  isPremium: AppFeature | boolean
}>();

// The crown marks something this session does not have yet. Two callers, and the build's premium
// tier answers only for one of them: a FEATURE is premium only where a tier sells it
// (isPremiumFeature is false throughout a build with none), while a premium LOCATION stays premium
// in any build — a tier-less build can still hand one out for a trial or a rewarded ad, and the
// crown is what says the location needs that.
const shouldShowIcon = computed(() =>
  !vhApp.data.isPremiumUser &&
  (typeof props.isPremium === 'boolean'
    ? props.isPremium
    : vhApp.data.isPremiumFeature(props.isPremium))
);


</script>

<template>
  <v-icon
    v-if="shouldShowIcon"
    :color="vhApp.data.premiumIconColor"
    icon="mdi-crown"
    size="18"
  />
</template>
