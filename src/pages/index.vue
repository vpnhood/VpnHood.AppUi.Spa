<script setup lang="ts">
import { AppConnectionState } from '@/services/VpnHood.Client.Api';
import UpdateSnackbar from '@/components/Home/UpdateSnackbar.vue';
import { ComponentRouteController } from '@/services/ComponentRouteController';
import HomeConnectionInfo from '@/components/Home/HomeConnectionInfo.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import router from '@/services/router';
import { ConnectManager } from '@/helpers/ConnectManager';
import { ComponentName, RemoteAccessHint } from '@/helpers/UiConstants';
import { Util } from '@/helpers/Util';
import { useInitialFocus } from '@/helpers/InitialFocus';
import { computed, ref } from 'vue';
import UserReviewDialog from '@/components/Home/UserReviewDialog.vue';
import BadgeDialog from '@/components/Home/BadgeDialog.vue';
import HomePageHeader from '@/components/Home/HomePageHeader.vue';
import DeveloperDialog from '@/components/Home/DeveloperDialog.vue';
import GoPremiumButton from '@/components/Home/GoPremiumButton.vue';
import HomeBadge from '@/components/Home/HomeBadge.vue';
import ConnectionInfo from '@/components/Home/ConnectionInfo.vue';
import SplitCountryButton from '@/components/Home/SplitCountryButton.vue';
import ServersButton from '@/components/Home/ServersButton.vue';
import SignInDialog from '@/components/User/SignInDialog.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const badgeDialogModel = ref(new ComponentRouteController(ComponentName.BadgeDialog));
// The TV UI's sign-in dialog, through the route so the remote's Back closes it; the drawer, which
// holds the account elsewhere, never opens on a TV.
const signInDialogModel = ref(new ComponentRouteController(ComponentName.SignInDialog));

// The chooser's entry popped first, then the pairing dialog pushed on the page: two routed dialogs
// closing and opening at once race in the history, and a pairing dialog stacked on the chooser
// would leave a person who has just signed in looking at Sign in with Google.
async function onSignInOnPhone(): Promise<void> {
  await signInDialogModel.value.show(false);
  vhApp.showRemoteAccessDialog(RemoteAccessHint.SignIn);
}

async function onAccountClick(): Promise<void> {
  if (vhApp.data.userState.userAccount) {
    await router.push({ name: 'ACCOUNT' });
    return;
  }
  // no store method to press here: the phone is the keyboard, straight to the pairing dialog
  if (!vhApp.primaryProviderId()) {
    vhApp.showRemoteAccessDialog(RemoteAccessHint.SignIn);
    return;
  }
  // the chooser whenever there is something to choose; a lone store method keeps the direct flow,
  // as in the drawer
  if (vhApp.hasSignInChoice())
    await signInDialogModel.value.show();
  else
    await vhApp.signIn();
}
// On a TV the page opens with Connect under the remote; see InitialFocus.
const connectBtnRef = useInitialFocus();
const isShowUserReview = computed((): boolean => vhApp.data.state.userReviewRecommended !== 0);
const isPremiumUser = computed((): boolean => {
  return (vhApp.data.isPremiumSupported && vhApp.data.isPremiumUser) ||
    (vhApp.data.state.sessionInfo?.isPremiumSession === true && vhApp.data.isConnected);
});

let lastConnectPressedTime = Date.now() - 1000;
async function onConnectButtonClick(): Promise<void> {

  // Prevent double click
  if (lastConnectPressedTime >= Date.now() - 1000)
    return;

  lastConnectPressedTime = Date.now();

  // Disconnect
  if (vhApp.data.state.canDisconnect && !vhApp.data.uiState.uiDisconnectInProgress) {
    await vhApp.disconnect();
    return;
  }

  // Connect
  if (vhApp.data.state.canConnect && !vhApp.data.uiState.uiConnectInProgress) {
    await ConnectManager.connectWithCurrentProfile({isDiagnose: false});
  }
}

// Return text for connected button based on connection state
function connectButtonText(): string {
  if (vhApp.data.state.isDiagnosing)
    return locale('STOP_DIAGNOSING');
  else
    switch (vhApp.data.connectionState) {
      case AppConnectionState.Initializing:
        return locale('CANCEL');
      case AppConnectionState.Disconnecting:
        return locale('DISCONNECTING');
      case AppConnectionState.Diagnosing:
        return locale('STOP_DIAGNOSING');
      case AppConnectionState.None:
        return locale('CONNECT');
      default:
        return locale('DISCONNECT');
    }
}
</script>

