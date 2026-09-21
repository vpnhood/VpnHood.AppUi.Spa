<script setup lang="ts">
import AppBar from '@/components/AppBar.vue';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { computed } from 'vue';
import i18n from '@/locales/i18n';
import SettingsToggleItem from '@/components/Settings/SettingsToggleItem.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

// allowAnonymousTracker already gated the backend trackers (the GA4 tracker and the endpoint
// tracker); it had simply never been surfaced, so it was stuck on its default of true and the
// analytics running in this WebView ignored it entirely. Saving it re-reads the settings, which is
// what re-syncs the analytics SDK — see VpnHoodApp.syncAnalyticsConsent.
const isAnonymousTrackerAllowed = computed<boolean>({
  get: () => vhApp.data.userSettings.allowAnonymousTracker,
  set: async (value: boolean) => {
    vhApp.data.userSettings.allowAnonymousTracker = value;
    await vhApp.saveUserSetting();
  }
});

// Both stores want the policy reachable inside the app, not only on the store listing (Apple
// 5.1.1, Play's User Data policy, which names VPN apps), so the button appears on every device that
// has an address to point at. What the tap DOES differs by device - a TV cannot hand a URL to a
// browser, so there it raises a code to scan instead - but that is decided once, in
// VpnHoodApp.onExternalLinkClick, and this page never needs to know which happened.
// A build that ships no policy has nothing to link to and shows no button.
const isShowPrivacyPolicyButton = computed(() => vhApp.privacyPolicyUrl() !== null);
</script>

<template>
  <v-sheet>
    <app-bar/>

    <!-- A build that collects nothing (a fork shipping neither analytics nor a crash reporter) offers no
         consent and makes no claim about data — it keeps only the privacy policy below. -->
    <settings-toggle-item
      v-if="vhApp.data.isAnonymousTrackerSupported"
      v-model="isAnonymousTrackerAllowed"
      :title="locale('ALLOW_ANONYMOUS_TRACKER')"
      :description="locale('ALLOW_ANONYMOUS_TRACKER_DESC')"
    />

    <config-card class="mt-4">
      <v-card-item>
        <p v-if="vhApp.data.isAnonymousTrackerSupported" class="text-body-small text-disabled">
          {{ locale('ANONYMOUS_TRACKER_NOTICE') }}
        </p>

        <v-btn
          v-if="isShowPrivacyPolicyButton"
          class="mt-3 ps-0"
          variant="text"
          color="highlight"
          density="comfortable"
          append-icon="mdi-open-in-new"
          :href="vhApp.privacyPolicyUrl() ?? undefined"
          target="_blank"
          :text="locale('PRIVACY_POLICY')"
        />
      </v-card-item>
    </config-card>

  </v-sheet>
</template>
