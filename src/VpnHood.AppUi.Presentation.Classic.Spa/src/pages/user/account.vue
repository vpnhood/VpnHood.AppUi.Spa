<script lang="ts" setup>
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { Util } from '@/helpers/Util';
import router from '@/services/router';
import { ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import UserDetails from '@/components/User/UserDetails.vue';
import ChangePremiumMethod from '@/components/User/ChangePremiumMethod.vue';
import PremiumCodeDetails from '@/components/User/PremiumCodeDetails.vue';
import UserPremiumImage from '@/components/User/UserPremiumImage.vue';
import SubscriptionDetails from '@/components/User/SubscriptionDetails.vue';
import DeleteAccountDialog from '@/components/User/DeleteAccountDialog.vue';
import PremiumByCode from '@/components/PurchaseSubscription/PremiumByCode.vue';
import { SessionErrorCode } from '@/services/VpnHood.Client.Api';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const showChangeCodeSheet = ref(false);
const showDeleteDialog = ref(false);

// The access server refused the kept code (keyring plan §6): say "expired" only when the server
// said AccessExpired; a generic rejection is described as a rejection.
function codeRefusedNotice(): string {
  const refused = vhApp.data.state.clientProfile?.accessCodeRefusal;
  if (!refused) return '';
  const date = Util.getShortDate(refused.refusedTime);
  return refused.errorCode === SessionErrorCode.AccessExpired
    ? locale('CODE_REFUSED_EXPIRED_NOTICE', { date })
    : locale('CODE_REFUSED_REJECTED_NOTICE', { date });
}

// THE refresh. The app deliberately never polls the account — no launch refresh, no recheck clock
// — because a credential that still works needs no permission to go on working, and the people with
// no premium at all are the many. Opening this page is the person asking, and it is the one place
// they come to after buying on the website, being given a code, or wondering what they still have.
// It is also what makes the page tell the truth after a deletion on another device: the backend
// rejects the session, the app signs itself out, and this screen stops showing someone who is gone.
// NOTE deliberately absent (lifecycle §8): no code list, no picker, no deletion preview — the
// backend hands the app ONE code or nothing, and the deletion dialog is static text.
vhApp.loadAccount(true)
  .catch((error: unknown) => vhApp.processError(error));

// Signed-out only (keyring plan §7): there the device's copy is the only one there is. The card is
// hidden while signed in, where the ranking replaces a dead code by itself.
async function removeCode(): Promise<void> {
  const result = await vhApp.showConfirmDialog(
    locale('CONFIRM_REMOVE_PREMIUM_CODE'),
    locale('CONFIRM_REMOVE_PREMIUM_CODE_DESC'));
  if (!result)
    return;

  await router.replace({name: 'HOME'});
  await vhApp.removePremiumCode();
}
</script>

<template>
  <v-sheet :class="{'primary-bg-grad' : vhApp.data.isPremiumUser}">
    <app-bar/>

    <!-- Premium image -->
    <user-premium-image v-if="vhApp.data.isPremiumUser"/>

    <!-- User details -->
    <user-details v-if="vhApp.data.userState.userAccount"/>

    <!-- Premium user by the account's store subscription (Play or App Store) -->
    <template v-if="vhApp.data.isPremiumByAccount">

      <!-- Sign out and detach the store subscription. Pitching a Premium Code is only honest on a
           build that can accept one (keyring plan §8) — the App Store build cannot, and showing the
           pitch there is both a dead end and an App Review steering risk. Sign-out itself stays
           available in the user-details header on every build. -->
      <change-premium-method
        v-if="vhApp.data.canImportAccessCode"
        :title="locale('WOULD_YOU_LIKE_TO_CHANGE')"
        :description="locale('SIGN_OUT_TO_USE_PREMIUM_CODE_MSG')"
        :button-name="locale('SIGN_OUT')"
        @button-click="vhApp.signOut()"
      />

      <subscription-details />

      <premium-code-details/>
    </template>

    <!-- Premium user by code -->
    <template v-else-if="vhApp.data.state.clientProfile?.hasAccessCode">

      <!-- The access server refused this code (keyring plan §6): it is KEPT — refusal never
           deletes the credential — so the notice explains instead of a silent downgrade. -->
      <alert-warning
        v-if="vhApp.data.state.clientProfile?.accessCodeRefusal"
        class="my-4"
        :text="codeRefusedNotice()"
      />

      <!-- Change code in ONE step: entering a new code replaces the current one — no
           remove-first ritual. Gated on the ONE rule (keyring plan §8): the server's per-token
           policy AND this build's own capability, since one store forbids codes entirely. Only
           TYPING is gated that far — reading the held code is offered wherever the operator
           sells codes, on that build too. -->
      <change-premium-method
        v-if="vhApp.data.canImportAccessCode"
        :title="locale('CHANGE_PREMIUM_CODE')"
        :description="locale('CHANGE_PREMIUM_CODE_DESC')"
        :button-name="locale('CHANGE_CODE')"
        @button-click="showChangeCodeSheet = true"
      />

      <!-- Remove code — signed OUT only (keyring plan §7). Signed in, the code is the account's
           and the ranking replaces a dead one by itself; what the account holds is the panel's
           business, and the app has no door to it. -->
      <change-premium-method
        v-if="!vhApp.data.userState.userAccount"
        :title="locale('REMOVE_CURRENT_PREMIUM_CODE')"
        :description="locale('REMOVE_LOCAL_PREMIUM_CODE_DESC')"
        :button-name="locale('REMOVE_CODE')"
        @button-click="removeCode()"
      />

      <premium-code-details/>

    </template>

    <!-- Go premium -->
    <config-card v-else-if="vhApp.data.state.clientProfile?.canGoPremium">
      <v-card-title>{{locale('UPGRADE')}}</v-card-title>
      <v-card-text class="d-flex align-center justify-space-between">
        <v-img
          :eager="true"
          :src="Util.getAssetPath('free-to-premium-account-icon.webp')"
          alt="Go Premium Image"
          width="100%"
          max-width="92px"
          class="me-4"
        />
        <div class="flex-grow-1">
          <p v-html="locale('UPGRADE_ACCOUNT_DESC')"></p>
        </div>
      </v-card-text>
      <v-card-actions>
        <btn-style-1
          class="ms-auto"
          :append-icon="Util.getLocalizedRightChevron()"
          :text="locale('GO_PREMIUM')"
          size="small"
          @click="router.push({name: 'PURCHASE_SUBSCRIPTION'})"
        />
      </v-card-actions>
    </config-card>

    <!-- Delete account — the stores require it wherever sign-in exists, so it shows for
         EVERY signed-in user, premium or not. Deliberately outside the premium
         v-if/v-else-if chain above. The dialog is static text plus an explicit
         acknowledgement (lifecycle §10): no codes, no counts, nothing fetched — the
         farewell mail is what carries the codes. -->
    <config-card v-if="vhApp.data.userState.userAccount">
      <v-card-title class="text-error">{{ locale('DELETE_MY_ACCOUNT') }}</v-card-title>
      <v-card-text>{{ locale('DELETE_MY_ACCOUNT_DESC') }}</v-card-text>
      <v-card-actions>
        <v-btn
          class="ms-auto"
          color="error"
          variant="tonal"
          size="small"
          :text="locale('DELETE_MY_ACCOUNT')"
          @click="showDeleteDialog = true"
        />
      </v-card-actions>
    </config-card>

    <!-- One-step change: the same code sheet the purchase page uses -->
    <premium-by-code v-model="showChangeCodeSheet"/>

    <!-- The static confirmation: warn, acknowledge, act -->
    <delete-account-dialog
      v-model="showDeleteDialog"
      @confirm="() => vhApp.deleteAccount()"
    />

  </v-sheet>
</template>