<template>
  <v-sheet
    id="homeContainer"
    class="position-relative"
    :class="[{'premium-user': isPremiumUser}, vhApp.data.features.uiTheme, vhApp.data.userSettings.cultureCode]"
  >

    <!-- In a landscape viewport the two body columns sit side by side (see the media query in the
         style block); in portrait this stays the single column that space-between spreads down the
         screen. The switch is the viewport's shape, not the device: a TV, an iPad in landscape or
         Stage Manager, and a desktop window are all the same problem. -->
    <v-row
      align-content="space-between"
      justify="center"
      class="fill-height v-row--no-gutters landscape-home"
      :class="{ 'tv-home': vhApp.data.isTvUi }">

      <!-- Home page app bar & Go Premium or Countdown button & home badge -->
      <v-col cols="12" class="home-head">
        <home-page-header/>
        <v-row class="mt-0" align="center">
          <v-col cols="12" class="text-center position-relative">
            <home-badge />
            <go-premium-button/>
          </v-col>
        </v-row>
      </v-col>

      <!-- Speed & Circle & Connect button -->
      <v-col
        cols="12"
        :class="['text-center state-' + [vhApp.data.connectionState.toLowerCase()], 'home-hero']">

        <!-- ConnectionStatistics & Speed -->
        <connection-info />

        <!-- Circle -->
        <home-connection-info tabindex="-1" />

        <!-- Connect button -->
        <v-btn
          id="connectBtn"
          ref="connectBtnRef"
          rounded="pill"
          :tabindex="vhApp.data.isConnected ? '4' : '3'"
          :disabled="vhApp.data.connectionState !== AppConnectionState.None && !vhApp.data.state.canDisconnect"
          class="font-weight-bold mt-5 mb-4"
          :class="[vhApp.data.features.uiTheme,
          { 'connected': vhApp.data.isConnected },
          { 'tv-device': vhApp.data.isTvUi }
          ]"
          :text="connectButtonText()"
          @click="onConnectButtonClick()" />

      </v-col>

      <!-- Config buttons -->
      <v-col cols="12" class="home-config">

        <!-- Servers button -->
        <servers-button/>

        <!-- Split countries -->
        <split-country-button/>

        <!-- App filter button -->
        <home-config-btn
          v-if="vhApp.data.features.isExcludeAppsSupported || vhApp.data.features.isIncludeAppsSupported"
          prepend-icon="mdi-call-split"
          class="mb-1"
          tabindex="7"
          @click="router.push({ name: 'SPLIT_APPS' })"
        >
          <span class="config-btn-title">{{ locale('SPLIT_APPS') }}</span>
          <v-icon :icon="Util.getLocalizedRightChevron()" />

          <!-- Text related to selected option -->
          <span class="config-btn-value text-white text-capitalize text-body-small text-truncate limited-width-to-truncate opacity-50">
            {{ vhApp.data.splitAppsStatusText }}
          </span>
        </home-config-btn>

        <!-- Protocol button -->
        <home-config-btn
          id="protocolButton"
          prepend-icon="mdi-transit-connection-variant"
          tabindex="8"
          class="align-center"
          @click="router.push({ name: 'PROTOCOLS' })"
        >
          <span class="config-btn-title">{{ locale('PROTOCOL_TITLE') }}</span>
          <v-icon :icon="Util.getLocalizedRightChevron()" />

          <!-- Text related to selected option -->
          <span class="config-btn-value text-white text-capitalize text-body-small text-truncate limited-width-to-truncate opacity-50">
            {{ locale(Util.protocolTitle(vhApp.data.activeProtocol)) }}
          </span>

          <!-- Cloak mode -->
          <template v-if="vhApp.data.userSettings.useTcpProxy" v-slot:append>
            <v-chip
              :text="locale('CLOAK')"
              color="white"
              variant="tonal"
              size="small"
              density="compact"
              class="text-capitalize opacity-50 px-2"
              tabindex="-1"
            />
          </template>

        </home-config-btn>

        <!-- Account, TV UI only, for a build with an account: signed out it opens the sign-in dialog
             (where the phone stands in for the email form - see SignInDialog), signed in the
             account page. -->
        <home-config-btn
          v-if="vhApp.data.isTvUi && vhApp.data.features.isAccountSupported"
          id="accountButton"
          prepend-icon="mdi-account-circle"
          tabindex="9"
          class="align-center mt-1"
          @click="onAccountClick()"
        >
          <span class="config-btn-title">{{ locale('ACCOUNT') }}</span>
          <v-icon :icon="Util.getLocalizedRightChevron()" />
          <span class="config-btn-value text-white text-body-small text-truncate limited-width-to-truncate opacity-50">
            {{ vhApp.data.userState.userAccount?.email ?? locale('SIGN_IN') }}
          </span>
        </home-config-btn>

        <!-- Settings, TV UI only. The last row rather than a header button: the rows are the 10-foot
             controls and the one path the remote walks, and on a TV "Settings" means managing the
             app from a phone, which the value line says. Phone and desktop keep the drawer icon. -->
        <home-config-btn
          v-if="vhApp.data.isTvUi && vhApp.isRemoteAccessSupported()"
          id="settingsButton"
          prepend-icon="mdi-cog"
          tabindex="10"
          class="align-center mt-1"
          @click="vhApp.showRemoteAccessDialog()"
        >
          <span class="config-btn-title">{{ locale('SETTINGS') }}</span>
          <v-icon :icon="Util.getLocalizedRightChevron()" />
          <span class="config-btn-value text-white text-body-small text-truncate limited-width-to-truncate opacity-50">
            {{ locale('MANAGE_FROM_YOUR_PHONE') }}
          </span>
        </home-config-btn>

      </v-col>

    </v-row>

    <!-- Components -->
    <UpdateSnackbar v-model="vhApp.data.uiState.showUpdateSnackbar" />
    <UserReviewDialog v-model="isShowUserReview" />
    <badge-dialog v-model="badgeDialogModel.isVisible" />
    <sign-in-dialog v-if="vhApp.data.isTvUi" v-model="signInDialogModel.isVisible" @sign-in-on-phone="onSignInOnPhone()" />
    <developer-dialog v-model="vhApp.data.uiState.isShowDeveloperDialog" />

  </v-sheet>
