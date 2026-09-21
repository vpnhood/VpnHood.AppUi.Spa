<script setup lang="ts">
import i18n from '@/locales/i18n';
import { GooglePlayBillingSubscriptionPeriods } from '@/helpers/googlePlayBilling/GooglePlayBillingSubscriptionPeriods';
import { ApiException, Account, PurchaseParams, SubscriptionPlan } from '@/services/VpnHood.Client.Api';
import { ClientApiFactory } from '@/services/ClientApiFactory';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import PendingDialog from '@/components/PurchaseSubscription/PendingDialog.vue';
import PurchaseCompleteDialog from '@/components/PurchaseSubscription/PurchaseCompleteDialog.vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { Util } from '@/helpers/Util';
import router from '@/services/router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const isShowPurchaseCompleteDialog = ref(false);
const isShowPendingDialog = ref(false);
const basePrice = ref(0);

const props = defineProps<{
  subscriptionPlans: SubscriptionPlan[],
}>();

const oneMonthPlan = props.subscriptionPlans.find(
  plan => plan.period === GooglePlayBillingSubscriptionPeriods.P1M
);

basePrice.value = oneMonthPlan?.basePrice ?? 0;
const selectedPlan = ref<SubscriptionPlan>(oneMonthPlan ?? props.subscriptionPlans[0]);

// Is the signed-in account already served (lifecycle §8) — a store subscription, or the code the
// backend chose for it? A separate function on purpose: onPurchase reads it AFTER signing in, and
// an inline read there would be defeated by TypeScript's control-flow narrowing.
function isAccountServed(): boolean {
  const account: Account | null = vhApp.data.userState.userAccount;
  return !!(account?.subscription || account?.accessCodeInfo);
}

async function onPurchase(): Promise<void> {
  if (!vhApp.data.userState.userAccount) {
    await vhApp.signIn(true);

    // Prevention (lifecycle §8): signing in may have just revealed an account that is already
    // served. Stop here, before the store's payment sheet: after the sheet the money has moved
    // and there is no undo. The app guard re-checks the same question against the server as the
    // last word.
    if (isAccountServed()) {
      await router.replace({ name: 'ACCOUNT' });
      await vhApp.showErrorMessage(locale('HAVE_ACTIVE_SUBSCRIPTION'));
      return;
    }
  }
  const purchaseParams = new PurchaseParams({ planToken: selectedPlan.value.planToken, })
  await purchase(purchaseParams);
}

async function purchase(purchaseParams: PurchaseParams): Promise<void> {
  isShowPendingDialog.value = true;
  try {
    const billingClient = ClientApiFactory.instance.createBillingClient();
    // the store's payment sheet opens on the device the app is on; from a phone managing a TV,
    // that is the TV
    await vhApp.withContinueOnTv(() => billingClient.purchase(purchaseParams));
    await vhApp.loadAccount();

    // Congratulate only what the refreshed account confirms. The store can answer a purchase with
    // a stale transaction whose entitlement has since expired (seen with sandbox's cached
    // transactions); the portal replays it honestly, the account stays unserved, and celebrating
    // over a non-premium page reads as a lie — same rule as RestorePremium.
    if (isAccountServed())
      isShowPurchaseCompleteDialog.value = true;
    else
      await vhApp.showErrorMessage(locale('RESTORED_PURCHASE_EXPIRED_MSG'));
  }
  catch (err){
    console.error(err);
    if (err instanceof ApiException && err.exceptionTypeName === 'AlreadyExistsException'){
      await router.replace({name: 'ACCOUNT'});
      await vhApp.showErrorMessage(locale('HAVE_ACTIVE_SUBSCRIPTION'));
      return;
    }
    throw err;
  }
  finally {
    isShowPendingDialog.value = false;
  }
}

function getPlanTitle(planPeriod: string) {
  switch (planPeriod) {
    case GooglePlayBillingSubscriptionPeriods.P1M: return "1_MONTH";
    case GooglePlayBillingSubscriptionPeriods.P6M: return "6_MONTHS";
    case GooglePlayBillingSubscriptionPeriods.P1Y: return "1_YEAR";
    default: return "UNKNOWN_ERROR";
  }
}

