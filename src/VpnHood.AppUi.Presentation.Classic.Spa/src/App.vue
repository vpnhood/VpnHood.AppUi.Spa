<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { ComponentRouteController } from './services/ComponentRouteController';
import { ComponentName } from '@/helpers/UiConstants';
import ErrorDialog from "@/components/ErrorDialog/ErrorDialog.vue";
import LoadingDialog from "@/components/LoadingDialog.vue";
import ContinueOnTvDialog from '@/components/ContinueOnTvDialog.vue';
import ManagingTvBanner from '@/components/ManagingTvBanner.vue';
import PrivacyPolicy from "@/pages/privacy-policy.vue";
import NavigationDrawer from "@/components/NavigationDrawer.vue";
import GeneralSnackbar from '@/components/GeneralSnackbar/GeneralSnackbar.vue';
import vuetify from '@/theme/vuetify';
import ConfirmDialog from '@/components/ConfirmDialog/ConfirmDialog.vue';
import OpenOnPhoneDialog from '@/components/OpenOnPhoneDialog/OpenOnPhoneDialog.vue';
import RemoteAccessDialog from '@/components/RemoteAccessDialog/RemoteAccessDialog.vue';
import EngineErrorDialog from '@/components/EngineErrorDialog.vue';
import ReconnectRequiredAlert from '@/components/ReconnectRequiredAlert.vue';
import { AxiosError } from 'axios';
import router from '@/services/router';
import { focusFirstControl } from '@/helpers/InitialFocus';
import { installSpatialNavigation } from '@/helpers/SpatialNavigation';

const vhApp = VpnHoodApp.instance;
const showEngineErrorDialog = ref(false);
const consecutiveConnectionRefusedCount = ref(0);
const errorDialogModel = ref(new ComponentRouteController(ComponentName.ErrorDialog));
const navigationDrawerModel = ref(new ComponentRouteController(ComponentName.NavigationDrawer));
const openOnPhoneDialogModel = ref(new ComponentRouteController(ComponentName.OpenOnPhoneDialog));
const remoteAccessDialogModel = ref(new ComponentRouteController(ComponentName.RemoteAccessDialog));

// The desktop window frame: a width cap and a border that make a phone-column page presentable in
// a window that can be resized to any width. A television is a fixed 16:9 panel, so there the frame
// only costs width (160px a side at 1280) and paints its border into the overscan zone. Only the
// frame goes on a TV: maxWidthOnLargeScreen itself stays, and the dialogs that size to it are untouched.
const isFramed = computed(() => !vuetify.display.smAndDown.value && !vhApp.data.isTvUi);

// On a TV every page arrives with a control under the remote (see InitialFocus). Hooked to the
// transition's after-enter rather than the router's afterEach: with mode="out-in" the incoming page
// mounts only once the outgoing one has left, and nothing can take focus before it is laid out.
// The first page has no transition to finish, so it is handled once the router has resolved it.
const mainRef = ref<{ $el: HTMLElement } | null>(null);
function onPageEntered(): void {
  if (mainRef.value)
    focusFirstControl(mainRef.value.$el);
}

const isShowErrorDialog = computed<boolean>({
  get: () => {
    return errorDialogModel.value.isVisible;
  },
  set: async (value: boolean) => {
    if (value) return; // Already is Open
    await errorDialogModel.value.show(value);
  }
})

const isShowPrivacyPolicyDialog = computed<boolean>({
  get: () => {
    // The HEAD decides whether acceptance is required: a website download has shown the user nothing
    // beforehand, while a store build's user already accepted the store's own agreement. Never
    // inferred from which product this is. See AppOptions.IsLicenseAgreementRequired.
    if (!vhApp.data.features.isLicenseAgreementRequired)
      return false;

    return !vhApp.data.userSettings.isLicenseAccepted;
  },
  set: async (value: boolean) => {
    VpnHoodApp.instance.data.userSettings.isLicenseAccepted = value;
    await VpnHoodApp.instance.saveUserSetting();
  }
})

// The mechanism behind VpnHoodApp.onExternalLinkClick, which is where the policy lives. One
// document-level listener rather than a handler on each link: the invariant is "no external link is
// ever a dead end", and a per-link handler only holds until someone adds link number thirteen.
// Capture phase, because this has to beat the anchor's own navigation. A D-pad's Enter on a focused
// link arrives as a click too, so keyboard activation needs nothing extra.
// Same-origin and non-http hrefs are skipped: the app's own web server serves the SPA and the
// diagnostic log, and neither is any use on somebody else's phone.
function onExternalLinkClick(event: MouseEvent): void {
  const target = event.target;
  if (!(target instanceof Element)) return;

  const anchor = target.closest('a[href]');
  if (!(anchor instanceof HTMLAnchorElement)) return;
  if (anchor.protocol !== 'http:' && anchor.protocol !== 'https:') return;
  if (anchor.origin === window.location.origin) return;

  // The link's own label is the phrase the user just read, so it names the dialog better than
  // anything a call site could pass; an icon-only link falls back to its accessible name, then to
  // no heading at all.
  const title = anchor.innerText.trim() || anchor.getAttribute('aria-label') || '';
  vhApp.onExternalLinkClick(event, anchor.href, title);
}

const isConnectionRefused = (error: unknown): boolean => {
  return error instanceof AxiosError && error.code === 'ERR_NETWORK';
}

