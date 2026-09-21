<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed, onMounted, ref, watch } from 'vue';
import AppBar from '@/components/AppBar.vue';
import SplitTunnelingDisabledAlert from '@/components/SplitTunneling/SplitTunnelingDisabledAlert.vue';
import { SplitCountryMode } from '@/services/VpnHood.Client.Api';
import FilterList, { type IListItemInfo } from '@/components/Settings/FilterList.vue';
import { onBeforeRouteLeave } from 'vue-router';


const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const countryList = ref<IListItemInfo[]>([]);
const isShowList = computed(() => vhApp.data.userSettings.splitTunneling.countryMode === SplitCountryMode.ExcludeList);

// master gate: the controls below are inert while splitting is off; SplitTunnelingDisabledAlert
// explains and repairs
const isSplitTunnelingEnabled = computed<boolean>(() => vhApp.data.userSettings.splitTunneling.enabled);
const localSplitMode = ref(vhApp.data.userSettings.splitTunneling.countryMode);
const selectedCountries = computed<string[]>({
  get: () => vhApp.data.userSettings.splitTunneling.countries,
  set: async (countiresCode: string[]) => vhApp.data.userSettings.splitTunneling.countries = countiresCode
});

watch(isShowList, () => {
  if (isShowList.value) fetchCountries();
});

watch(() => vhApp.data.userSettings.splitTunneling.countryMode, (newVal) => {
  localSplitMode.value = newVal;
});

onMounted(() => {
  if (isShowList.value) fetchCountries();
});

async function fetchCountries() {
  if (countryList.value.length > 0) return;

  const rawCountries = await vhApp.appClient.getSupportedSplitCountries();

  // 1. Create the base list
  const mapped = rawCountries.map(x => ({
    id: x.countryCode,
    name: x.translatedName,
    icon: vhApp.getCountryFlag(x.countryCode),
    // Logic: If it's NOT in the exclusion list, it is "Selected" (ON)
    isSelected: !selectedCountries.value.includes(x.countryCode)
  }));

  // 2. Calculate group sizes
  const onCount = mapped.filter(x => x.isSelected).length;
  const offCount = mapped.length - onCount;

  // 3. Determine the "Priority" value
  // If ON is the minority, it should have the lower sort value (0)
  const onPriority = onCount < offCount ? 0 : 1;
  const offPriority = onCount < offCount ? 1 : 0;

  // 4. Sort based on the dynamic priority
  countryList.value = mapped.sort((a, b) => {
    const aVal = a.isSelected ? onPriority : offPriority;
    const bVal = b.isSelected ? onPriority : offPriority;

    if (aVal !== bVal) return aVal - bVal;

    // Secondary sort by name so it looks organized
    return a.name.localeCompare(b.name);
  });
}

async function handleListUpdate(newList: IListItemInfo[]){
  // Update local UI
  countryList.value = newList;
  // Update the actual setting (triggers the setter)
  selectedCountries.value = newList.filter(x => !x.isSelected).map(x => x.id);
}

async function onSplitModeChange(value: SplitCountryMode | null) {
  const oldValue = vhApp.data.userSettings.splitTunneling.countryMode;

  if (value === null) {
    localSplitMode.value = oldValue;
    return;
  }

  // Update logic
  if (value === SplitCountryMode.ExcludeMyCountry) {
    selectedCountries.value = [];
  }

  vhApp.data.userSettings.splitTunneling.countryMode = value;
  await vhApp.saveUserSetting();
}

// Returning false cancels the navigation; returning nothing allows it (vue-router 5 guard style).
onBeforeRouteLeave(async () => {
  // Show error when the user excluded all countries
  if (isShowList.value && selectedCountries.value.length === vhApp.data.uiState.allCountriesCount) {
    await vhApp.processError(locale("ALL_COUNTRIES_EXCLUDED_ERROR_MSG"));
    return false;
  }

  await vhApp.saveUserSetting();
});
</script>

<template>
  <v-sheet>
    <app-bar/>

    <split-tunneling-disabled-alert/>

    <!-- Feature description -->
    <p class="text-disabled text-body-small mb-4">{{locale("SPLIT_COUNTRIES_DESC")}}</p>

    <!-- disabled on the group as well as the card: the card's pointer-events block does not stop
         keyboard focus, and TV devices navigate by keyboard alone -->
    <config-card class="pt-3" :disabled="!isSplitTunnelingEnabled">

      <v-card-item class="ps-1">

        <v-radio-group
          v-model="localSplitMode"
          @update:model-value="onSplitModeChange"
          hide-details="auto"
          color="highlight"
          :disabled="!isSplitTunnelingEnabled"
        >
          <v-radio
            v-ripple
            :value="SplitCountryMode.IncludeAll"
            class="mb-3"
          >
            <template v-slot:label>
              <div class="d-flex flex-column">
                <span>{{ locale("INCLUDE_ALL") }}</span>
                <span class="text-disabled text-body-small">{{ locale("INCLUDE_ALL_DESC") }}</span>
              </div>
            </template>
          </v-radio>

          <v-radio
            v-ripple
            :value="SplitCountryMode.ExcludeMyCountry"
            class="mb-3"
          >
            <template v-slot:label>
              <div class="d-flex flex-column">
                <span>
                  {{ locale("EXCLUDE_MY_COUNTRY") }}
                  <v-chip
                    color="highlight"
                    :text="locale('RECOMMENDED')"
                    size="small"
                    variant="tonal"
                    density="comfortable"
                    tabindex="-1"
                  />
                </span>
                <span class="text-disabled text-body-small">
                    {{ locale("SPLIT_EXCLUDE_MY_COUNTRY_DESC") }}
                </span>
              </div>
            </template>
          </v-radio>

          <v-radio
            v-ripple
            :value="SplitCountryMode.ExcludeList"
            class="mb-3"
          >
            <template v-slot:label>
              <div class="d-flex flex-column">
                <span>{{ locale("CUSTOM_INCLUDE_LIST") }}</span>
                <span class="text-disabled text-body-small">{{ locale("CUSTOM_INCLUDE_LIST_DESC") }}</span>
              </div>
            </template>
          </v-radio>

        </v-radio-group>
      </v-card-item>
  </config-card>

  <!-- Country list -->
  <filter-list
    v-if="isShowList"
    :list="countryList"
    :loading="countryList.length < 1"
    icon-size="30"
    :is-icon-as-flag="true"
    :disabled="!isSplitTunnelingEnabled"
    @update:list="handleListUpdate"
  />

  </v-sheet>
</template>
