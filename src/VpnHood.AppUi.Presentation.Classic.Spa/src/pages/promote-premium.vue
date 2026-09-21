<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import PromoteConnectButton from '@/components/Servers/PromoteConnectButton.vue';
import i18n from '@/locales/i18n';
import { computed, onMounted, ref } from 'vue';
import { ClientProfileInfo, ConnectPlanId, ServerLocationOptions } from '@/services/VpnHood.Client.Api';
import { type MyConnectPlanId, MyPlanId } from '@/helpers/PromotePremium/MyConnectPlanIds';
import router from '@/services/router';
import { Util } from '@/helpers/Util';
import { UiConstants } from '@/helpers/UiConstants';
import { useRoute } from 'vue-router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const route = useRoute();

// Query params passed by ConnectManager.showPromoteDialog
const clientProfileId = route.query.clientProfileId as string;
const serverLocation = route.query.serverLocation as string;
const isPremiumLocation = route.query.isPremiumLocation === 'true';

// Page-specific promotion options are loaded here instead of being serialized into the URL.
const locationOptions = ref<ServerLocationOptions | null>(null);

onMounted(async () => {
  const clientProfileInfo: ClientProfileInfo = await vhApp.clientProfileClient.get(clientProfileId);

  // Resolve the selected location again so this page stays driven by current server data.
  locationOptions.value = clientProfileInfo.locationInfos.find(
    x => x.serverLocation === serverLocation)?.options ?? null;
});
const promotionImageUrl: string = vhApp.data.serverUrl + UiConstants.promotionFileLocation;

// The title changes depending on whether the selected target is premium or free.
const dialogTitle = computed<string>(() => isPremiumLocation
  ? locale('SELECTED_LOCATION_IS_PREMIUM') : locale('SELECTED_LOCATION_IS_FREE'));

function isFreeAvailable(){
  // A free fallback is available only when the selected target is not premium-only.
  return !isPremiumLocation && locationOptions.value?.normal !== null && locationOptions.value?.normal !== undefined;
}

function isFreeByRewardedAdAvailable(){
  // Same free fallback, but unlocked by a rewarded ad. 0 means uninterrupted access, so only null/undefined hides it.
  return !isPremiumLocation && locationOptions.value?.normalByRewardedAd !== null &&
    locationOptions.value?.normalByRewardedAd !== undefined;
}

async function actionByConnectPlan(planId: MyConnectPlanId): Promise<void> {
  // Open the PurchaseSubscription page
  if (planId === MyPlanId.premiumByPurchase || planId === MyPlanId.premiumByCode){
    await router.push({name: 'PURCHASE_SUBSCRIPTION', query: {profileId: clientProfileId}});
    return;
  }

  try {
    // All other actions continue with a direct connect attempt using the current route context.
    await vhApp.connect({clientProfileId, serverLocation, isPremium: isPremiumLocation, planId, isDiagnose: false});
  }
  catch{
    // Ignore message
  }

}

</script>

