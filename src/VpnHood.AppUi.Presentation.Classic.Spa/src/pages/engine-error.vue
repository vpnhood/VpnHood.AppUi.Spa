<script setup lang="ts">
import EngineErrorCard from '@/components/EngineErrorCard.vue';

// TODO: Improve page
</script>

<template>
  <v-sheet
    color="rgba(0, 0, 0, 0.66)"
    class="d-flex flex-column align-center justify-center text-center"
    style="height: 100vh!important;"
  >
    <engine-error-card :show-reload-button="true" />
  </v-sheet>
</template>
