<script lang="ts" setup>
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import AppBar from '@/components/AppBar.vue';
import { onBeforeRouteLeave } from 'vue-router';
import { AppFeature, DnsMode } from '@/services/VpnHood.Client.Api';
import PremiumIcon from '@/components/PremiumIcon.vue';
import { computed, ref, watch } from 'vue';
import { Validators } from '@/helpers/Validators';
import SmallFeatureImageAndDescription from '@/components/Settings/SmallFeatureImageAndDescription.vue';
import FeaturePageLayout from '@/components/Settings/FeaturePageLayout.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const isPrivateDnsActive = computed(() => vhApp.data.isPrivateDnsActive);
const isPrivateDnsCustomized = computed(() => vhApp.data.isPrivateDnsCustomized);
const privateDnsProvider = computed(() => vhApp.data.state.systemPrivateDns?.provider);
// Off, or running in Android's default "Automatic" mode, or pointed at a provider the user chose.
const privateDnsStatusText = computed(() =>
  !isPrivateDnsActive.value ? locale('OFF') : isPrivateDnsCustomized.value ? locale('ON') : locale('AUTO'));
const isAdapterDnsAvailable = computed(() => selectedDnsMode.value == DnsMode.AdapterDns);

const dns1 = ref<string | null>(vhApp.data.userSettings.dnsServers[0] ?? null);
const dns2 = ref<string | null>(vhApp.data.userSettings.dnsServers[1] ?? null);
const customDnsForm = ref();
const selectedDnsMode = ref<DnsMode>(vhApp.data.userSettings.dnsMode);

const dns1Rules = [(value: string | null) => isAdapterDnsAvailable.value && !value ? locale('DNS1_REQUIRED') : Validators.validateIp(value, locale('INVALID_IP'))];
const dns2Rules = [(value: string | null) => Validators.validateIp(value, locale('INVALID_IP'))];

async function saveSettings() {
  vhApp.data.userSettings.dnsMode = selectedDnsMode.value;
  vhApp.data.userSettings.dnsServers = [dns1.value, dns2.value].filter((v): v is string => !!v && !Validators.isEmptyString(v));
  await vhApp.saveUserSetting();
}

// Returning false cancels the navigation; returning nothing allows it (vue-router 5 guard style).
//
// An unfinished Custom entry must never cancel the leave. DNS 1 is required the moment Custom is
// picked and it starts empty for anyone who has not set one, so refusing to leave killed both back
// buttons — the app bar's router.go(-1) and Android's hardware back alike — with no way out but
// typing an address. Nothing here is persisted until this guard runs, so an invalid form simply
// discards the edit: userSettings still holds the mode that was saved before the radio moved.
onBeforeRouteLeave(async () => {
  if ( isAdapterDnsAvailable.value && customDnsForm.value ) {
    const result = await customDnsForm.value.validate();
    if (!result.valid) {
      vhApp.showGeneralSnackbar(locale('CUSTOM_DNS_DISCARDED'), 'warning');
      return;
    }
  }

  try {
    await saveSettings();
  } catch (err: unknown) {
    await vhApp.processError(err);
    return false;
  }
});

// Dns1 Live formatting
watch(dns1, (newVal) => {
  if (!newVal) return;
  const formatted = Validators.formatIpInput(newVal);
  if (formatted !== newVal) dns1.value = formatted;
});
// Dns2 Live formatting
watch(dns2, (newVal) => {
  if (!newVal) return;
  const formatted = Validators.formatIpInput(newVal);
  if (formatted !== newVal) dns2.value = formatted;
});

function isShowEnforcedByServerAlert() {
  return vhApp.data.isConnected && selectedDnsMode.value == DnsMode.AdapterDns &&
  vhApp.data.state.sessionInfo?.dnsConfig.isUserSuppressed
}
</script>

