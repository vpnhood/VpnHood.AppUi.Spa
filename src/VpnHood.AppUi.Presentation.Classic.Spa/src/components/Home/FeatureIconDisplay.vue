<script setup lang="ts">
defineProps<{
  icon: string;
  secondIcon?: string;
}>();
</script>

<template>
  <div class="position-relative feature-icon-display">
    <v-icon :icon="icon" />
    <v-icon
      v-if="secondIcon"
      :icon="secondIcon"
      size="14"
      class="position-absolute"
      style="top: 13px; right: -2px;"
    />
  </div>
</template>

<style scoped>
.feature-icon-display {
  width: 28px;
}
</style>

