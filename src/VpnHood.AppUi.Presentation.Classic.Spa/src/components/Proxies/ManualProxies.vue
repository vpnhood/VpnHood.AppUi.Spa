<script setup lang="ts">
import AddByUrl from '@/components/Proxies/Manual/AddByUrl.vue';
import ConnectionStatistics from '@/components/Proxies/Manual/ConnectionStatistics.vue';
import { computed, onMounted, ref } from 'vue';
import { AppProxyEndPointInfo } from '@/services/VpnHood.Client.Api';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import SavedProxies from '@/components/Proxies/Manual/SavedProxies.vue';

const vhApp = VpnHoodApp.instance;

const proxies = ref<AppProxyEndPointInfo[]>([]);
const isLoading = ref<boolean>(false);
const proxyStats = computed(() => vhApp.data.state.proxyConnectorStatus);
const totalProxyCount = ref(0);
const latestRecordIndex = ref(0);
const latestRecordCount = ref(10);


async function loadProxies(
  recordIndex = latestRecordIndex.value,
  recordCount = latestRecordCount.value,
  includeSucceeded = true,
  includeFailed = true,
  includeUnknown = true,
  includeDisabled = true,
  showLoading = true
): Promise<void> {
  try {
    latestRecordIndex.value = recordIndex;
    latestRecordCount.value = recordCount;

    if (!isLoading.value) isLoading.value = showLoading;

    const list = await vhApp.proxyEndPointClient.list(
      undefined,
      includeSucceeded,
      includeFailed,
      includeUnknown,
      includeDisabled,
      recordIndex,
      recordCount
    );

    proxies.value = list.items;
    totalProxyCount.value = list.totalCount;
  }
  finally {
    isLoading.value = false;
  }
}

onMounted(async () => {
  await loadProxies(0, 10);
});
</script>

<template>
  <add-by-url @load-proxies="loadProxies" />

  <!-- Proxies Statistics -->
  <connection-statistics
    v-if="proxies.length > 5 && proxyStats"
    :proxy-stats="proxyStats"
    :total-proxy-count="totalProxyCount"
  />

  <saved-proxies
    :is-loading="isLoading"
    :proxies="proxies"
    :total-proxy-count="totalProxyCount"
    @load-proxies="loadProxies"
  />

</template>