</template>

<!--suppress CssUnresolvedCustomProperty, CssUnusedSymbol -->
<style scoped>
#homeContainer {
  background: url("/assets/images/body-bg.png"),
    linear-gradient(rgb(var(--v-theme-home-bg-grad-1)), rgb(var(--v-theme-home-bg-grad-2))), no-repeat, center top, fixed;
  background-size: cover;
  position: relative;
  z-index: 0;
}

#homeContainer:before,
#homeContainer:after {
  position: absolute;
  content: '';
  right: 0;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: -1;
  background-size: contain;
  background-repeat: no-repeat;
  background-position-y: top;
  opacity: 0;
  transition: opacity 1s linear;
}

#homeContainer:before {
  background-image: url("/assets/images/premium-bg-left.webp");
  background-position-x: left;
}

#homeContainer:after {
  background-image: url("/assets/images/premium-bg-right.webp");
  background-position-x: right;
}

#homeContainer.premium-user {
  background-image: none;
  background-color: rgb(var(--v-theme-home-bg-grad-2));
}

#homeContainer.premium-user:before,
#homeContainer.premium-user:after {
  opacity: 1;
  transition-duration: 2s;
}

/*-------------------------- Connect button -------------------------*/
/*----------- Disconnected state ----------*/
/* Size here rather than through the v-btn height/min-width props: those render as an inline style,
   which no stylesheet rule can override — the TV size in the landscape query below would never
   apply. Same numbers the props carried. */
#connectBtn {
  height: 40px;
  min-width: 180px;
  transition: all 0.4s ease;
  color: rgb(var(--v-theme-on-connect-btn-disconnected));
}

/*---- blue ----*/
#connectBtn.blue {
  background-image: linear-gradient(to right, rgb(var(--v-theme-connect-btn-disconnected-grad-1)),
      rgb(var(--v-theme-connect-btn-disconnected-grad-2)) 90%) !important;
}

/*---- violet ----*/
#connectBtn.violet {
  background: rgb(var(--v-theme-connect-btn-disconnected-grad-1)) !important;
}

/*---- violet, only on TV ----*/
#connectBtn.violet.tv-device:focus-visible {
  box-shadow: rgb(253 251 155 / 64%) 0 0 18px 0;
  border: rgba(255, 255, 255, 0.38) 1px solid;
  background: #ffd4a8 !important;
}

/*----------- Connected state ----------*/
#connectBtn.connected {
  color: rgb(var(--v-theme-on-connect-btn-connected));
}

/*---- blue ----*/
#connectBtn.blue.connected {
  background-image: linear-gradient(to right, rgb(var(--v-theme-connect-btn-connected)),
      rgb(var(--v-theme-connect-btn-connected)) 90%) !important;
}

/*---- violet ----*/
#connectBtn.violet.connected {
  background: rgb(var(--v-theme-connect-btn-connected)) !important;
}

