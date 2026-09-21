<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed, onMounted, ref, watch } from 'vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const emit = defineEmits<{ (
    event: 'loadProxies',
    recordIndex: number,
    recordCount: number
  ): void;
}>();

const intervalOptions = [
  { value: null, title: locale('NEVER') },
  { value: '00:01:00', title: `1 ${locale('MINUTE')}` },
  { value: '00:02:00', title: `2 ${locale('MINUTES')}` },
  { value: '00:03:00', title: `3 ${locale('MINUTES')}` },
  { value: '00:05:00', title: `5 ${locale('MINUTES')}` },
  { value: '00:10:00', title: `10 ${locale('MINUTES')}` },
  { value: '00:30:00', title: `30 ${locale('MINUTES')}` },
  { value: '01:00:00', title: `1 ${locale('HOUR')}` },
  { value: '02:00:00', title: `2 ${locale('HOURS')}` },
  { value: '04:00:00', title: `4 ${locale('HOURS')}` },
  { value: '05:00:00', title: `5 ${locale('HOURS')}` },
  { value: '12:00:00', title: `12 ${locale('HOURS')}` },
  { value: '1.00:00:00', title: `24 ${locale('HOURS')}` }
];

const autoUpdateInterval = ref<string | null>(null);
const oldProxyUrl = ref<string|null>(null);
const isReloadingUrl = ref(false);

const proxyUrl = computed({
  get: () => vhApp.data.userSettings.proxySettings.autoUpdateOptions.url ?? null,
  set: async (value: string | null) => {
    vhApp.data.userSettings.proxySettings.autoUpdateOptions.url = value;
    await vhApp.saveUserSetting();
  }
});

const isAddByUrlEnabled = ref<boolean>(!!proxyUrl.value);
const hasUrl = computed((): boolean => proxyUrl.value ? proxyUrl.value.trim().length > 0 : false);

async function handelInputUrl(): Promise<void> {
  if (!hasUrl.value || proxyUrl.value === oldProxyUrl.value || isReloadingUrl.value)
    return;
  await reloadFromUrl();
}
async function reloadFromUrl(): Promise<void> {
  try {
    isReloadingUrl.value = true;
    await saveAutoUpdateSettings();
    await vhApp.proxyEndPointClient.reloadUrl();
    oldProxyUrl.value = proxyUrl.value;
    emit('loadProxies', 0, 10);
  }
  finally {
    isReloadingUrl.value = false;
  }
}
async function saveAutoUpdateSettings(): Promise<void> {
  const proxySettings = vhApp.data.userSettings.proxySettings;
  proxySettings.autoUpdateOptions.url = proxyUrl.value?.trim() ?? null;
  proxySettings.autoUpdateOptions.interval = autoUpdateInterval.value?.trim() ?? null;
  await vhApp.saveUserSetting();
}
function loadAutoUpdateSettings(): void {
  const options = vhApp.data.userSettings.proxySettings.autoUpdateOptions;
  proxyUrl.value = options.url ?? null;
  autoUpdateInterval.value = options.interval ?? null;
  oldProxyUrl.value = proxyUrl.value;
}

onMounted(() => {
  loadAutoUpdateSettings();

});

// Reset URL settings when the URL switch disabled
watch(isAddByUrlEnabled, async (newVal, oldVal) => {
  if (oldVal === true && newVal === false) {
    proxyUrl.value = null;
    autoUpdateInterval.value = null;
    await saveAutoUpdateSettings();
  }
});
</script>

<template>
  <config-card :loading="isReloadingUrl">
    <v-card-item class="smallSelect">
      <!-- Status button -->
      <div class="d-flex align-center justify-space-between">
        <span>{{ locale('ADD_BY_URL') }}</span>
        <v-switch v-model="isAddByUrlEnabled" density="compact" hide-details/>
      </div>

      <template v-if="isAddByUrlEnabled">
          <v-text-field
            v-model="proxyUrl"
            :label="locale('URL')"
            :placeholder="locale('PROXY_AUTO_UPDATE_URL_PLACEHOLDER')"
            variant="outlined"
            density="compact"
            rounded="lg"
            hide-details="auto"
            color="highlight"
            class="my-3 text-disabled"
            clearable
            @blur="handelInputUrl()"
          >
            <template v-slot:append>
              <v-btn
                icon="mdi-refresh"
                size="small"
                rounded="lg"
                variant="tonal"
                color="highlight"
                :disabled="!hasUrl || isReloadingUrl"
                :loading="isReloadingUrl"
                @click="reloadFromUrl()"
              />
            </template>
          </v-text-field>



        <div class="d-flex align-center justify-space-between">
          <span :class="{'text-disabled': !hasUrl}" class="text-label-large">{{ locale('AUTO_UPDATE') }}</span>

          <v-select
            v-model="autoUpdateInterval"
            @update:model-value="saveAutoUpdateSettings()"
            :items="intervalOptions"
            item-title="title"
            item-value="value"
            :disabled="!hasUrl"
            variant="plain"
            density="compact"
            color="highlight"
            hide-details
            class="flex-grow-0 text-highlight"
          />
        </div>
      </template>
    </v-card-item>
  </config-card>
</template>
