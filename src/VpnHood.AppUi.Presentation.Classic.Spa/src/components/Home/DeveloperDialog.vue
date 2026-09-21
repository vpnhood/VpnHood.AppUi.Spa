<script setup lang="ts">
import { UiConstants } from '@/helpers/UiConstants';
import { computed } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';

const vhApp = VpnHoodApp.instance;

const props = defineProps<{
  modelValue: boolean,
}>();

const debugData1 = computed<string[]>({
  get: () => vhApp.data.userSettings.debugData1?.split(' ') ?? [],
  set: (value: string[] | null) => vhApp.data.userSettings.debugData1 = value?.join(' ') || null
});

const debugData2 = computed<string | null>({
  get: () => vhApp.data.userSettings.debugData2 ?? null,
  set: (value: string | null) => vhApp.data.userSettings.debugData2 = value
});

async function saveDebugDataSetting(): Promise<void> {
  await vhApp.saveUserSetting();
  vhApp.data.uiState.isShowDeveloperDialog = false;
}
</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    :persistent="true"
  >
    <v-card color="background" title="Only developers" append-icon="mdi-bug-outline">

      <!-- Support id -->
      <template v-slot:subtitle>
        <p class="text-disabled text-body-small">{{ 'Support ID: ' + vhApp.data.state.clientProfile?.supportId }}</p>
      </template>

      <v-card-item>

        <!-- Debug data-1 -->
        <v-combobox
          v-model="debugData1"
          theme="dark"
          clearable
          label="DebugData1"
          :items="vhApp.data.features.debugCommands"
          :list-props="{ bgColor: 'app-bar' }"
          hide-details
          hide-selected
          chips
          closable-chips
          multiple
          class="mb-4"
        />

        <!-- Debug data-2 -->
        <v-combobox
          v-model="debugData2"
          clearable
          label="DebugData2"
          variant="filled"
          hide-details
          class="mb-4"
        />

        <!-- Open log file -->
        <btn-style-1
          block
          text="Open log"
          :href="vhApp.data.serverUrl + UiConstants.logFileLocation"
          target="_blank"
        />

      </v-card-item>

      <!-- Close button -->
      <v-card-actions>
        <v-btn text="Close" @click="saveDebugDataSetting()" />
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>
