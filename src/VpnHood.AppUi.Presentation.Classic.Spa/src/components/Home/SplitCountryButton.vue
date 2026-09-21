<script setup lang="ts">
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { computed } from 'vue';
import { SplitCountryMode } from '@/services/VpnHood.Client.Api';
import CountryFlagWrapper from '@/components/CountryFlagWrapper.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

// the EFFECTIVE mode from state: a split the toggle or the plan silenced shows no flags
const mode = computed(() => vhApp.data.state.splitTunnelingState.countryMode);
const excludedCountries = computed((): string[] => vhApp.data.state.splitTunnelingState.countries ?? []);
const maxFlags = 3;

// Flag Display Logic
const isExcludeListMode = computed(() => mode.value === SplitCountryMode.ExcludeList);

// Only allow multiple flags if list is small (1-2 items)
const allowMultipleFlags = computed(() =>
  isExcludeListMode.value &&
  excludedCountries.value.length > 0 &&
  excludedCountries.value.length < maxFlags
);

const isShowSplitCountryFlag = computed(() => mode.value === SplitCountryMode.ExcludeMyCountry);

// Hide text if we are showing 2 or 3 flags to save space,
// unless there's only 1 flag or it's a different mode.
const isShowSplitCountryText = computed(() => !allowMultipleFlags.value || excludedCountries.value.length < maxFlags);

</script>

<template>
  <home-config-btn
    id="excludeCountryButton"
    prepend-icon="mdi-call-split"
    class="mb-1"
    tabindex="6"
    @click="router.push({ name: 'SPLIT_COUNTRIES' })"
  >
    <span class="config-btn-title">{{ locale('SPLIT_COUNTRIES') }}</span>
    <v-icon :icon="Util.getLocalizedRightChevron()" />

    <!-- Text related to selected option -->
    <span
      v-if="isShowSplitCountryText"
      class="config-btn-value text-white text-capitalize text-body-small text-truncate limited-width-to-truncate opacity-50"
    >
      {{ vhApp.data.splitCountryStatusText }}
    </span>

    <template v-if="allowMultipleFlags || isShowSplitCountryFlag" v-slot:append>

      <!-- Multiple country flag -->
      <template v-if="allowMultipleFlags">
        <country-flag-wrapper
          v-for="countryCode in excludedCountries"
          :key="countryCode"
          :country-code="countryCode"
        />
      </template>

      <!-- Client country flag -->
      <country-flag-wrapper v-else :country-code="vhApp.data.state.clientCountryInfo?.countryCode" />
    </template>

  </home-config-btn>
</template>
