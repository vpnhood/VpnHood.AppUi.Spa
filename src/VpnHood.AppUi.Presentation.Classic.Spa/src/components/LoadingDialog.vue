<script setup lang="ts">
import i18n from '@/locales/i18n';

const locale = i18n.global.t;
const props = defineProps<{
  modelValue: boolean
}>();
</script>

<template>
  <v-dialog :modelValue="props.modelValue" :persistent="true" max-width="320">
    <v-card rounded="lg" color="general-dialog">
      <v-card-text class="text-center">
        <v-progress-circular class="mb-2" :indeterminate="true" size="30" width="2"/>
        <p>{{locale("PLEASE_WAIT")}}</p>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
