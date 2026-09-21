<script setup lang="ts">
import { computed } from 'vue';
import i18n from '@/locales/i18n';
import type { ProxyEndPointStatus } from '@/services/VpnHood.Client.Api';
import { getStatusQualityDisplay } from '../ProxyUtils';
import { Util } from '@/helpers/Util';
import { Validators } from '@/helpers/Validators';

const locale = i18n.global.t;

const props = defineProps<{
    status: ProxyEndPointStatus | null;
}>();

const statusQuality = computed(() => {
    if (!props.status) return { text: '-', color: '' };
    return getStatusQualityDisplay(props.status.quality);
});

const formattedLatency = computed(() => {
    return Util.formatLatency(props.status?.latency);
});

const formattedLastSucceeded = computed(() => {
    return Util.getRelativeTime(props.status?.lastSucceeded);
});

const formattedLastFailed = computed(() => {
    return Util.getRelativeTime(props.status?.lastFailed);
});

const statusItems = [
  {
    title: locale('PROXY_STATUS_QUALITY'),
    value: statusQuality.value.text,
    valueColor: statusQuality.value.color,
    isShow: true
  },
  {
    title: locale('PROXY_STATUS_PENALTY'),
    value: props.status?.penalty ?? 0,
    valueColor: 'disabled',
    isShow: true
  },
  {
    title: locale('PROXY_STATUS_LATENCY'),
    value: formattedLatency.value ?? 0,
    valueColor: 'disabled',
    isShow: true
  },
  {
    title: locale('PROXY_STATUS_LAST_SUCCEEDED'),
    value: formattedLastSucceeded.value ?? '--',
    valueColor: 'disabled',
    isShow: true
  },
  {
    title: locale('PROXY_STATUS_LAST_FAILED'),
    value: formattedLastFailed.value,
    valueColor: 'disabled',
    isShow: formattedLastFailed.value !== '-'
  },
  {
    title: locale('ERROR'),
    value: props.status?.errorMessage,
    valueColor: 'error',
    isShow: !Validators.isNullOrUndefined(props.status?.errorMessage)
  }
]
</script>

<template>
    <p v-if="!status" class="text-center text-disabled py-8">{{ locale('NO_DATA') }}</p>

    <v-list id="statusList" v-else lines="one" density="compact">
      <template
        v-for="(item, index) in statusItems"
        :key="index"
      >
        <v-list-item
          v-if="item.isShow"
          min-height="36px"
          class="pa-0"
        >
            <v-list-item-title class="text-body-small text-disabled">
              {{ item.title }}
            </v-list-item-title>
          <template v-slot:append>
            <span :class="['text-body-small',`text-${item.valueColor}`]">{{item.value}}</span>
          </template>
        </v-list-item>
      </template>
    </v-list>
</template>
<style scoped>
#statusList>div:not(:last-child) {
  border-bottom-width: 1px;
}
</style>
