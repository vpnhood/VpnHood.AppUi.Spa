<script setup lang="ts">
import i18n from '@/locales/i18n';
import type { RouteLocationRaw } from 'vue-router';
import router from '@/services/router';

const locale = i18n.global.t;

const props = defineProps<{
  action: RouteLocationRaw,
}>();
</script>

<template>
<v-row class="text-learn-more mt-3" align="center" dense @click="router.replace(props.action)">
  <v-col cols="auto">
    <v-icon icon="mdi-book-open-page-variant-outline" />
  </v-col>
  <v-col cols="col">
    <span class="text-decoration-underline">{{locale('LEARN_MORE_ABOUT_THIS_ISSUE')}}</span>
  </v-col>
</v-row>
</template>
