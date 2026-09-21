<script setup lang="ts">
import { Util } from '@/helpers/Util';
</script>

<template>
  <div class="text-center">
    <v-img
      :eager="true"
      :src="Util.getAssetPath('you-are-premium.webp')"
      alt="Premium Image"
      width="100%"
      max-width="371px"
    />
  </div>
</template>
