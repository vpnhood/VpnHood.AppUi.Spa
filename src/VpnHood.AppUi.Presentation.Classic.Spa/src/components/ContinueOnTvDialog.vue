<script setup lang="ts">
import i18n from '@/locales/i18n';

// Shown in a browser that manages a TV while a step whose UI is on the TV runs there - the store's
// sign-in, its payment sheet, its restore, the review prompt (VpnHoodApp.withContinueOnTv). No
// button: the step ends on the TV, by finishing or by being cancelled there, and the call this
// browser is waiting on returns either way, which is what closes this.
const locale = i18n.global.t;
const props = defineProps<{
  modelValue: boolean
}>();
</script>

<template>
  <v-dialog :modelValue="props.modelValue" :persistent="true" max-width="360">
    <v-card rounded="lg" color="general-dialog" class="text-general-dialog-text">
      <v-card-text class="text-center">
        <v-icon icon="mdi-television-play" size="48" class="mb-3"/>
        <p class="text-title-medium mb-2">{{ locale('CONTINUE_ON_TV_TITLE') }}</p>
        <p class="text-body-medium">{{ locale('CONTINUE_ON_TV_DESC') }}</p>
        <v-progress-circular class="mt-4" :indeterminate="true" size="24" width="2"/>
      </v-card-text>
    </v-card>
  </v-dialog>
</template>