<template>
  <grad-sheet>

    <div>
      <!-- Back button -->
      <v-btn
        v-if="!vhApp.data.isTvUi"
        :icon="Util.getLocalizedLeftChevron()"
        variant="text"
        width="43px"
        height="43px"
        class="mt-3"
        style="border-radius: 18px; border: 1px solid #ffffff2e;"
        @click="router.go(-1)"
      />

      <h3 class="text-center" v-html="dialogTitle" />
    </div>

      <v-img
        v-if="vhApp.data.state.promotionExists"
        :eager="true"
        :src="promotionImageUrl"
        alt="Servers Icon"
        width="100%"
        max-width="500px"
        class="mx-auto"
        @click="actionByConnectPlan(MyPlanId.premiumByPurchase)"
      />
      <v-img v-else
        :eager="true"
        :src="Util.getAssetPath(isPremiumLocation ? 'premium-servers.webp' : 'free-to-premium-servers.webp')"
        alt="Servers Icon"
        width="100%"
        max-width="500px"
        class="mx-auto"
      />

      <div>

        <!-- Continue as Free -->
        <v-row v-if="isFreeAvailable()"
           dense
           v-ripple
           :autofocus="vhApp.data.isTvUi"
           align="center"
           class="px-2 py-1 mx-0 rounded-lg card-on-grad-bg"
           tabindex="1"
           @click="actionByConnectPlan(ConnectPlanId.Normal)"
        >
          <v-col>
            <h4 class="text-capitalize">{{locale('SELECTED_FREE_SERVER')}}</h4>
            <p class="text-white opacity-40 text-body-small" style="line-height: 1.3">
              {{ locationOptions?.normal === 0 ? locale('SELECTED_FREE_SERVER_DESC')
              : locale('SELECTED_FREE_SERVER_UNLIMITED_DESC', {minutes: locationOptions?.normal}) }}
            </p>
          </v-col>
          <v-col cols="auto" class="pe-0 action-btn">
            <v-chip
              variant="flat"
              color="btn-style-2"
              class="font-weight-bold"
              size="small"
              tabindex="-1"
              :text="locale('CONNECT')"
            />
          </v-col>
        </v-row>

        <!-- Free server unlocked by a rewarded ad (longer/uninterrupted free session) -->
        <v-row v-if="isFreeByRewardedAdAvailable()"
           dense
           v-ripple
           align="center"
           class="px-2 py-1 mx-0 mt-3 rounded-lg card-on-grad-bg"
           tabindex="1"
           @click="actionByConnectPlan(ConnectPlanId.NormalByRewardedAd)"
        >
          <v-col>
            <h4 class="text-capitalize">{{locale('SELECTED_FREE_SERVER_BY_REWARDED_AD')}}</h4>
            <p class="text-white opacity-40 text-body-small">
              {{ locationOptions?.normalByRewardedAd === 0 ? locale('SELECTED_FREE_SERVER_BY_REWARDED_AD_UNLIMITED_DESC')
              : locale('SELECTED_FREE_SERVER_BY_REWARDED_AD_DESC', {minutes: locationOptions?.normalByRewardedAd}) }}
            </p>
          </v-col>
          <v-col cols="auto" class="pe-0 action-btn">
            <v-chip
              variant="flat"
              color="btn-style-2"
              class="font-weight-bold"
              size="small"
              tabindex="-1"
              :text="locale('CONNECT')"
            />
          </v-col>
        </v-row>

        <!-- Divider -->
        <div v-if="isFreeAvailable()" class="d-flex align-center justify-center w-50 my-5 mx-auto">
          <div class="w-100 border-b border-active border-opacity-25"></div>
          <span class="position-relative text-active h3 px-2">{{locale('OR')}}</span>
          <div class="w-100 border-b border-active border-opacity-25"></div>
        </div>

        <!-- Watch rewarded ad -->
        <promote-connect-button
          v-if="locationOptions?.premiumByRewardedAd"
          tabindex="1"
          icon="mdi-play-box-lock-open-outline"
          :title="locale('WATCH_REWARDED_AD')"
          :description="locale('WATCH_REWARDED_AD_DESC', {minutes: locationOptions?.premiumByRewardedAd})"
          :button-text="locale('CONNECT')"
          :button-action-plan="ConnectPlanId.PremiumByRewardedAd"
          @action-by-plan="actionByConnectPlan"
        />

        <!-- Try premium -->
        <promote-connect-button
          v-if="locationOptions?.premiumByTrial"
          tabindex="1"
          icon="mdi-timer-lock-open-outline"
          :title="locale('TRY_PREMIUM')"
          :description="locale('TRY_PREMIUM_DESC', {minutes: locationOptions?.premiumByTrial})"
          :button-text="locale('CONNECT')"
          :button-action-plan="ConnectPlanId.PremiumByTrial"
          @action-by-plan="actionByConnectPlan"
        />

        <!-- Go premium -->
        <promote-connect-button
          v-if="locationOptions?.premiumByPurchase || locationOptions?.premiumByCode"
          tabindex="1"
          icon="mdi-crown-circle-outline"
          :title="locale('GO_PREMIUM')"
          :description="locale('GO_PREMIUM_DESC')"
          :button-text="locale('UPGRADE')"
          :button-action-plan="MyPlanId.premiumByPurchase"
          @action-by-plan="actionByConnectPlan"
        />

      </div>

  </grad-sheet>
</template>
