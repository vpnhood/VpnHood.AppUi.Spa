<script setup lang="ts">
import type { MyConnectPlanId } from '@/helpers/PromotePremium/MyConnectPlanIds';

const props = defineProps<{
  icon: string,
  title: string,
  description: string,
  buttonText: string,
  buttonActionPlan: MyConnectPlanId,
}>();
const emits = defineEmits<{
  (e: 'actionByPlan', planId: MyConnectPlanId): void;
}>();
</script>

<template>
  <v-row
    dense
    v-ripple
    align="center"
    class="px-2 py-1 mx-0 mb-3 rounded-lg card-on-grad-bg"
    @click="emits('actionByPlan', props.buttonActionPlan)"
  >
    <v-col>
      <div class="d-flex align-center">
        <v-icon :icon="props.icon" color="promote-premium-color-premium" size="25" class="me-2" />
        <h4 class="text-capitalize">{{props.title}}</h4>
      </div>
      <p class="text-white opacity-40 text-body-small">{{ props.description }}</p>
    </v-col>
    <v-col cols="auto" class="action-btn pe-0">
      <v-chip
        variant="flat"
        color="promote-premium-color-premium"
        class="font-weight-bold"
        :text="props.buttonText"
        size="small"
        tabindex="-1"
      />
    </v-col>
  </v-row>

</template>

<style scoped>
@media (max-width: 319px) {
  .action-btn{
    width: 100% !important;
    text-align: right;
    padding-left: 4px !important;
    padding-right: 4px !important;
  }
  .v-locale--is-rtl .action-btn{
    text-align: left;
  }
}
</style>
