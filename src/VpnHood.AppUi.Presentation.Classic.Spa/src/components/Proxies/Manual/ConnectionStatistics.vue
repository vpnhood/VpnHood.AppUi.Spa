<script setup lang="ts">
import i18n from '@/locales/i18n';
import type { AppProxyConnectorStatus } from '@/services/VpnHood.Client.Api';

const locale = i18n.global.t;
const props = defineProps<{
  proxyStats: AppProxyConnectorStatus,
  totalProxyCount: number
}>();
</script>

<template>
  <config-card>
    <v-card-item>
      <!-- Card title -->
      <span>{{ locale('STATISTICS') }}</span>

      <!-- Statistics guide -->
      <div id="statisticsGuide" class="d-flex align-center justify-space-between mt-4">
        <div>
          <span class="bg-enable-premium"></span>
          <span>{{ locale('SUCCEEDED') }}</span>
        </div>
        <v-divider vertical class="opacity-20"></v-divider>
        <div>
          <span class="bg-error"></span>
          <span>{{ locale('FAILED') }}</span>
        </div>
        <v-divider vertical class="opacity-20"></v-divider>
        <div>
          <span class="bg-white opacity-40"></span>
          <span>{{ locale('DISABLED') }}</span>
        </div>
      </div>

      <!-- Recent connections -->
      <div class="d-flex align-center ga-2 my-4">
        <span class="text-body-small text-disabled text-no-wrap">{{locale('RECENT_CONNECTIONS')}}</span>
        <v-divider class="flex-grow-1 opacity-40" variant="dotted"></v-divider>
        <div class="d-flex align-center ga-2">
          <v-chip
            :text="props.proxyStats.sessionStatus.succeededCount"
            color="enable-premium"
            variant="tonal"
            density="comfortable"
            size="small"
          />
          <v-chip
            :text="props.proxyStats.sessionStatus.failedCount"
            color="error"
            variant="tonal"
            density="comfortable"
            size="small"
          />
        </div>
      </div>

      <!-- Servers -->
      <div class="d-flex align-center ga-2">
        <span class="text-body-small text-disabled text-no-wrap">{{locale('SERVERS')}} ({{props.totalProxyCount}})</span>
        <v-divider class="flex-grow-1 opacity-40" variant="dotted"></v-divider>
        <div class="d-flex align-center ga-2">
          <v-chip
            :text="props.proxyStats.succeededServerCount"
            color="enable-premium"
            variant="tonal"
            density="comfortable"
            size="small"
          />
          <v-chip
            :text="props.proxyStats.failedServerCount"
            color="error"
            variant="tonal"
            density="comfortable"
            size="small"
          />
          <v-chip
            :text="props.proxyStats.disabledServerCount"
            color="white"
            variant="tonal"
            density="comfortable"
            size="small"
            class="text-disabled"
          />
        </div>
      </div>
      <v-divider class="mt-4 mb-2"/>
      <p class="text-body-small text-disabled">{{locale("PROXY_LEARNING_MSG")}}</p>

    </v-card-item>
  </config-card>
</template>

<style scoped>
/*noinspection ALL*/
#statisticsGuide>div{
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-background), var(--v-disabled-opacity));
}
#statisticsGuide>div>span:first-child{
  display: inline-block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
}
</style>