function getPlanPricePeriod(planPeriod: string): string {
  switch (planPeriod) {
    case GooglePlayBillingSubscriptionPeriods.P1M: return "PER_MONTH";
    case GooglePlayBillingSubscriptionPeriods.P6M: return "PER_6_MONTHS";
    case GooglePlayBillingSubscriptionPeriods.P1Y: return "PER_YEAR";
    default: return "UNKNOWN_ERROR";
  }
}

function calcBasePrice(planPeriod: string): number {
  if (!basePrice.value) return 0;
  switch (planPeriod) {
    case GooglePlayBillingSubscriptionPeriods.P6M: return basePrice.value * 6;
    case GooglePlayBillingSubscriptionPeriods.P1Y: return basePrice.value * 12;
    default: return basePrice.value;
  }
}

function calcDiscountPercentage(currentPrice: number, planPeriod: string): number {
  if (!basePrice.value) return 0;
  switch (planPeriod) {
    case GooglePlayBillingSubscriptionPeriods.P6M: return Util.calcPercentage(basePrice.value * 6, currentPrice);
    case GooglePlayBillingSubscriptionPeriods.P1Y: return Util.calcPercentage(basePrice.value * 12, currentPrice);
    default: return Util.calcPercentage(basePrice.value, currentPrice);
  }
}

function isShowDiscount(currentPrice: number, planPeriod: string): boolean {
  if (planPeriod === GooglePlayBillingSubscriptionPeriods.P1M && currentPrice === basePrice.value)
    return false;
  // A plan priced ABOVE the monthly base would render a "--13%"-style double-minus chip. No sane
  // catalog does that, but a strikethrough base price and a negative "discount" must never show.
  return calcDiscountPercentage(currentPrice, planPeriod) > 0;
}

// The plan list scrolls inside a cap (see #planListWrap); a partially visible item alone is an
// easy-to-miss hint, so while anything is still below, the list's bottom edge fades out (the
// .more-below mask). The fade must vanish at the end of the list — a permanent fade would make
// the LAST plan look cut off — hence tracked state rather than static CSS.
const planScroller = ref<HTMLElement | null>(null);
const hasMoreBelow = ref(false);
let scrollerResizeObserver: ResizeObserver | null = null;

function updateScrollHint(): void {
  const el = planScroller.value;
  hasMoreBelow.value = !!el && el.scrollHeight - el.scrollTop - el.clientHeight > 1;
}

onMounted(() => {
  updateScrollHint();
  // The cap is viewport-relative (30vh), so a window resize can change what fits.
  scrollerResizeObserver = new ResizeObserver(updateScrollHint);
  if (planScroller.value) scrollerResizeObserver.observe(planScroller.value);
});
onUnmounted(() => scrollerResizeObserver?.disconnect());
</script>

