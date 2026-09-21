<script setup lang="ts">
import { AppProxyEndPointInfo } from '@/services/VpnHood.Client.Api';
import ProxyListItem from '@/components/Proxies/ProxyListItem.vue';
import { onMounted, ref } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const deviceProxy = ref<AppProxyEndPointInfo | null>(null);
const isLoading = ref(false);

onMounted(async () => {
  isLoading.value = true;
  try {
    deviceProxy.value = await vhApp.proxyEndPointClient.getDevice();
  }
  finally {
    isLoading.value = false;
  }
});

</script>

<template>
  <config-card :loading="isLoading">

    <v-list v-if="deviceProxy" lines="two" bg-color="transparent">
      <proxy-list-item :proxy="deviceProxy" />
    </v-list>

    <v-card-text v-else-if="!isLoading" class="text-disabled">
      {{ locale('NO_SYSTEM_PROXY') }}
    </v-card-text>

  </config-card>
</template>
