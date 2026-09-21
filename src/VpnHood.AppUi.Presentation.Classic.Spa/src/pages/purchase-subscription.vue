<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ClientApiFactory } from '@/services/ClientApiFactory';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import PremiumFeaturesCarousel from '@/components/PurchaseSubscription/PremiumFeaturesCarousel.vue';
import StoreUnavailable from '@/components/PurchaseSubscription/StoreUnavailable.vue';
import PremiumByCode from '@/components/PurchaseSubscription/PremiumByCode.vue';
import PurchaseByStore from '@/components/PurchaseSubscription/PurchaseByStore.vue';
import RestorePremium from '@/components/PurchaseSubscription/RestorePremium.vue';
import type { AppPurchaseOptions } from '@/services/VpnHood.Client.Api';
import { ComponentRouteController } from '@/services/ComponentRouteController';
import { ComponentName } from '@/helpers/UiConstants';
import { useRoute } from 'vue-router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const route = useRoute();
const purchaseOptions = ref<AppPurchaseOptions>();
const isRetrying = ref(false);
const premiumByCodeSheet = ref(new ComponentRouteController(ComponentName.EnterPremiumCode));

// Named so the store-unavailable card can ask for it again: the catalog comes from the portal and
// nothing stands in for it, so a failed load is only recoverable by loading it again.
async function loadPurchaseOptions(): Promise<void> {
    const clientProfileId = route.query.profileId as string ?? vhApp.data.clientProfileId;
    if (!clientProfileId)
      throw new Error('Client profile id is required.');

    const clientProfileClient = ClientApiFactory.instance.createClientProfileClient();
    purchaseOptions.value = await clientProfileClient.getPurchaseOptions(clientProfileId);
}

async function onRetry(): Promise<void> {
    isRetrying.value = true;
    try {
      await loadPurchaseOptions();
    } finally {
      isRetrying.value = false;
    }
}

onMounted(loadPurchaseOptions);
</script>

<template>
  <grad-sheet class="purchase-page">

      <!-- Back button -->
      <v-btn
        v-if="!vhApp.data.isTvUi"
        :icon="Util.getLocalizedLeftChevron()"
        variant="text"
        width="43px"
        height="43px"
        class="position-absolute mt-3"
        style="z-index: 999; border-radius: 18px; border: 1px solid #ffffff2e;"
        @click="router.go(-1)"
      />

      <!-- Features Carousel. min-height:0 lets this flex child actually shrink on short windows —
           the decorative carousel is what yields, never the plans/actions below (their min-height
           stays auto, so flex cannot crush them). The carousel bounds itself to the shrunken
           space (see #featuresCarousel in PremiumFeaturesCarousel.vue). -->
      <div class="d-flex align-center justify-center flex-grow-1" style="min-height: 0">
        <premium-features-carousel/>
      </div>

    <!-- Show skeleton loader till to load google play info -->
    <v-skeleton-loader
      v-if="!purchaseOptions"
      color="rgba(var(--v-theme-card-on-grad-bg), 0.3)"
      type="heading, subtitle"
      class="mb-4"
      height="125px"
    />

    <!-- Premium by google, web and by code buttons -->
    <div v-else class="mt-4">

      <!-- Purchase by store -->
      <purchase-by-store
        v-if="purchaseOptions?.isStoreAvailable"
        :subscription-plans="purchaseOptions.subscriptionPlans"
      />

      <!-- Store unavailable -->
      <store-unavailable
        v-else-if="purchaseOptions?.storeError"
        :error-message="purchaseOptions.storeError.message"
        :is-retrying="isRetrying"
        @retry="onRetry"
      />

      <!-- Purchase by Web. Offered wherever the address can reach the user: a browser to leave the
           app with, or a code they can scan with their phone. Withheld only where it would be a dead
           end - see VpnHoodApp.isExternalLinkUsable. -->
      <btn-style-1
        v-if="purchaseOptions?.purchaseUrl && vhApp.isExternalLinkUsable()"
        class="mt-4 text-premium-code-btn"
        block
        rounded="pill"
        height="40px"
        color="rgba(var(--v-theme-card-on-grad-bg), 0.3)"
        prepend-icon="mdi-web"
        :text="locale('PURCHASE_VIA_WEB')"
        target="_blank"
        :href="purchaseOptions.purchaseUrl"
      />


      <!-- Premium code button -->
      <btn-style-1
        v-if="purchaseOptions?.canGoPremiumByCode"
        class="mt-4 text-premium-code-btn"
        block
        height="40px"
        rounded="pill"
        color="rgba(var(--v-theme-card-on-grad-bg), 0.3)"
        prepend-icon="mdi-key"
        :text="locale('I_HAVE_A_PREMIUM_CODE')"
        @click="premiumByCodeSheet.show()"
      />

      <!-- Restore what the person already owns. Page level, not inside the store card: it is needed
           most exactly when the store is absent — failed to load, or this build has none. -->
      <restore-premium class="mt-2" />
    </div>

    <!-- Input premium code -->
    <premium-by-code v-model="premiumByCodeSheet.isVisible" />

  </grad-sheet>
</template>

<style scoped>
/* The page's height comes from fill-height (100% of v-main — the layout chain is bound by
   v-layout--full-height and already reserves the edge-to-edge system-bar padding). Never size
   this page to the viewport (100vh/dvh): that inflates the chain past the window by exactly the
   reserved padding, leaving a phantom page scroll on a page with free space. This rule only adds
   the fallback: a window too short for even the actions alone scrolls the page itself — every
   taller window fits because the carousel yields (min-height:0 on its wrapper) and the plan list
   scrolls inside its own cap. */
.purchase-page {
  overflow-y: auto;
}
</style>
