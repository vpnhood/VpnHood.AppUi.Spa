<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import i18n from '@/locales/i18n';
import { Account, ApiException } from '@/services/VpnHood.Client.Api';
import { ClientApiFactory } from '@/services/ClientApiFactory';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import PendingDialog from '@/components/PurchaseSubscription/PendingDialog.vue';
import PurchaseCompleteDialog from '@/components/PurchaseSubscription/PurchaseCompleteDialog.vue';
import SignInDialog from '@/components/User/SignInDialog.vue';

// The way back to premium somebody ALREADY has, on the purchase page itself rather than inside the
// store card: the store is exactly what is missing when this is needed most — it failed to load, or
// the build has none — and premium can arrive from a channel this device's store knows nothing
// about (the account website, a code typed on another device, a subscription bought in another
// store). Apple 3.1.1 also requires a restore path that a reviewer can reach on a fresh install.
const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const isShowPendingDialog = ref(false);
const isShowCompleteDialog = ref(false);
const showSignInDialog = ref(false);

const isSignedIn = computed(() => vhApp.data.userState.userAccount != null);

// Signing in IS the restore for a purchase this device's store never saw, so one slot carries both:
// the invitation while signed out, the store-restore action once there is an account to restore into.
const label = computed(() => isSignedIn.value ? locale('RESTORE_PURCHASE') : locale('ALREADY_PREMIUM'));

// More than one way in (an identity provider + the account website's password), or password alone →
// the chooser dialog; vhApp.signIn() asks for a primary provider and password is deliberately not
// one, so a password-only build could never sign in through it. Mirrors NavigationDrawer.
const hasSignInChoice = computed(() => vhApp.hasSignInChoice());

// Is the signed-in account already served (lifecycle §8) — a store subscription, or the code the
// backend chose for it? Read as a function, never inline: it is asked AFTER signing in, where
// TypeScript's control-flow narrowing would otherwise hold it to the pre-sign-in answer.
function isAccountServed(): boolean {
  const account: Account | null = vhApp.data.userState.userAccount;
  return !!(account?.subscription || account?.accessCodeInfo);
}

async function onClick(): Promise<void> {
  if (!isSignedIn.value && hasSignInChoice.value) {
    // the dialog owns the sign-in; restore continues from the watcher when it succeeds
    showSignInDialog.value = true;
    return;
  }
  await restore();
}

async function restore(): Promise<void> {
  let hasNothingToRestore = false;
  let isRestoredButExpired = false;
  isShowPendingDialog.value = true;
  try {
    if (!isSignedIn.value) {
      try {
        await vhApp.signIn(true);
      }
      catch (err: unknown) {
        if (err instanceof ApiException && err.exceptionTypeName === 'NoCredentialException')
          throw new Error(locale('GOOGLE_PLAY_LOGIN_NO_CREDENTIAL_ERROR'));
        throw err;
      }
    }

    // A build with no store has nothing to ask; signing in and refreshing the account is the whole
    // of the restore there, and calling into a billing service it does not have would only throw.
    const restored = vhApp.data.features.isBillingSupported
      ? await vhApp.withContinueOnTv(() => ClientApiFactory.instance.createBillingClient().restorePurchase())
      : false;
    await vhApp.loadAccount();

    // The real question is "am I premium again?", not "did the store hand back a subscription?" —
    // and the two can honestly differ BOTH ways: signing in may have just served this account its
    // code (lifecycle §8) while the store subscription behind it is long over, so the store restore
    // finds nothing — being served IS the restored state, whichever channel delivered it. And the
    // store can hand back a proof whose entitlement has since EXPIRED: the portal replays it
    // honestly (201) but the account stays unserved, and congratulating over a page that is not
    // premium reads as a lie. The account, refreshed above, is the only honest witness.
    const isServed = isAccountServed();
    hasNothingToRestore = !restored && !isServed;
    isRestoredButExpired = restored && !isServed;
    isShowCompleteDialog.value = isServed;
  }
  finally {
    isShowPendingDialog.value = false;
  }

  // told after the pending dialog is gone, so the message is not stacked underneath it
  if (hasNothingToRestore) await vhApp.showErrorMessage(locale('NO_PURCHASE_TO_RESTORE'));
  if (isRestoredButExpired) await vhApp.showErrorMessage(locale('RESTORED_PURCHASE_EXPIRED_MSG'));
}

// The chooser dialog closes on success as well as on cancel, so the account decides which happened.
watch(showSignInDialog, async (isOpen, wasOpen) => {
  if (!wasOpen || isOpen || !isSignedIn.value) return;
  await restore();
});
</script>

<template>
  <div v-if="vhApp.data.features.isAccountSupported">
    <v-btn
      variant="text"
      size="small"
      class="text-transform-none mt-1"
      block
      :text="label"
      @click="onClick()"
    />

    <sign-in-dialog v-model="showSignInDialog" />
    <pending-dialog :model-value="isShowPendingDialog" />
    <purchase-complete-dialog :model-value="isShowCompleteDialog" />
  </div>
</template>
