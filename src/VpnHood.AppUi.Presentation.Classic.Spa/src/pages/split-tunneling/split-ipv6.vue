<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed, ref, watch } from 'vue';
import AppBar from '@/components/AppBar.vue';
import SplitTunnelingDisabledAlert from '@/components/SplitTunneling/SplitTunnelingDisabledAlert.vue';
import { SplitUnsupportedIpMode } from '@/services/VpnHood.Client.Api';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const localMode = ref(vhApp.data.userSettings.splitTunneling.unsupportedIpV6Mode);

// master gate: the controls below are inert while splitting is off; SplitTunnelingDisabledAlert
// explains and repairs
const isSplitTunnelingEnabled = computed<boolean>(() => vhApp.data.userSettings.splitTunneling.enabled);

// the permissive choice lets IPv6 travel outside the tunnel on a v4-only server — a live risk only
// while the master toggle allows splitting; otherwise the disabled alert speaks
const isIpV6Leaking = computed<boolean>(() =>
  isSplitTunnelingEnabled.value && localMode.value === SplitUnsupportedIpMode.Exclude);

watch(() => vhApp.data.userSettings.splitTunneling.unsupportedIpV6Mode, (newVal) => {
  localMode.value = newVal;
});

async function onModeChange(value: SplitUnsupportedIpMode | null) {
  if (value === null) {
    localMode.value = vhApp.data.userSettings.splitTunneling.unsupportedIpV6Mode;
    return;
  }

  vhApp.data.userSettings.splitTunneling.unsupportedIpV6Mode = value;
  await vhApp.saveUserSetting();
}
</script>

<template>
  <v-sheet>
    <app-bar/>

    <split-tunneling-disabled-alert/>

    <!-- Feature description; the closing sentence is bold, so it carries markup like the other
         emphasized descriptions -->
    <p class="text-disabled text-body-small mb-4" v-html="locale('SPLIT_IPV6_DESC')"/>

    <!-- Leak warning for the mode that lets IPv6 out of the tunnel -->
    <alert-warning v-if="isIpV6Leaking" :text="locale('SPLIT_IPV6_LEAK_WARNING')" class="mb-4"/>

    <!-- disabled on the group as well as the card: the card's pointer-events block does not stop
         keyboard focus, and TV devices navigate by keyboard alone -->
    <config-card class="pt-3" :disabled="!isSplitTunnelingEnabled">
      <v-card-item class="ps-1">

        <v-radio-group
          v-model="localMode"
          @update:model-value="onModeChange"
          hide-details="auto"
          color="highlight"
          :disabled="!isSplitTunnelingEnabled"
        >
          <v-radio
            v-ripple
            :value="SplitUnsupportedIpMode.Block"
            class="mb-3"
          >
            <template v-slot:label>
              <div class="d-flex flex-column">
                <span>
                  {{ locale("SPLIT_IPV6_BLOCK") }}
                  <v-chip
                    color="highlight"
                    :text="locale('RECOMMENDED')"
                    size="small"
                    variant="tonal"
                    density="comfortable"
                    tabindex="-1"
                  />
                </span>
                <span class="text-disabled text-body-small">{{ locale("SPLIT_IPV6_BLOCK_DESC") }}</span>
              </div>
            </template>
          </v-radio>

          <v-radio
            v-ripple
            :value="SplitUnsupportedIpMode.Exclude"
            class="mb-3"
          >
            <template v-slot:label>
              <div class="d-flex flex-column">
                <span>{{ locale("SPLIT_IPV6_EXCLUDE") }}</span>
                <span class="text-disabled text-body-small">{{ locale("SPLIT_IPV6_EXCLUDE_DESC") }}</span>
              </div>
            </template>
          </v-radio>

        </v-radio-group>
      </v-card-item>
    </config-card>
  </v-sheet>
</template>