onMounted(async () => {
  document.addEventListener('click', onExternalLinkClick, true);
  installSpatialNavigation(); // the D-pad on the TV UI
  router.isReady().then(() => nextTick(onPageEntered));

  // Reload 'state' every 1 second if the app window is focused.
  setInterval(async () => {

    if (document.hidden)
      return;

    try {
      await vhApp.reloadState();
      vhApp.data.edgeToEdge();
      consecutiveConnectionRefusedCount.value = 0;
      showEngineErrorDialog.value = false;
    } catch (error: unknown) {
      if (isConnectionRefused(error)) {
        consecutiveConnectionRefusedCount.value++;
        showEngineErrorDialog.value = consecutiveConnectionRefusedCount.value >= 2;
      } else {
        consecutiveConnectionRefusedCount.value = 0;
      }
    }

  }, 1000);

  // Get the user account
  if (vhApp.data.features.isAccountSupported)
    await vhApp.loadAccount();
})
</script>

<template>
  <!-- tv-device on the root so a single stylesheet rule can give every focusable control the
       10-foot focus ring; nothing has to opt in per component. -->
  <v-app :class="{ 'px-15': isFramed, 'tv-device': vhApp.data.isTvUi }" class="bg-app-bg">

    <v-layout width="100%" :max-width="isFramed ? vhApp.data.uiState.maxWidthOnLargeScreen : undefined" full-height class="mx-auto"
      :class="{ 'border border-highlight border-opacity-50 elevation-3 rounded-lg my-5': isFramed }">

      <!-- Not on the TV UI: the drawer is the door to the pages the phone does (proxies, DNS,
           the split lists), and Vuetify's temporary drawer opens on a swipe from the edge, so a
           touch TV or a desktop in TV mode could still open it. The home row is Settings there. -->
      <NavigationDrawer v-if="!vhApp.data.isTvUi" v-model="navigationDrawerModel.isVisible" />

      <!-- DO NOT REMOVE 'full-height' to support legacy browsers -->
      <!-- position-relative anchors the overlaid reconnect-required bar to this element -->
      <v-main ref="mainRef" class="fill-height position-relative">

        <!-- A browser on the network driving a TV: says so, on every page -->
        <managing-tv-banner />

        <!-- Reconnect required bar -->
        <reconnect-required-alert />

        <!-- Privacy policy page -->
        <PrivacyPolicy v-if="isShowPrivacyPolicyDialog" @accept="isShowPrivacyPolicyDialog = true" />

        <!-- 'out-in' keeps exactly one page laid out at any moment. Overlapping the two is faster on
             paper but puts two full-page sheets in the same box: the outgoing one has to leave the
             flow, which re-flows it against the incoming page's height, and while both are part-way
             transparent they ghost through each other. The responsiveness is bought back with short
             durations and a press state that lands before the navigation, not with an overlap. -->
        <router-view v-else v-slot="{ Component, route }">
          <transition :name="route.meta.transition?.toString()" mode="out-in" @after-enter="onPageEntered">
            <!-- tv-page falls through to each page's root element, so one stylesheet rule gives
                 every page the overscan inset and a reading measure (general.css, TV section)
                 without any page opting in. -->
            <component :is="Component" :class="{ 'tv-page': vhApp.data.isTvUi }" />
          </transition>
        </router-view>

      </v-main>

      <!-- Global Loading dialog -->
      <loading-dialog v-model="vhApp.data.uiState.showLoadingDialog" />

      <!-- A step whose UI is on the TV, seen from the browser that asked for it -->
      <continue-on-tv-dialog v-model="vhApp.data.uiState.showContinueOnTvDialog" />

      <!-- Global alert dialog -->
      <error-dialog v-model="isShowErrorDialog" />

      <!-- Engine error dialog -->
      <engine-error-dialog v-model="showEngineErrorDialog" />

      <!-- Global snackbar -->
      <general-snackbar v-model="vhApp.data.uiState.generalSnackbarState.isShow" />

      <!-- General confirm dialog -->
      <confirm-dialog v-model="vhApp.confirmDialogModel.isVisible" />

      <!-- Shown in place of following an outbound link on a device that cannot open one - see
           VpnHoodApp.onExternalLinkClick. Mounted once here, beside the other global dialogs,
           because every link in the app shares it. -->
      <open-on-phone-dialog v-model="openOnPhoneDialogModel.isVisible" />
      <remote-access-dialog v-model="remoteAccessDialogModel.isVisible" />

    </v-layout>
  </v-app>
</template>

<!--suppress CssUnusedSymbol -->
<style>
/* transform and opacity only, never 'all': 'all' makes the engine interpolate every property that
   differs between the two pages, which is what turns a viewport-sized transition into jank on a
   mid-range phone. Both are compositor-friendly.

   Under 'out-in' these two run back to back, so their sum is the whole wait between the tap and the
   page being there — keep it short. */
.translate-with-fade-enter-active,
.short-translate-enter-active {
  transition: transform 0.13s ease, opacity 0.13s ease;
}

.translate-with-fade-leave-active,
.short-translate-leave-active {
  transition: transform 0.09s ease, opacity 0.09s ease;
}

.translate-with-fade-enter-from {
  opacity: 0;
  transform: translateY(50px);
}

.translate-with-fade-leave-to {
  opacity: 0;
}

.short-translate-enter-from {
  transform: translateY(-30px);
  opacity: 0;
}

.short-translate-leave-to {
  opacity: 0;
  transform: translateY(50px);
}
</style>
