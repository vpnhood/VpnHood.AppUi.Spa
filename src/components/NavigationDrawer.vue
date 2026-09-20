<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import router from '@/services/router';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import vuetify from '@/theme/vuetify';
import { UiConstants } from '@/helpers/UiConstants';
import { type RouteLocationRaw} from 'vue-router';
import { ApiException } from '@/services/VpnHood.Client.Api';
import { Util } from '@/helpers/Util';
import SignInDialog from '@/components/User/SignInDialog.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

// "Sign in with X" label for the provider the tap will actually invoke (features.authProviderIds —
// free-form ids self-declared by the app's external auth provider: "google", "apple", or anything a
// third-party provider declares). Convention over branching: a provider's label is its
// SIGN_IN_WITH_<UPPERCASE-ID> i18n key, and an id without one (a fork's provider before it adds the
// key) degrades to the plain "Sign in" instead of leaking a raw key on screen. With more than one
// provider the tap opens the chooser instead, so the label is the plain "Sign in" too.
const showSignInDialog = ref(false);
// The dialog is needed whenever the portal's own password is in play: as a CHOOSER when an identity
// provider sits beside it, and as the email FORM when password is the only method this build has.
// Only an identity provider can be signed into directly — vhApp.signIn() asks for a primary provider
// and password is deliberately not one, so a password-only build that skipped the dialog could never
// sign in at all.
const hasSignInChoice = computed(() => vhApp.hasSignInChoice());
const signInLabelKey = computed(() => {
  const providerId = vhApp.data.features.authProviderIds[0];
  if (!providerId || hasSignInChoice.value) return 'SIGN_IN';
  const key = `SIGN_IN_WITH_${providerId.toUpperCase()}`;
  return i18n.global.te(key) ? key : 'SIGN_IN';
});

