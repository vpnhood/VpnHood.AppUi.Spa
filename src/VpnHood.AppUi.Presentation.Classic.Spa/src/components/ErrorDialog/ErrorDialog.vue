<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { computed, ref } from 'vue';
import i18n from '@/locales/i18n';
import { ClientProfileUpdateParams, ConnectPlanId, PatchOfBoolean, PatchOfString } from '@/services/VpnHood.Client.Api';
import { UiConstants } from '@/helpers/UiConstants';
import LearningButton from '@/components/LearningButton.vue';
import PremiumByCode from '@/components/PurchaseSubscription/PremiumByCode.vue';
import router from '@/services/router';
import { useDialogFocus } from '@/helpers/InitialFocus';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
// On a TV the message opens with Close under the remote: a control rather than the dialog's
// wrapper, which is where Vuetify parks focus and where the arrows have nowhere to go.
const { target: closeBtnRef, onAfterEnter } = useDialogFocus();

const props = defineProps<{
  modelValue: boolean,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
}>();

const updateParams = new ClientProfileUpdateParams({
  selectedLocation: new PatchOfString({value: vhApp.data.uiState.autoLocationValue})
});
const dialogState = computed(() => vhApp.data.uiState.errorDialogState);
const showChangeCodeSheet = ref(false);

// Reconnect by Auto Location
async function changeLocationToAuto(clientProfileId: string): Promise<void> {
  updateParams.isPremiumLocationSelected = new PatchOfBoolean({value: false});
  await vhApp.clientProfileClient.update(clientProfileId, updateParams);
  await closeDialog();
  await vhApp.connect({clientProfileId, serverLocation: vhApp.data.uiState.autoLocationValue, isPremium: false, planId: ConnectPlanId.Normal});
}

// Reconnect by Try Premium
async function tryPremium(clientProfileId: string): Promise<void> {
  updateParams.isPremiumLocationSelected = new PatchOfBoolean({value: true});
  await vhApp.clientProfileClient.update(clientProfileId, updateParams);
  await closeDialog();
  await vhApp.connect({clientProfileId, serverLocation: vhApp.data.uiState.autoLocationValue, isPremium: true, planId: ConnectPlanId.PremiumByTrial});
}

async function diagnose(): Promise<void> {
  await closeDialog();
  await vhApp.diagnose();
}

async function sendReport(): Promise<void> {
  try {
    const clientId = vhApp.data.features.clientId.substring(0, 8);

    // get the report file content.
    const url: string = vhApp.data.serverUrl + UiConstants.logFileLocation;
    const response: Response = await fetch(url);
    const fileContent: string = await response.text();

    await vhApp.vhFirebase?.sendReport(fileContent, clientId, 'logs', vhApp.data.features.isTv);
  }
  catch (ex) {
    console.error('Oops! Could not even send the report details!', ex);
  }
}

async function restorePremium(): Promise<void> {
  await closeDialog();
  await router.replace({ name: 'PURCHASE_SUBSCRIPTION' });
}

// Change code, never Remove (keyring plan §7, §8): the refused code is KEPT, and entering a new one
// replaces it in a single step. Removing would only turn the build into its own free edition.
async function changeAccessCode(): Promise<void> {
  await closeDialog();
  showChangeCodeSheet.value = true;
}
async function closeDialog(): Promise<void> {
  await vhApp.clearLastError();
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    @update:modelValue="emit('update:modelValue',$event)"
    :persistent="true"
    @after-enter="onAfterEnter"
  >
    <v-card
      :title="locale('MESSAGE')"
      append-icon="mdi-alert-circle-outline"
      color="dialog-alert"
    >

      <v-card-text v-if="dialogState.showSystemSettingButton" class="text-dialog-alert-text text-body-medium">
        <p>{{locale("AD_BLOCKER_MSG_PART_1")}}</p>
        <p class="my-3">{{locale("AD_BLOCKER_MSG_PART_2")}}</p>
        <p>{{locale("AD_BLOCKER_MSG_PART_3")}}</p>
      </v-card-text>

      <v-card-text v-else class="text-dialog-alert-text text-body-medium">
        {{ dialogState.message }}

        <learning-button
          v-if="dialogState.showTryPremium && vhApp.data.clientProfileId"
          :action="{ name: 'FREE_SERVERS_DISRUPTIONS' }"
        />

      </v-card-text>

      <v-card-item class="py-1">

          <v-defaults-provider :defaults="{
            'VBtn':{
              'rounded':'pill',
              'variant': 'tonal',
              'color': 'dialog-alert-btn',
              'class': 'text-transform-none mb-3',
              'block': true
            }
          }"
          >

          <!-- Change location to auto -->
          <v-btn v-if="dialogState.showChangeServerToAutoButton && vhApp.data.clientProfileId"
            variant="flat"
            :text="locale('CHANGE_TO_AUTO_AND_RECONNECT')"
            @click="changeLocationToAuto(vhApp.data.clientProfileId)"
          />

          <!-- Try premium -->
          <v-btn
            v-if="dialogState.showTryPremium && vhApp.data.clientProfileId"
           variant="flat"
           :text="locale('TRY_PREMIUM_FOR_FREE')"
           @click="tryPremium(vhApp.data.clientProfileId)"
          />

          <!-- The refused code is KEPT; what is offered is what exists (keyring plan §8). -->
          <div v-if="dialogState.showAccessCodeActions">
            <v-btn
              variant="flat"
              :text="locale('RESTORE_PREMIUM')"
              @click="restorePremium()"
            />
            <v-btn
              v-if="dialogState.showChangeAccessCode"
              variant="flat"
              :text="locale('CHANGE_CODE')"
              @click="changeAccessCode()"
            />
          </div>

          <!-- Diagnose -->
          <v-btn v-if="dialogState.showDiagnoseButton"
            prepend-icon="mdi-stethoscope"
            :text="locale('DIAGNOSE')"
            @click="diagnose()"
          />

          <!-- OpenReport -->
          <v-btn v-if="dialogState.showLogButton && (!vhApp.data.isTvUi)"
            prepend-icon="mdi-open-in-new"
            :href="vhApp.data.serverUrl + UiConstants.logFileLocation"
            :text="locale('OPEN_REPORT')"
            target="_blank"
          />

          <!-- SendReport. The whole path runs through Firebase, which is absent when the user has
               opted out of anonymous tracking (and in dev, and when no firebaseOptions are shipped),
               so without this guard the button is present but does nothing. Open Report above still
               works either way — it reads the log from the local server, no Firebase involved. -->
          <v-btn v-if="dialogState.showLogButton && vhApp.data.uiState.isReportSendingAvailable"
            prepend-icon="mdi-send-outline"
            target="_blank"
            :text="locale('SEND_REPORT')"
            @click="sendReport()"
          />

        </v-defaults-provider>

      </v-card-item>

      <v-card-actions >
        <!-- Close -->
        <v-btn ref="closeBtnRef" :text="locale('CLOSE')" @click="closeDialog()" />
      </v-card-actions>

    </v-card>
  </v-dialog>

  <!-- One-step change: the same code sheet the purchase and account pages use -->
  <premium-by-code v-model="showChangeCodeSheet"/>
</template>
