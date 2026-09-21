<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';

const vhApp = VpnHoodApp.instance;

const props = defineProps<{
  countryCode: string | null | undefined,
}>();
</script>

<template>
<span
  style="width: 23px; height: 15px; border-radius: 3px"
  class="overflow-hidden d-inline-flex align-center justify-center ms-1"
>
  <img :src="vhApp.getCountryFlag(props.countryCode)" height="100%" alt="country flag" />
</span>
</template>
