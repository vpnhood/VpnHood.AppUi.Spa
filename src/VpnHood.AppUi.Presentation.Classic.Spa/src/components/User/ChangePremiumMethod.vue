<script setup lang="ts">
const props = defineProps<{
  title: string;
  description: string;
  buttonName: string;
}>();

const emit = defineEmits<{
  (e: 'buttonClick'): void;
}>();
</script>

<template>
  <config-card>
    <v-card-title class="text-wrap">{{props.title}}</v-card-title>
    <v-card-text class="text-disabled">{{props.description}}</v-card-text>
    <v-card-actions>
      <btn-style-1
        :text="props.buttonName"
        class="ms-auto"
        size="small"
        @click="emit('buttonClick')"
      />
    </v-card-actions>
  </config-card>
</template>
