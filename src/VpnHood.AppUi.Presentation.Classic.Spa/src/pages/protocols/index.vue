<script setup lang="ts">
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed } from 'vue';
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import { ChannelProtocol, TcpProxyUsageReason } from '@/services/VpnHood.Client.Api';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

interface ProtocolItem {
  value: ChannelProtocol,
  title: string,
  subtitle: string,
  isDefault: boolean,
  isShow: boolean,
  isEnabled: boolean
}

function createProtocolItem(protocol: ChannelProtocol, subtitle: string, isDefault = false): ProtocolItem {
  return {
    value: protocol,
    title: Util.protocolTitle(protocol),
    isShow: vhApp.data.isShowProtocol(protocol),
    isEnabled: vhApp.data.isProtocolEnabled(protocol),
    subtitle,
    isDefault,
  };
}

const protocolItems: ProtocolItem[] = [
  createProtocolItem(ChannelProtocol.Tcp, "PROTOCOL_TCP_DESC", true),
  createProtocolItem(ChannelProtocol.Udp, "PROTOCOL_UDP_DESC"),
  createProtocolItem(ChannelProtocol.Quic, "PROTOCOL_QUIC_DESC"),
];

const activeProtocol = computed<ChannelProtocol>({
  get: () => {
    return vhApp.data.activeProtocol;
  },
  set: async (value: ChannelProtocol) => {
    vhApp.data.userSettings.channelProtocol = value;
    vhApp.data.state.channelProtocol = value;
    await vhApp.saveUserSetting();
  }
});

const cloakMode = computed({
  get: () => {
    return vhApp.data.state.sessionStatus?.isTcpProxy ?? vhApp.data.userSettings.useTcpProxy;
  },
  set: async (value: boolean) => {
    if (!vhApp.data.userSettings.isTcpProxyPrompted)
      await router.push({ name: 'CLOAK_MODE' });

    // Update session status to reflect the change immediately
    if (vhApp.data.state.sessionStatus)
      vhApp.data.state.sessionStatus.isTcpProxy = value;

    vhApp.data.userSettings.useTcpProxy = value;
    await vhApp.saveUserSetting();
  }
});

const dropQuic = computed({
  get: () => {
    return vhApp.data.state.sessionStatus?.isDropQuic ?? vhApp.data.userSettings.dropQuic;
  },
  set: async (value: boolean) => {

    if (vhApp.data.state.sessionStatus)
      vhApp.data.state.sessionStatus.isDropQuic = value;

    vhApp.data.userSettings.dropQuic = value;
    await vhApp.saveUserSetting();
  }
});

const canChangeCloakMode = computed<boolean>(() => vhApp.data.state.tcpProxyUsageReason === TcpProxyUsageReason.None);
const isCloakEnforcedByDomainFilter = computed<boolean>(() => vhApp.data.state.tcpProxyUsageReason === TcpProxyUsageReason.SplitDomainRequiredOn);
const isCloakEnforecedByServer = computed<boolean>(() =>
  vhApp.data.state.tcpProxyUsageReason === TcpProxyUsageReason.ServerRequiredOff ||
  vhApp.data.state.tcpProxyUsageReason === TcpProxyUsageReason.ServerRequiredOn);


</script>

<template>
  <v-sheet>
    <app-bar />

    <p class="text-disabled text-body-small mb-4">{{ locale("PROTOCOL_DESC") }}</p>

    <!-- Cloak Mode -->
    <config-card v-if="vhApp.data.features.isTcpProxySupported" class="pb-3">

      <!-- Switch button. data-tv-row: on the TV the whole title row is the step and wears the ring,
           not the switch at its edge (helpers/SpatialNavigation.ts, general.css). -->
      <v-card-item class="pb-0">
        <div class="d-flex align-center justify-space-between" data-tv-row :class="{ 'opacity-60': !canChangeCloakMode }">
          <span>{{ locale('CLOAK_MODE') }}</span>
          <v-switch v-model="cloakMode" :disabled="!canChangeCloakMode" hide-details />
        </div>


        <!-- Enforced by server alert -->
        <alert-warning v-if="isCloakEnforecedByServer" :text="locale('ENFORCED_BY_SERVER')" class="mb-2" />
        <alert-warning v-else-if="isCloakEnforcedByDomainFilter" :text="locale('ENFORCED_BY_DOMAIN_FILTER')"
          class="mb-2" />

        <!-- Description and learn more button. overflow-visible: a subtitle clips its overflow, and
             on the TV that cut the focus ring off the button. -->
        <v-card-subtitle class="pb-0 overflow-visible">
          <p>{{ locale("CLOAK_MODE_SHORT_DESC") }}</p>
          <v-btn :text="locale('LEARN_MORE')" variant="text" class="pa-0" :ripple="false" color="highlight"
            :append-icon="Util.getLocalizedRightChevron()" @click="router.push({ name: 'CLOAK_MODE' })" />
        </v-card-subtitle>
      </v-card-item>

      <!-- Block QUIC -->
      <v-card-item v-if="cloakMode">
        <v-divider opacity=".1" class="mb-2" />

        <!-- Switch button -->
        <div class="d-flex align-center justify-space-between" data-tv-row>
          <span>{{ locale('PROTOCOL_BLOCK_QUIC') }}</span>
          <v-switch v-model="dropQuic" hide-details />
        </div>

        <!-- Description and learn more button -->
        <v-card-subtitle class="pb-0">
          <p>{{ locale("PROTOCOL_BLOCK_QUIC_DESC") }}</p>
        </v-card-subtitle>
      </v-card-item>

    </config-card>

    <!-- Protocols radio buttons -->
    <config-card class="pt-3">
      <v-card-item class="ps-2">
        <v-radio-group v-model="activeProtocol" :hide-details="true" color="highlight">
          <template v-for="item in protocolItems" :key="item.value">
            <v-radio v-if="item.isShow" v-ripple :value="item.value" :disabled="!item.isEnabled" class="mb-3">
              <template v-slot:label>
                <div class="d-flex flex-column align-start">
                  <!-- Radio label -->
                  <div class="mb-1">
                    <!-- Protocol name -->
                    <span class="me-2">{{ locale(item.title) }}</span>

                    <!-- Default protocol badge -->
                    <v-chip v-if="item.isDefault" color="highlight" :text="locale('DEFAULT')" size="small"
                      variant="tonal" density="comfortable" tabindex="-1" class="me-1" />

                    <!-- Not supported by server badge -->
                    <v-chip v-if="!vhApp.data.isProtocolEnabled(item.value)" color="on-note"
                      :text="locale('NOT_SUPPORTED_BY_SERVER')" size="small" variant="tonal" density="comfortable"
                      tabindex="-1" />
                  </div>

                  <!-- Protocol short description -->
                  <p class="text-disabled text-body-small">{{ locale(item.subtitle) }}</p>
                </div>
              </template>
            </v-radio>
          </template>
        </v-radio-group>
      </v-card-item>
    </config-card>

  </v-sheet>
</template>
