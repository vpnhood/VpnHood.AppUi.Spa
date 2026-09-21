<script setup lang="ts">
import i18n from '@/locales/i18n';
import router from '@/services/router';

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
    <v-card color="active">

      <v-card-title class="text-center pt-4">
        <v-icon class="text-display-medium">mdi-party-popper</v-icon>
        <h2>{{ locale('CONGRATULATIONS') }}</h2>
      </v-card-title>

      <v-card-text>{{ locale('PURCHASE_AND_PROCESS_IS_COMPLETE_MESSAGE') }}</v-card-text>

      <v-card-actions>
        <v-btn
          :text="locale('CLOSE')"
          variant="plain"
          @click="router.replace({ name: 'HOME' })"
        />
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>