<template>

  <feature-page-layout
    v-if="!vhApp.data.isPremiumFeatureAllowed(AppFeature.CustomDns)"
    title="DNS"
    description="DNS_DESC"
    image="private-dns.webp"
    :is-premium="vhApp.data.isPremiumFeature(AppFeature.CustomDns)"
    :is-action-button-available="false"
  />

  <v-sheet v-else>
    <app-bar/>

    <small-feature-image-and-description image="private-dns.webp" :description="locale('DNS_DESC')" />

    <!-- Private DNS card -->
    <config-card
      v-if="vhApp.data.intentFeatures.isPrivateDnsSettingsSupported"
      @click="router.push({name: 'PRIVATE_DNS'})"
      tabindex="0"
      @keydown.enter.prevent="router.push({name: 'PRIVATE_DNS'})"
      class="pa-3"
    >
        <!-- Title, status and premium icon -->
        <div class="d-flex align-center justify-space-between pb-1">

          <!-- Title and status (If available) -->
          <div class="d-flex align-center justify-space-between ga-2">

            <!-- title -->
            <span>{{ locale('PRIVATE_DNS') }}</span>

            <!-- Status -->
            <v-chip
              :text="privateDnsStatusText"
              :disabled="!isPrivateDnsActive"
              :color="isPrivateDnsCustomized ? 'enable-premium' : ''"
              size="small"
              variant="tonal"
              density="comfortable"
            />
          </div>

          <!-- Premium icon for premium features -->
          <premium-icon :is-premium="AppFeature.CustomDns"/>

        </div>

        <!-- Provider hostname, reported only when the user chose one in the system settings -->
        <div v-if="privateDnsProvider" class="text-highlight text-body-small pb-1 text-truncate" dir="ltr" style="text-align: start">
          {{ privateDnsProvider }}
        </div>

        <!-- Item description (Show chevron icon if the item does not have the model) -->
        <v-card-subtitle class="d-flex align-center justify-space-between ga-3 pa-0">
          {{ locale('PRIVATE_DNS_DESC') }}
          <v-icon :icon="Util.getLocalizedRightChevron()"/>
        </v-card-subtitle>

    </config-card>

    <!-- Custom DNS card -->
    <config-card class="pa-3">

      <!-- Title, status and premium icon -->
      <div class="d-flex align-center justify-space-between pb-1">
        <!-- Title -->
        <span>{{ locale('ADAPTER_DNS') }}</span>

        <!-- Premium icon for premium features -->
        <premium-icon :is-premium="AppFeature.CustomDns"/>
      </div>

      <v-card-subtitle class="ga-3 pa-0">{{ locale('ADAPTER_DNS_DESC') }}</v-card-subtitle>

      <!-- Enforced by server alert -->
      <alert-warning v-if="isShowEnforcedByServerAlert()" :text="locale('ENFORCED_BY_SERVER')" />

      <!-- Only a chosen provider overrides the adapter DNS; the automatic mode still resolves through it. -->
      <alert-warning
        v-if="isPrivateDnsCustomized && selectedDnsMode === DnsMode.AdapterDns"
        :text="locale('PRIVATE_DNS_AVAILABLE_ALERT_MSG')"
        class="my-3"
      />

      <v-radio-group
        v-model="selectedDnsMode"
        :disabled="isShowEnforcedByServerAlert()"
        :hide-details="true"
        color="highlight"
        class="my-5"
      >

        <v-radio v-ripple :value="DnsMode.Default" class="mb-5">
          <template v-slot:label>
            <div class="d-flex flex-column align-start">
              <span>{{ locale("DEFAULT") }}</span>
              <span class="text-disabled text-body-small">{{ locale("ADAPTER_DNS_AUTO_DESC") }}</span>
            </div>
          </template>
        </v-radio>

        <v-radio v-ripple :value="DnsMode.AdapterDns">
          <template v-slot:label>
            <div class="d-flex flex-column align-start">
              <span>{{ locale("CUSTOM") }}</span>
              <span class="text-disabled text-body-small">{{ locale("ADAPTER_DNS_CUSTOM_DESC") }}</span>
            </div>
          </template>
        </v-radio>

      </v-radio-group>

      <v-card-item v-if="isAdapterDnsAvailable">
        <v-locale-provider :rtl="false">
          <v-form ref="customDnsForm">
            <p>DNS 1</p>
            <v-text-field
              v-model="dns1"
              :rules="dns1Rules"
              rounded="lg"
              variant="outlined"
              color="highlight"
              placeholder="8.8.8.8"
              density="compact"
              clearable
            />

            <p class="mt-2">DNS 2</p>
            <v-text-field
              v-model="dns2"
              :rules="dns2Rules"
              rounded="lg"
              variant="outlined"
              color="highlight"
              placeholder="8.8.4.4"
              density="compact"
              clearable
            />
          </v-form>
        </v-locale-provider>
      </v-card-item>
    </config-card>

  </v-sheet>
</template>
