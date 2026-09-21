<script setup lang="ts">
const props = defineProps< {
  title: string,
  // false when every row of the section is hidden on this platform; a heading with nothing under it
  // is a stray divider, so the title is gated on the same conditions its rows are
  isShow: boolean,
}>();
</script>

<template>
  <div v-if="props.isShow" class="settings-section-title d-flex align-center mb-3">
    <span class="flex-shrink-0 me-2 text-body-small text-disabled">{{props.title}}</span>
    <v-divider color="disabled" opacity=".2" class="flex-grow-1"></v-divider>
  </div>
</template>

<style>
/*noinspection CssUnusedSymbol*/
.v-card + .settings-section-title{
  margin-top: 30px;
}
</style>