const props = defineProps<{
  modelValue: boolean
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const closeByKeyboardEscape = (event: KeyboardEvent) => {
  if (event.code === 'Escape')
    emit('update:modelValue', false);
};

const isCheckForUpdate = ref<boolean>(false);

watch(() => props.modelValue, (newVal) => {
  if (newVal)
    window.addEventListener('keydown', closeByKeyboardEscape);
  else
    window.removeEventListener('keydown', closeByKeyboardEscape);
});

async function diagnose(): Promise<void> {
  emit('update:modelValue', false);
  await vhApp.diagnose();
}

// Displayed as app.major.minor.build + the SPA's build number as the 4th segment, so one string
// identifies both: app "8.0.834" carrying SPA "1.0.975" reads as 8.0.834.975. CI bumps the SPA
// patch on every published build, so that last segment maps to a commit in the WebUI repo.
function mergedAppAndUiVersion(): string {
  const appVersion = vhApp.data.features.version.split('.');
  const uiVersion = import.meta.env.PACKAGE_VERSION?.split('.');
  if (!uiVersion || uiVersion.length < 3) {
    console.error('could not find UI package version.');
    return vhApp.data.features.version;
  }
  return [appVersion[0], appVersion[1], appVersion[2], uiVersion[2]].join('.');
}

// Only CI bumps the SPA version, so on a local build the version above is whatever the last
// published build left behind and cannot prove which bundle is being served. The local build number
// is baked into this bundle and steps by one on every local build, so show it — a stale local build
// becomes obvious instead of silent (vite.config.ts keeps the counter, untracked, per machine).
function localBuildText(): string | null {
  return import.meta.env.SPA_IS_CI_BUILD ? null : `local · build #${import.meta.env.SPA_LOCAL_BUILD_NUMBER}`;
}

async function checkForUpdate() {
  try {
    isCheckForUpdate.value = true;
    await vhApp.checkForUpdate();
  }
  finally {
    isCheckForUpdate.value = false;
    emit('update:modelValue', false);
  }
}

async function onSignIn() {
  // more than one way in (store + the account website's password) → the chooser dialog; the
  // store method stays the primary inside it. One method keeps today's direct flow.
  if (hasSignInChoice.value) {
    emit('update:modelValue', false);
    showSignInDialog.value = true;
    return;
  }
  try {
    emit('update:modelValue', false);
    await vhApp.signIn();
  }
  catch (err: unknown) {
    if (err instanceof ApiException && err.exceptionTypeName === "NoCredentialException")
      throw new Error(locale('GOOGLE_PLAY_LOGIN_NO_CREDENTIAL_ERROR'));
    else
      throw err;
  }
}
async function navigateByRouter(to: RouteLocationRaw){
  await router.replace(to);
}
function edgeToEdgeHeight(bottom: boolean): string{
  if (bottom){
    const paddingBottom = vhApp.data.edgeToEdgeBottomHeight;
    return paddingBottom ? `padding-bottom: ${paddingBottom}px !important;` : '';
  }
  const paddingTop = vhApp.data.edgeToEdgeTopHeight;
  return paddingTop ? `padding-top: ${paddingTop+6}px !important;` : '';
}
</script>

<template>
  <v-navigation-drawer
    @update:modelValue="emit('update:modelValue', $event)"
    :modelValue="props.modelValue"
    :location="vuetify.locale.isRtl.value? 'right' : 'left'"
    color="navigation-drawer"
    class="rounded-te-xl rounded-be-xl overflow-hidden"
    temporary
    disable-route-watcher
    floating
  >
    <!-- Header -->
    <div class="bg-navigation-drawer-header d-flex align-center pa-4" :style="edgeToEdgeHeight(false)">

      <!-- Provisional: the logo carries the product's word, which the look should not choose for
           it; an open question, with the privacy-consent document - the same case. -->
      <v-img
        :src="Util.getAssetPath(vhApp.data.features.uiTheme === 'violet' ? 'VpnHoodConnect-logo.png' : 'VpnHoodClient-logo.png')"
        :eager="true"
        alt="logo"
        max-width="50"
        width="50"
        height="50"
      />

      <div class="ms-3">
        <!-- App name -->
        <h4 dir="ltr" :class="vuetify.locale.isRtl.value? 'text-end' : 'text-start'" class="text-no-wrap">
          {{vhApp.data.features.appName}}
        </h4>

        <!-- App full version -->
        <div class="text-navigation-drawer-version text-body-small">
          <span class="me-2">{{ locale('VERSION') }}:</span>
          <span>{{ mergedAppAndUiVersion() }}</span>
        </div>

        <!-- Local (non-CI) SPA build: show when it was built, to expose a stale bundle -->
        <div v-if="localBuildText()" dir="ltr" class="text-navigation-drawer-version text-body-small opacity-60">
          {{ localBuildText() }}
        </div>
      </div>

    </div>

    <!-- Menu items -->
    <v-list>

      <!-- Go premium -->
      <v-list-item
        v-if="!vhApp.data.isPremiumUser && vhApp.data.isPremiumSupported &&
        vhApp.data.state.clientProfile?.canGoPremium"
        class="border-b"
        @click="navigateByRouter({name: 'PURCHASE_SUBSCRIPTION'})"
      >
        <v-list-item-title>
          <v-icon icon="mdi-crown" />
          <span class="ms-3">{{locale('GO_PREMIUM') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Sign in or account button -->
      <v-list-item
        v-if="vhApp.data.features.isAccountSupported"
        class="border-b"
        @click="vhApp.data.userState.userAccount ? navigateByRouter({name: 'ACCOUNT'}) : onSignIn()"
      >
        <v-list-item-title class="d-flex align-center">
          <v-icon icon="mdi-account" />
          <span class="ms-3 d-flex flex-column">
            <span>{{ locale(vhApp.data.userState.userAccount ? 'ACCOUNT' : signInLabelKey) }}</span>
            <span v-if="vhApp.data.userState.userAccount" class="text-disabled text-body-small text-truncate" style="max-width: 195px">
              {{vhApp.data.userState.userAccount.email}}
            </span>
          </span>
        </v-list-item-title>
      </v-list-item>

      <!-- Settings -->
      <v-list-item
        class="border-b"
        @click="navigateByRouter({name: 'SETTINGS'})"
      >
        <v-list-item-title>
          <v-icon icon="mdi-cog" />
          <span class="ms-3">{{ locale('SETTINGS') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Diagnose -->
      <v-list-item
        class="border-b"
        :disabled="!vhApp.data.state.canDiagnose"
        @click="diagnose()"
      >
        <v-list-item-title>
          <v-icon icon="mdi-stethoscope" />
          <span class="ms-3">{{ locale('DIAGNOSE') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Check for update. Hidden where the app has no updater, and the backend then answers
           versionCheck with NotSupportedException. state.updaterStatus IS the capability signal —
           VpnHoodApp fills it from Services.UpdaterService?.Status, so it is null exactly when no
           updater was configured, and an object on every platform that has one. iOS now has one too:
           it compares against the version published on the App Store and opens the store page, which
           the guidelines allow — what they forbid is downloading/installing code in-app. -->
      <v-list-item
        v-if="vhApp.data.state.updaterStatus"
        class="border-b"
        @click="checkForUpdate()"
      >
        <v-list-item-title>
          <v-progress-circular v-if="isCheckForUpdate" :width="2" :size="21.59" :indeterminate="true" color="highlight" />
          <v-icon v-else icon="mdi-update" />
          <span class="ms-3">{{ locale('CHECK_FOR_UPDATE') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Whats new -->
      <v-list-item
        :nav="true"
        density="compact"
        class="opacity-80 mt-4"
        href="https://github.com/vpnhood/VpnHood/blob/main/CHANGELOG.md"
        @click="emit('update:modelValue',false)"
        target="_blank">

        <v-list-item-title>
          <v-icon icon="mdi-bullhorn" />
          <span class="ms-3 text-body-small">{{ locale('WHATS_NEW') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Send feedback -->
      <v-list-item
        :nav="true"
        density="compact"
        class="opacity-80"
        :href="locale('SEND_FEEDBACK_URL')"
        @click="emit('update:modelValue',false)"
        target="_blank">

        <v-list-item-title>
          <v-icon icon="mdi-message-alert" />
          <span class="ms-3 text-body-small">{{ locale('SEND_FEEDBACK') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Create personal server -->
      <v-list-item
        v-if="vhApp.data.features.isAddAccessKeySupported"
        :nav="true"
        density="compact"
        class="opacity-80"
        href="https://github.com/vpnhood/VpnHood/wiki/VpnHood-Manager"
        @click="emit('update:modelValue',false)"
        target="_blank">

        <v-list-item-title>
          <v-icon icon="mdi-server" />
          <span class="ms-3 text-body-small">{{ locale('CREATE_PERSONAL_SERVER') }}</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Website -->
      <v-list-item
        :nav="true"
        density="compact"
        class="opacity-80"
        :href="UiConstants.websiteUrl"
        @click="emit('update:modelValue',false)"
        target="_blank">

        <v-list-item-title>
          <v-icon icon="mdi-web" />
          <span class="ms-3 text-body-small">vpnhood.com</span>
        </v-list-item-title>
      </v-list-item>

      <!-- Privacy policy. Always reachable: a VPN app must disclose what it collects and how it is
           used (App Review guideline 5.4), and CONNECT's one-time accept screen is not shown in
           CLIENT at all, which left CLIENT with no in-app policy anywhere. -->
      <v-list-item
        v-if="vhApp.privacyPolicyUrl()"
        :nav="true"
        density="compact"
        class="opacity-80"
        :href="vhApp.privacyPolicyUrl() ?? undefined"
        @click="emit('update:modelValue',false)"
        target="_blank">

        <v-list-item-title>
          <v-icon icon="mdi-shield-account" />
          <span class="ms-3 text-body-small">{{ locale('PRIVACY_POLICY') }}</span>
        </v-list-item-title>
      </v-list-item>

    </v-list>

    <!-- Bottom section -->
    <div class="text-center position-fixed bottom-0 w-100" :style="edgeToEdgeHeight(true)">

      <!-- Social icons -->
      <div class="d-flex justify-center ga-3 mb-5">

        <!-- LinkedIn -->
        <v-btn
          icon="mdi-linkedin"
          size="small"
          variant="tonal"
          density="comfortable"
          href="https://www.linkedin.com/company/vpnhood"
          target="_blank"
        />

        <!-- Instagram -->
        <v-btn
          icon="mdi-instagram"
          size="small"
          variant="tonal"
          density="comfortable"
          href="https://www.instagram.com/vpnhood/"
          target="_blank"
        />

        <!-- X; mdi has no X glyph, so the logo is inlined. The padded viewBox reproduces
             the inner margin mdi glyphs have, so it matches the buttons beside it. -->
        <v-btn
          icon
          size="small"
          variant="tonal"
          density="comfortable"
          href="https://x.com/vpnhood"
          target="_blank"
        >
          <v-icon>
            <svg class="v-icon__svg" xmlns="http://www.w3.org/2000/svg" viewBox="-3 -3 30 30">
              <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
            </svg>
          </v-icon>
        </v-btn>
      </div>

      <!-- Powered by button -->
      <!-- Focusable like every other outbound link: a control a D-pad cannot land on does not
           exist, and on a TV this one opens a code to scan rather than a browser. -->
      <a
        class="d-block mb-2 text-body-small text-decoration-none text-active"
        href="https://github.com/vpnhood/VpnHood"
        target="_blank"
      >
        <span class="text-highlight">{{ locale('POWERED_BY') }}</span><br/>
        <span>{{locale('VPNHOOD_ENGINE')}}</span>
        <v-icon icon="mdi-open-in-new" class="ms-1" size="13" />
      </a>
    </div>
  </v-navigation-drawer>

  <!-- The sign-in chooser (store primary, email secondary); teleported, so it outlives the
       drawer closing -->
  <SignInDialog v-model="showSignInDialog" />

</template>