/*---- violet, only on TV ----*/
#connectBtn.violet.connected.tv-device:focus-visible {
  box-shadow: #a4a3ff 0 0 18px 0;
  border: rgba(255, 255, 255, 0.38) 1px solid;
  background: rgb(162 162 255) !important;
}

/*-------------------------- End of connect button -------------------------*/

.config-item {
  color: rgb(var(--v-theme-on-config-btn-bg));
  background: rgba(var(--v-theme-config-btn-bg), 0.7);
  border: 1px rgba(var(--v-theme-on-config-btn-bg), 0.3) solid;
  min-height: 40px;
  justify-content: start;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.limited-width-to-truncate {
  max-width: calc(100vw - 110px);
}

/*---------------------------- Landscape layout -----------------------------*/
/* Driven by the SHAPE of the viewport, not by which device it is. A television was the first case,
   but iPadOS 26 dropped fixed-orientation apps, so every iPad is resizable and lands here in
   landscape and in Stage Manager too — and a desktop window has always been this shape. One rule
   for all of them; only the 10-foot chrome further down is TV-specific.

   The single portrait column leaves a dead band across the middle of any landscape viewport and
   pushes the config rows below the fold, which is the bug this fixes. */
@media (min-width: 700px) and (orientation: landscape) {
  /* Grid rather than the wrapped flex a v-row normally is: the header takes its own height while
     the body takes ALL the rest, and wrapped flex lines cannot express that — align-content either
     packs both lines at the top (a dead third at the bottom) or splits the height evenly and pushes
     the hero down. `auto 1fr` says it directly.

     Fluid tracks under a capped, centred measure rather than fixed widths: an Android TV panel is
     960 CSS wide at xhdpi and 1280 at tvdpi, an iPad is 1024-1366, and a window can be dragged to
     anything. Fractions keep the columns in proportion at any width; the max-width stops them
     drifting to opposite edges on a wide one. The rows column is the wider of the two because it
     carries text, while the hero is a fixed-aspect circle. */
  .landscape-home {
    max-width: 1180px;
    margin-inline: auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
    grid-template-rows: auto 1fr;
    column-gap: clamp(24px, 4vw, 56px);
    align-items: center;
  }

  /* v-col sizes itself with flex-basis and a max-width that mean nothing to a grid child — the 50%
     from v-col-6 would halve each column a second time inside its own track. */
  .landscape-home > .home-head,
  .landscape-home > .home-hero,
  .landscape-home > .home-config {
    max-width: none;
  }

  /* The header spans both tracks; the body columns take one each. Naming the placement rather than
     leaving it to auto-flow keeps it right if a column is ever hidden on a build. */
  .landscape-home > .home-head {
    grid-column: 1 / -1;
    align-self: start;
  }

  .landscape-home > .home-hero {
    grid-column: 1;
  }

  /* The rows were stretching the full width because they are block buttons in a full-width column. */
  .landscape-home > .home-config {
    grid-column: 2;
    width: 100%;
  }

  /* The value truncates against its own column, not the viewport: the portrait rule assumes a
     full-width row and would never bite here, leaving a long server name to widen the row. */
  .landscape-home > .home-config .limited-width-to-truncate {
    max-width: 280px;
  }

  /* 10-foot only: an iPad or a desktop window is at arm's length and wants the standard control.
     The circle's landscape size lives beside its base rule in general.css. */
  .tv-home #connectBtn {
    height: 52px;
    min-width: 220px;
    font-size: 1.05rem;
  }
}

/*------------------------------- TV chrome ---------------------------------*/
/* Only what a television needs on top of the landscape layout. A good number of panels still crop
   the edges, so the page is inset by the 5% overscan margin (48px x 27px at 1080p) that Android's
   TV guidance asks for. An iPad and a desktop window need none of this. */
/* The overscan inset itself comes from the page root (tv-page, general.css), like every other page. */

/* 10-foot type: the value beside each title is text-body-small, legible on a phone at arm's length
   and not from three metres. The row grows with it. */
.tv-home > .home-config .config-item {
  min-height: 52px;
}

.tv-home > .home-config .config-btn-value {
  font-size: 0.9rem;
}

.config-btn-title,
.config-btn-value {
  padding-inline-start: 2px;
}
</style>

<!--suppress CssUnusedSymbol -->
<style>
.config-item>.v-btn__content {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

#serverButton .v-btn__content,
#excludeCountryButton .v-btn__content,
#protocolButton .v-btn__content,
#accountButton .v-btn__content,
#settingsButton .v-btn__content {
  flex-grow: 1;
  justify-content: start;
}
</style>
