<script setup lang="ts">
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';


</script>

<template>
  <feature-page-layout
    title="PRIVATE_DNS_COLORED"
    description="PRIVATE_DNS_DIALOG_MSG"
    image="private-dns.webp"
    :is-premium="false"
    :is-action-button-available="false"
  />
</template>
