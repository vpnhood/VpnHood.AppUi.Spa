<script setup lang="ts">
import { Util } from '@/helpers/Util';
import { UiConstants } from '@/helpers/UiConstants';

const props = defineProps<{
  image: string,
  description?: string ,
}>();
</script>

<template>
  <v-img
    :src="Util.getAssetPath(props.image)"
    alt="Symbol image"
    width="100%"
    max-height="130px"
    class="mx-auto"
    :aspect-ratio="UiConstants.featureImageAspectRatio"
    :eager="true"
  />
  <p class="mt-2 mb-5 text-disabled text-body-small px-3">{{ props.description }}</p>
</template>
