<script setup lang="ts">
import { computed } from 'vue';
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { AppProxyMode } from '@/services/VpnHood.Client.Api';
import DeviceProxy from '@/components/Proxies/DeviceProxy.vue';
import ManualProxies from '@/components/Proxies/ManualProxies.vue';
import { Util } from '@/helpers/Util';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const proxyModeItems = [
  { value: AppProxyMode.NoProxy, title: locale('NO_PROXY') },
  { value: AppProxyMode.Device, title: locale('SYSTEM') },
  { value: AppProxyMode.Manual, title: locale('MANUAL') }
];

const proxyMode = computed<AppProxyMode>({
    get: () => vhApp.data.userSettings.proxySettings.mode,
    set: async (value: AppProxyMode) => {
        const proxySettings = vhApp.data.userSettings.proxySettings;
        const previous = proxySettings.mode;
        if (previous === value)
            return;

        proxySettings.mode = value;
        try {
            await vhApp.saveUserSetting();
        } catch (err: unknown) {
            proxySettings.mode = previous;
            throw err;
        }
    }
});

</script>

<template>
    <v-sheet>
      <app-bar />

      <!-- TODO: Use the component -->
      <!-- Proxy image and description -->
      <v-img
        :src="Util.getAssetPath('proxy.webp')"
        alt="Symbol image"
        width="100%"
        :max-height="proxyMode === AppProxyMode.Manual ? '130px' : '280px'"
        class="mx-auto"
        style="transition: all .3s ease-in-out"
      />
      <p class="mt-2 mb-5 text-disabled text-body-small px-3">{{locale('PROXY_NOTE')}}</p>


      <!-- Proxy mode select-->
      <config-card>
        <v-card-item class="smallSelect">
          <div class="d-flex align-center justify-space-between">
            <span>{{ locale('PROXY_MODE') }}</span>

            <v-select
              v-model="proxyMode"
              :items="proxyModeItems"
              item-title="title"
              item-value="value"
              variant="plain"
              density="compact"
              single-line
              color="highlight"
              hide-details
              class="flex-grow-0 text-highlight"
            />
          </div>
        </v-card-item>
      </config-card>

      <!-- Manual mode -->
      <manual-proxies v-if="proxyMode == AppProxyMode.Manual"/>

      <!-- Device mode -->
      <device-proxy v-else-if="proxyMode === AppProxyMode.Device" />

    </v-sheet>
</template>


<!--suppress CssUnusedSymbol -->
<style>
.smallSelect .v-field{
  font-size: 14px;
}
.smallSelect .v-field__input{
  padding-top: 0;
  padding-inline-end: 0;
  padding-bottom: 0;
}
.smallSelect .v-field.v-field--variant-plain .v-field__append-inner{
  padding-top: 6px;
}
</style>
