<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import router from '@/services/router';
import { LanguagesCode } from '@/helpers/UiConstants';
import { type IUiCultureInfo } from '@/services/VpnHood.Client.Api';
import { computed, onMounted, ref } from 'vue';
import AppBar from '@/components/AppBar.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const myLocales = ref<IUiCultureInfo[]>([
  {
    code: LanguagesCode.SystemDefault,
    nativeName: locale("SYSTEM_DEFAULT_LANGUAGE", i18n.global.locale.value),
  }
]);

const defaultLanguage = computed<string>({
  get: () => {
    return !vhApp.data.userSettings.cultureCode
      ? LanguagesCode.SystemDefault
      : vhApp.data.userSettings.cultureCode;
  },
  set: async (value: string) => {
    vhApp.data.userSettings.cultureCode = value === LanguagesCode.SystemDefault ? null : value;
    await vhApp.saveUserSetting();
    router.go(0);
  }
});

onMounted(() => {
  const sortedCultureInfos = vhApp.data.cultureInfos.sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  myLocales.value.push(...sortedCultureInfos);
});

</script>

<template>
  <v-sheet>
    <app-bar/>

    <config-card>
      <v-list
        v-model="defaultLanguage"
        bg-color="transparent"
        select-strategy="classic"
        selectable
        active-class="text-highlight"
      >
        <v-list-item
          v-for="(item, index) in myLocales"
          :key="index"
          :value="item.code"
          class="border-b"
          :active="item.code === defaultLanguage"
          @click="defaultLanguage = item.code"
        >

          <v-list-item-title class="text-capitalize">

            <!-- Radio button icon -->
            <span class="me-2">
              <v-icon v-if="item.code === defaultLanguage" icon="mdi-radiobox-marked"/>
              <v-icon v-else icon="mdi-radiobox-blank" class="text-disabled"/>
            </span>

            <!-- Language name -->
            <span>{{ item.nativeName }}</span>

            <!-- System default language name -->
            <span v-if="item.code === LanguagesCode.SystemDefault" class="text-disabled text-body-small ms-1">
              ({{ vhApp.data.state.systemUiCultureInfo.nativeName }})
            </span>

          </v-list-item-title>

          <!-- Show message if the system language does not supported -->
          <p v-if="item.code === LanguagesCode.SystemDefault &&
            !myLocales.find(x => x.code === vhApp.data.state.systemUiCultureInfo.code)"
            dir="ltr"
            class="text-disabled text-body-small"
          >
            {{ locale("SYSTEM_DEFAULT_LANGUAGE_NOT_SUPPORTED_DESC") }}
          </p>

        </v-list-item>
      </v-list>
    </config-card>

  </v-sheet>
</template>
