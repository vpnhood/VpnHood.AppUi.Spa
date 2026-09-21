<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { onUpdated, ref } from 'vue';
import { ConnectManager } from '@/helpers/ConnectManager';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const accessKey = ref<string>('');
const accessKeyErrorMessage = ref<string | null>(null);

// TODO: remove if unnecessary
onUpdated(() => {
  if (!props.modelValue) {
    accessKey.value = '';
    accessKeyErrorMessage.value = '';
  }
})

async function addAccessKey(): Promise<void> {

  try {
    // Add accessKey
    const clientProfileInfo = await vhApp.addAccessKey(accessKey.value);
    await connect(clientProfileInfo.clientProfileId);

  } catch (err) {
    console.error(err);
    accessKeyErrorMessage.value = locale('INVALID_ACCESS_KEY_FORMAT');
  }
}

async function connect(clientProfileId:string): Promise<void>{
  // Close current dialog
  emit('update:modelValue', false);

  accessKey.value = '';

  // Show new server added snackbar
  vhApp.showGeneralSnackbar(locale('NEW_SERVER_ADDED'), "active", true, undefined, false);

  // Connect to server
  await ConnectManager.connectWithProfile({clientProfileId, isDiagnose: false});
}

</script>

<template>
  <v-bottom-sheet
    :modelValue="props.modelValue"
    @update:modelValue="emit('update:modelValue',$event)"
    id="addServerDialog"
    :inset="true"
  >

    <!-- Add Private Server -->
    <v-card
      color="background"
      class="rounded-b-0 mx-auto"
      width="100%"
      variant="flat"
      :title="locale('ADD_ACCESS_KEY_TITLE')"
    >
      <v-card-text class="test-disabled text-body-small">{{ locale('ADD_ACCESS_KEY_SUBTITLE') }}</v-card-text>
      <v-card-item>
        <v-text-field
          v-model="accessKey"
          :error-messages="accessKeyErrorMessage"
          placeholder="vh://"
          @input="addAccessKey()"
          append-inner-icon="mdi-key"
          spellcheck="false"
          autocomplete="off"
          dir="ltr"
          :autofocus="true"
          density="compact"
          color="highlight"
        ></v-text-field>
      </v-card-item>
    </v-card>

  </v-bottom-sheet>
</template>
