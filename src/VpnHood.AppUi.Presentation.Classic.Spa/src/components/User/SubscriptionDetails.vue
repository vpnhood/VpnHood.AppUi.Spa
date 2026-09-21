<script setup lang="ts">
import { computed, ref } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { ClientApiFactory } from '@/services/ClientApiFactory';
import { SubscriptionManagement } from '@/services/VpnHood.Client.Api';
import i18n from '@/locales/i18n';
import { Util } from '@/helpers/Util';
import { GooglePlayBillingSubscriptionPeriods } from '@/helpers/googlePlayBilling/GooglePlayBillingSubscriptionPeriods';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const subscription = computed(() => vhApp.data.userState.userAccount?.subscription);
const isManaging = ref(false);

// Three answers, not two. "Another store billed it" must name no store (App Review 2.3.10); "not on
// this device" is OUR store, so it may be named and the person sent to a device that can show it.
const canManage = computed(() => subscription.value?.management === SubscriptionManagement.Available);
const isManagedElsewhere = computed(() =>
  subscription.value?.management === SubscriptionManagement.NotOnThisDevice);

// The store shows its own screen; this only asks. It can still fail on a device that claims support
// and then has nothing to open, and failing loudly beats a button that silently does nothing.
async function onManageSubscription(): Promise<void> {
  isManaging.value = true;
  try {
    await ClientApiFactory.instance.createBillingClient().openSubscriptionManagement();
  } finally {
    isManaging.value = false;
  }
}

// The price is what the store charged for ONE period, so it must be labelled with that
// period — a yearly subscription shown as "/month" is simply a wrong number. The period
// is an ISO-8601 duration; anything we have no wording for renders as a bare price
// rather than a wrong or untranslated suffix.
const pricePeriodLabel = computed<string>(() => {
  switch (subscription.value?.billingPeriod) {
    case GooglePlayBillingSubscriptionPeriods.P1M: return locale('PER_MONTH');
    case GooglePlayBillingSubscriptionPeriods.P6M: return locale('PER_6_MONTHS');
    case GooglePlayBillingSubscriptionPeriods.P1Y: return locale('PER_YEAR');
    default: return '';
  }
});
</script>

<template>
  <config-card >
    <v-card-title>{{locale('SUBSCRIPTION_DETAILS')}}</v-card-title>
    <v-card-text>
      <ul id="premiumInfoList">

        <!-- Created time -->
        <li v-if="subscription?.createdTime">
          <span class="text-label-large text-disabled">{{ locale('SUBSCRIBED_SINCE') }}:</span>
          <span class="text-label-large">{{ Util.getShortDate(subscription.createdTime) }}</span>
        </li>

        <!-- Next payment or Expiration time -->
        <li>
            <span class="text-label-large text-disabled">
              {{ subscription?.isAutoRenew ? locale('NEXT_PAYMENT') : locale('EXPIRATION_TIME') }}:
            </span>
          <span :class="[subscription?.isAutoRenew ? 'text-active' : 'text-error', 'text-label-large']">
              {{ Util.getShortDate(subscription?.expirationTime) }}
            </span>
        </li>

        <!-- Auto renew -->
        <li>
          <span class="text-label-large text-disabled">{{ locale('AUTO_RENEW') }}:</span>
          <v-chip
            variant="tonal"
            density="compact"
            :color="subscription?.isAutoRenew ? 'active' : 'error' "
          >
            {{ subscription?.isAutoRenew ? locale('YES') : locale('NO') }}
          </v-chip>
        </li>

        <!-- Price -->
        <li v-if="subscription?.priceAmount != null">
          <span class="text-label-large text-disabled">{{ locale('PRICE') }}:</span>
          <span class="text-label-large">
                <span class="text-body-small text-disabled">{{ subscription.priceCurrency }}</span>
                {{ subscription.priceAmount }}{{ pricePeriodLabel }}
              </span>
        </li>
      </ul>
    </v-card-text>

    <!-- Manage-subscription button. No URL ever reaches here: the app asks the store that billed
         the subscription to show its own screen, natively. So this component knows NO store — no
         hardcoded URLs, no platform branching, nothing for a fork to edit, no way to name another
         platform's store inside an App Store build (App Review 2.3.10/3.1.1) — and no browser has
         to exist on the device, which is what a TV cannot promise. canManage is true only when this
         build's store billed it AND that store can show the screen here; otherwise the neutral
         sentence says to manage it where it was bought. -->
    <v-card-actions v-if="canManage">
      <btn-style-1
        class="ms-auto"
        :append-icon="Util.getLocalizedRightChevron()"
        :text="locale('MANAGE_SUBSCRIPTION')"
        size="small"
        :loading="isManaging"
        @click="onManageSubscription()"
      />
    </v-card-actions>
    <!-- Our own store, on a device that cannot show its screen — a TV. Say where it CAN be done. -->
    <v-card-text v-else-if="isManagedElsewhere" class="text-body-small text-disabled pt-0">
      {{ locale('SUBSCRIPTION_MANAGE_ON_ANOTHER_DEVICE') }}
    </v-card-text>

    <!-- A store this build does not ship to billed it: say so without naming it. -->
    <v-card-text v-else class="text-body-small text-disabled pt-0">
      {{ locale('SUBSCRIPTION_MANAGED_WHERE_PURCHASED') }}
    </v-card-text>

  </config-card>
</template>

<style scoped>
#premiumInfoList{
  list-style: none;
}
#premiumInfoList > li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 7px;
}

#premiumInfoList > li:nth-child(odd) {
  /*noinspection CssUnresolvedCustomProperty*/
  background-color: rgb(var(--v-theme-zebra-on-config-card-bg));
}
</style>