<template>

    <div
      id="planListWrap"
      ref="planScroller"
      :class="{ 'more-below': hasMoreBelow }"
      @scroll.passive="updateScrollHint"
    >
    <v-list id="planList" mandatory bg-color="transparent" class="py-0">
      <!-- Plan item -->
      <v-list-item
        v-for="(plan, index) in props.subscriptionPlans"
        :key="index"
        :active="plan.planToken === selectedPlan.planToken"
        active-class="border-md border-opacity-100"
        @click="selectedPlan = plan"
        rounded="lg"
        class="border-white py-3 mb-2 border border-opacity-25"
      >

        <!-- Plan title -->
        <v-list-item-title class="d-flex align-center">
          <span>{{ locale(getPlanTitle(plan.period)) }}</span>

          <!-- Discount percentage -->
          <v-chip
            v-if="isShowDiscount(plan.currentPrice, plan.period)"
            :text="`-${calcDiscountPercentage(plan.currentPrice, plan.period)}%`"
            size="small"
            density="comfortable"
            variant="flat"
            color="enable-premium"
            class="ms-3"
          />
        </v-list-item-title>

        <!-- Plan price -->
        <template v-slot:append>
          <div class="d-flex flex-column align-end">

            <!-- Base price -->
            <span
              v-if="isShowDiscount(plan.currentPrice, plan.period)"
              class="text-decoration-line-through text-body-small text-disabled"
              style="line-height: 1"
            >
              {{ plan.currencySymbol }}{{ calcBasePrice(plan.period) }}
            </span>

            <!-- Discounted price -->
            <span class="d-flex align-center text-body-large" style="line-height: 1">
              {{ plan.currencySymbol }}{{ plan.currentPrice }}
              <span class="text-body-small text-disabled ms-1">
                {{ locale(getPlanPricePeriod(plan.period)) }}
              </span>
            </span>

          </div>
        </template>
      </v-list-item>
    </v-list>
    </div>

    <!-- Plan Descriptions -->
    <ul class="text-white opacity-40 ps-4 mb-3 mt-2 text-body-small">
      <li>
        {{ locale('AUTO_RENEW_AT') }}
        {{ selectedPlan.currencySymbol }}{{ selectedPlan.basePrice }}{{
          locale(getPlanPricePeriod(selectedPlan.period ??
            GooglePlayBillingSubscriptionPeriods.P1M)) }}
      </li>
      <!-- Names no store, deliberately: one app ships on every platform and naming a competing one
           is itself a violation (App Review 2.3.10). Neutral copy is true in every store, so there
           is no per-platform branch to keep correct as stores are added. -->
      <li>{{ locale('CANCEL_ANYTIME_IN_STORE') }}</li>
      <!-- App Review 3.1.2 requires BOTH links to be reachable from the purchase screen itself, not
           only from the store listing or the settings page: a reviewer must be able to read the terms
           at the moment money is asked for. Store-neutral like the copy above, so the one build stays
           correct everywhere. -->
      <li v-if="vhApp.termsOfUseUrl() || vhApp.privacyPolicyUrl()">
        <a
          v-if="vhApp.termsOfUseUrl()"
          class="text-white"
          :href="vhApp.termsOfUseUrl() ?? undefined"
          target="_blank"
        >
          {{ locale('TERMS_OF_USE') }}
        </a>
        <span v-if="vhApp.termsOfUseUrl() && vhApp.privacyPolicyUrl()" class="mx-1">&middot;</span>
        <a
          v-if="vhApp.privacyPolicyUrl()"
          class="text-white"
          :href="vhApp.privacyPolicyUrl() ?? undefined"
          target="_blank"
        >
          {{ locale('PRIVACY_POLICY') }}
        </a>
      </li>
    </ul>

    <v-btn
      variant="flat"
      rounded="pill"
      color="purchase-subscription-btn"
      class="text-transform-none font-weight-bold mt-1"
      block
      height="40px"
      :loading="!selectedPlan"
      :disabled="!selectedPlan"
      :text="locale('PURCHASE')"
      @click="onPurchase()"
    />

    <!-- Pending purchase process dialog -->
    <pending-dialog :model-value="isShowPendingDialog" />

    <!-- Purchase complete dialog -->
    <purchase-complete-dialog :model-value="isShowPurchaseCompleteDialog" />

</template>

<!--suppress CssUnusedSymbol -->
<style>
#planList .v-list-item--active > .v-list-item__overlay,
#planList .v-list-item[aria-haspopup=menu][aria-expanded=true] > .v-list-item__overlay{
  opacity: .08;
}
/* The PLAN LIST is the scrollable part of this page, never the page itself: with many plans the
   purchase button and the code/restore rows below must stay on screen. The cap shows ~3 items
   with a sliver of the next as the scroll affordance; with few plans it changes nothing. */
#planListWrap {
  max-height: min(224px, 30vh);
  overflow-y: auto;
  padding-top: 8px; /* replaces the v-list padding (py-0) so the top border is not clipped */
}
/* A discoverable scrollbar: the default one is invisible on this dark gradient. */
#planListWrap::-webkit-scrollbar { width: 4px; }
#planListWrap::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, .25); border-radius: 2px; }
/* More plans below: fade the bottom edge out. Removed at the end of the list (see hasMoreBelow),
   so the last plan never looks amputated. */
#planListWrap.more-below {
  /* Deep on purpose: a shallow fade can land entirely on the margin between cards (the cap is
     viewport-relative, so the cut can align with an item boundary) and become invisible — the
     last visible card must clearly dissolve. */
  -webkit-mask-image: linear-gradient(to bottom, #000 calc(100% - 64px), transparent 100%);
  mask-image: linear-gradient(to bottom, #000 calc(100% - 64px), transparent 100%);
}
</style>
