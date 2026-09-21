<script setup lang="ts">
import EngineErrorCard from '@/components/EngineErrorCard.vue';

defineProps<{
  modelValue: boolean,
}>();
</script>

<template>
  <v-dialog
    color="rgba(0, 0, 0, 0.66)"
    :modelValue="modelValue"
    :persistent="true"
    class="d-flex flex-column align-center justify-center text-center"
    style="height: 100vh !important;"
  >
    <engine-error-card />
  </v-dialog>
</template>
