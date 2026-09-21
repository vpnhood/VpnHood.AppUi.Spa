<script lang="ts" setup>
import { computed, ref } from 'vue';
import AppBar from '@/components/AppBar.vue';
import i18n from '@/locales/i18n';
import { Util } from '@/helpers/Util';
import { UiConstants } from '@/helpers/UiConstants';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { useRoute } from 'vue-router';

// MOCK PAGE. Nothing here is wired to the app: no setting is read or saved, and the find button
// only says so. It exists to show the shape of the feature behind the /starlink debug command; the
// state below is local to the page and dies with it.
//
// VOCABULARY — one word per thing in the CODE: the "relay" is what this page points at (a service
// that forwards requests on to the Starlink router behind it, never a bridge or a proxy), and its
// "endpoint" is the address:port naming one. None of that reaches the SCREEN: the copy speaks of
// "Starlink" and "the address it can be reached at", because relay, endpoint and WAN are words a
// user should never have to learn to fill this page in. Keep new strings in that register.
const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const route = useRoute();

// The relay belongs to one server profile, not to the app: the page is opened from a profile's menu
// and carries that profile's id, so the name below says whose relay is being configured. A page
// reached without one (a hand-typed URL) simply shows no name rather than guessing a profile.
const clientProfileName = computed(() =>
  vhApp.data.clientProfileInfos.find(x => x.clientProfileId === route.query.clientProfileId)?.clientProfileName);

// Which relay to connect to — none, one out on the internet, or one on this LAN.
enum StarlinkRelayMode {
  Disabled = 'disabled',
  Remote = 'remote',
  Local = 'local'
}

const relayMode = ref<StarlinkRelayMode>(StarlinkRelayMode.Disabled);
const remoteEndpoint = ref<string | null>(null);
const localEndpoint = ref<string | null>(null);
const isAutoFind = ref<boolean>(true);

// Options sit an even distance apart; the one that is currently open pulls its own field close, so
// the field reads as part of that option rather than as a fourth item in the list.
function optionSpacing(mode: StarlinkRelayMode): string {
  return relayMode.value === mode ? 'mb-2' : 'mb-5';
}

function findLocalRelay(): void {
  vhApp.showGeneralSnackbar(locale('NOT_IMPLEMENTED_YET'));
}
</script>

<template>
  <v-sheet>
    <app-bar/>

    <!-- Feature image, at the small feature-image height (SmallFeatureImageAndDescription's) rather
         than a full feature page's: this page grows when an option opens its own fields, and the
         taller image pushed the last option's address field and Auto Find off a phone screen. -->
    <v-img
      :src="Util.getAssetPath('starlink.svg')"
      alt="Symbol image"
      width="100%"
      max-height="130px"
      class="mx-auto"
      :aspect-ratio="UiConstants.featureImageAspectRatio"
      :eager="true"
    />
    <div class="mt-2 mb-5 px-3 text-body-small">
      <p class="text-disabled">{{ locale('STARLINK_TOOLS_DESC') }}</p>
      <p v-if="clientProfileName" class="text-highlight">
        {{ locale('STARLINK_TOOLS_PROFILE_SCOPE', {profileName: clientProfileName}) }}
      </p>
    </div>

    <config-card class="pa-3">

      <v-radio-group v-model="relayMode" :hide-details="true" color="highlight">

        <!-- Off -->
        <v-radio v-ripple :value="StarlinkRelayMode.Disabled" class="mb-5">
          <template v-slot:label>
            <div class="d-flex flex-column align-start">
              <span>{{ locale('STARLINK_MODE_DISABLED') }}</span>
              <span class="text-disabled text-body-small">{{ locale('STARLINK_MODE_DISABLED_DESC') }}</span>
            </div>
          </template>
        </v-radio>

        <!-- Remote relay, reached over the internet -->
        <v-radio v-ripple :value="StarlinkRelayMode.Remote" :class="optionSpacing(StarlinkRelayMode.Remote)">
          <template v-slot:label>
            <div class="d-flex flex-column align-start">
              <span>{{ locale('STARLINK_MODE_REMOTE') }}</span>
              <span class="text-disabled text-body-small">{{ locale('STARLINK_MODE_REMOTE_DESC') }}</span>
            </div>
          </template>
        </v-radio>

        <v-locale-provider v-if="relayMode === StarlinkRelayMode.Remote" :rtl="false">
          <v-text-field
            v-model="remoteEndpoint"
            placeholder="192.0.2.1"
            persistent-placeholder
            variant="outlined"
            density="compact"
            rounded="lg"
            color="highlight"
            hide-details="auto"
            clearable
            class="mb-5 ms-8"
          />
        </v-locale-provider>

        <!-- Local relay. Its own controls live outside this group on purpose — see below. -->
        <v-radio v-ripple :value="StarlinkRelayMode.Local" :class="optionSpacing(StarlinkRelayMode.Local)">
          <template v-slot:label>
            <div class="d-flex flex-column align-start">
              <span>{{ locale('STARLINK_MODE_LOCAL') }}</span>
              <span class="text-disabled text-body-small">{{ locale('STARLINK_MODE_LOCAL_DESC') }}</span>
            </div>
          </template>
        </v-radio>

      </v-radio-group>

      <!-- The local option's controls, kept OUT of the radio group above: a checkbox inside a
           v-radio-group joins that group and writes its own value into the group's model, which
           deselects the radio and folds this block away the moment the box is ticked. Local is the
           last option, so rendering the block right after the group looks the same as nesting it. -->
      <div v-if="relayMode === StarlinkRelayMode.Local" class="ms-8">
        <!-- Find sits in the field's append slot: it acts on that endpoint, so it belongs beside it
             rather than a row away. The field keeps the locale provider's LTR direction; the button
             rides along inside it. -->
        <v-locale-provider :rtl="false">
          <v-text-field
            v-model="localEndpoint"
            placeholder="192.0.2.1"
            persistent-placeholder
            variant="outlined"
            density="compact"
            rounded="lg"
            color="highlight"
            hide-details="auto"
            clearable
          >
            <template v-slot:append>
              <btn-style-2
                :text="locale('STARLINK_FIND')"
                size="small"
                @click="findLocalRelay()"
              />
            </template>
          </v-text-field>
        </v-locale-provider>

        <!-- Auto-find fills the endpoint in rather than taking the field over: it stays editable
             either way, so a discovered endpoint can still be corrected by hand. -->
        <v-checkbox
          v-model="isAutoFind"
          :label="locale('STARLINK_AUTO_FIND')"
          density="compact"
          color="highlight"
          hide-details
          class="mt-1"
        />
      </div>

    </config-card>

  </v-sheet>
</template>
