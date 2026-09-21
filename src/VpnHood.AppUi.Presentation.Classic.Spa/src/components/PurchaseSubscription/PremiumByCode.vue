<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { ClientProfileUpdateParams, ConnectPlanId, PatchOfString } from '@/services/VpnHood.Client.Api';
import { ref } from 'vue';
import PendingDialog from '@/components/PurchaseSubscription/PendingDialog.vue';
import PremiumCodeCompleteDialog from '@/components/PurchaseSubscription/PremiumCodeCompleteDialog.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const premiumCodeForm = ref<boolean>(false);
const invalidCodeError = ref<null | string>(null);
const formattedPremiumCode = ref('');
const premiumCodeRawNumber = ref<string | null>(null);
const isShowPremiumCodeCompleteDialog = ref(false);
const isShowPendingDialog = ref(false);

// The shape of a code, not a re-statement of the title above it: five groups of four is what the
// person is holding, and the same mask PremiumCodeDetails shows. Locale-neutral, so it is not a
// translation key.
const premiumCodePlaceholder = 'XXXX-XXXX-XXXX-XXXX-XXXX';

// Add a dash every 4 characters during input premium code
/*
watchEffect(() => {
  formattedPremiumCode.value = premiumCodeRawNumber.value.match(/.{1,4}/g)?.join('-') || '';
});
*/

/*const premiumCodeNumberRule = (value: string) => {
  return /^[0-9\-]*$/.test(value) || locale('PREMIUM_CODE_NUMBER_RULE_MSG');
};*/

/*const premiumCodeCountRule = (value: string) => {
  const count = value.replace(/-/g, '').length;
  return count == 20 || locale('PREMIUM_CODE_COUNT_RULE_MSG');
};*/

// Keep only numbers and limit to 20 characters
const premiumCodeHandleInput = (event: Event) => {
  if (invalidCodeError.value) invalidCodeError.value = null;
  const value = (event.target as HTMLInputElement).value;
  premiumCodeRawNumber.value = value;
};

async function updatePremiumCode(): Promise<void> {
  const profileId = vhApp.data.state.clientProfile?.clientProfileId;
  if (!profileId) {
    throw new Error(locale('PROFILE_ID_NOT_FOUND_DURING_VALIDATION_MSG'));
  }

  try {
    // try to update premium code to client profile, if the code is invalid, it will throw error and show error message, if the code is valid, it will try to connect to access server with new code, if the connection is successful and premium by code is active, it will show complete dialog, otherwise it will remove the premium code from client profile
    await vhApp.clientProfileClient.update(
      profileId,
      new ClientProfileUpdateParams({
        accessCode: new PatchOfString({ value: premiumCodeRawNumber.value }),
      }),
    );
  } catch {
    invalidCodeError.value = locale('INVALID_PREMIUM_CODE_NUMBERS_MSG');
    return;
  }

  // The profile write above is the ONE door (keyring plan §7). It makes the code work here at once,
  // and when somebody is signed in the app hands it to the account by itself — no prompt, because
  // typing a code IS choosing to use it, and no second endpoint to call.

  // …except against a live subscription, which always comes first (keyring plan §2). The code is
  // saved and queued, not used, so say that here. Connecting would show a premium session that the
  // next account read replaces with the subscription's own code — which reads as the code failing.
  if (vhApp.data.isPremiumByAccount) {
    emit('update:modelValue', false);
    await vhApp.loadAccount(true); // follow the account now rather than mid-session
    vhApp.showGeneralSnackbar(locale('PREMIUM_CODE_SAVED_FOR_LATER_MSG'), 'highlight', true);
    return;
  }

  // try to connect to access server with new premium code
  try {
    emit('update:modelValue', false);
    isShowPendingDialog.value = true;
    await vhApp.connect({clientProfileId: profileId, serverLocation: null, isPremium: true, planId: ConnectPlanId.Normal, isDiagnose: false, goToHome: false});

    if (vhApp.data.isConnected && vhApp.data.isPremiumUser)
      isShowPremiumCodeCompleteDialog.value = true;

  } finally {
    isShowPendingDialog.value = false;
  }
}
</script>

<template>
  <!-- Premium code sheet -->
  <!-- NOT 'contained': that anchors the sheet to its offset parent, so on a long page (the account
       page) it lands at the bottom of the CONTENT and the person has to scroll to find what they
       just opened. Fixed to the viewport instead, capped to the app frame like every other sheet. -->
  <v-bottom-sheet
    :modelValue="props.modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    location="bottom"
    width="100%"
    :max-width="vhApp.data.uiState.maxWidthOnLargeScreen"
  >
    <v-card
      prepend-icon="mdi-key"
      color="background"
      class="rounded-b-0"
      :title="locale('ENTER_PREMIUM_CODE')"
    >
      <v-card-item class="pt-0">
        <alert-note
          :title="locale('NOTE')"
          :text="locale('ACTIVE_PREMIUM_KEY_EXPIRATION_NOTICE')"
          class="mb-2"
        />

        <v-form
          v-model="premiumCodeForm"
          @submit.prevent="updatePremiumCode()"
        >
          <v-text-field
            v-model="formattedPremiumCode"
            :placeholder="premiumCodePlaceholder"
            @input="premiumCodeHandleInput"
            :error-messages="invalidCodeError"
            hide-details="auto"
            single-line
            clearable
            :on-click:clear="() => (premiumCodeRawNumber = null)"
            autofocus
            spellcheck="false"
            autocomplete="off"
            dir="ltr"
            density="compact"
            color="highlight"
            variant="outlined"
            rounded="md"
            class="mb-5"
          />

          <v-btn
            variant="flat"
            rounded="pill"
            color="activate-code-btn"
            class="text-transform-none"
            block
            type="submit"
            :disabled="!premiumCodeRawNumber"
            :text="locale('ACTIVATE')"
          />
        </v-form>
      </v-card-item>
    </v-card>
  </v-bottom-sheet>

  <!-- Pending purchase process dialog -->
  <pending-dialog :model-value="isShowPendingDialog" />

  <!-- Purchase complete dialog -->
  <premium-code-complete-dialog :model-value="isShowPremiumCodeCompleteDialog" />
</template>
