<script setup lang="ts">
import i18n from '@/locales/i18n';

const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean,
}>();

</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    :persistent="true"
  >
    <v-card color="general-dialog">
      <v-card-text class="text-general-dialog-text text-body-medium">
        {{ locale('WAITING_TO_COMPLETE_ORDER_PROCESS') }}
        <v-progress-linear :indeterminate="true" height="2" rounded="true" class="my-3" />
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
