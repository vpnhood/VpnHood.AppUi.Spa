<script setup lang="ts">
import { computed } from 'vue';
import i18n from '@/locales/i18n';
import { AppProxyEndPointInfo } from '@/services/VpnHood.Client.Api';
import { getStatusQualityDisplay } from '@/components/Proxies/ProxyUtils';
import { Util } from '@/helpers/Util';

const locale = i18n.global.t;

const props = defineProps<{
    proxy: AppProxyEndPointInfo;
}>();

const title = computed(() => {
    const node = props.proxy.endPoint;
    const parts: string[] = [`${node.host}:${node.port}`];
    if (node.username)
        parts.push(node.username);
    return parts.join(' · ');
});

const statusQuality = computed(() => {
    return getStatusQualityDisplay(props.proxy.status?.quality);
});

const hasError = computed(() => {
    return props.proxy.status?.errorMessage != null;
});

const errorMessage = computed(() => {
    return props.proxy.status?.errorMessage || '';
});
</script>

<template>
    <v-list-item>
      <template v-slot:title>
        <div class="d-flex align-center justify-space-between ga-2">
          <div class="text-truncate">

            <!-- Protocol -->
            <v-chip
              :text="props.proxy.endPoint.protocol"
              size="small"
              variant="tonal"
              density="comfortable"
              color="white"
              label
              class="me-2"
            />

            <!-- Host and port -->
            <span>{{title}}</span>

          </div>

          <!-- On/Off state -->
          <v-chip
            :text="proxy.endPoint.isEnabled ? locale('ON') : locale('OFF')"
            size="small"
            variant="tonal"
            density="compact"
            :disabled="!proxy.endPoint.isEnabled"
            :color="proxy.endPoint.isEnabled ? 'enable-premium' : ''"
          />

        </div>
      </template>

      <template v-slot:subtitle>

        <div class="d-flex align-center justify-space-between text-body-small mt-3">
          <div id="proxyItemSubtitle" class="d-flex align-center ga-3 text-body-small">

            <!-- Succeeded connections -->
            <div>
              <v-icon
                icon="mdi-check-circle"
                size="14px"
                :color="props.proxy.status.succeededCount > 0 ? 'enable-premium' : 'disabled'"
              />
              <span>{{props.proxy.status.succeededCount}}</span>
            </div>

            <v-divider vertical class="opacity-20"></v-divider>

            <!-- Failed connections -->
            <div>
              <v-icon
                icon="mdi-close-circle"
                size="14px"
                :color="props.proxy.status.failedCount > 0 ? 'error' : 'disabled'"
              />
              <span>{{props.proxy.status.failedCount}}</span>
            </div>

            <v-divider vertical class="opacity-20"></v-divider>

            <!-- Quality -->
            <span v-if="proxy.status?.quality" :class="`text-${statusQuality.color}`">{{statusQuality.text}}</span>

          </div>

          <!-- Chevron icon -->
          <v-icon color="disabled" :icon="Util.getLocalizedRightChevron()"/>

        </div>

        <!-- Error message -->
        <p v-if="hasError" class="text-body-small text-disabled opacity-60 mt-2">{{ errorMessage }}</p>

      </template>
    </v-list-item>
</template>

<style scoped>
/*noinspection ALL*/
#proxyItemSubtitle>div{
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(var(--v-theme-on-background), var(--v-disabled-opacity));
}
</style>
