<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp'
import {ComponentRouteController} from "@/services/ComponentRouteController";
import i18n from '@/locales/i18n'
import ExpansionPanel from '@/components/Servers/ExpansionPanel.vue'
import LocationList from '@/components/Servers/LocationList.vue'
import { ComponentName, RemoteAccessHint } from '@/helpers/UiConstants';
import AddServerDialog from '@/components/Servers/AddServerDialog.vue';
import AppBar from '@/components/AppBar.vue';
import { ref } from 'vue';
import { UiConstants } from '@/helpers/UiConstants';
import { AppOsType } from '@/services/VpnHood.Client.Api';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const addServerDialogModel = ref(new ComponentRouteController(ComponentName.AddServerDialog));

// The default copy points a key-less user at VpnHood! CONNECT as a free alternative. That pointer is
// dropped on iOS: its only destination is the website's download page, which offers Android/Android
// TV/Windows/Linux behind Google Play badges and has no iOS build — so on an App Store build it
// advertises something the user cannot install and links on to another mobile platform's store
// (App Review guideline 2.3.10).
//
// Deliberately a SEPARATE key rather than a conditional edit of the shared one: the CONNECT sentence
// is already translated into 12 locales, and any of those still carrying it would put the promo back
// on screen for a non-English iOS user. iOS never reads that key, so it cannot resurface. Until
// vhtranslator runs, the other locales simply fall back to English for this one card.
function getServerKeyMethodsHtml(): string {
  return vhApp.data.features.osType === AppOsType.Ios
    ? locale('GET_SERVER_KEY_METHODS_NO_CONNECT_DESC')
    : locale('GET_SERVER_KEY_METHODS_DESC', { connectAppUrl: UiConstants.connectAppUrl });
}

// A vh:// key is a long base64 blob that no remote can type - the blocker a TV reviewer hits first.
// So on the TV UI this button never opens the key field: it opens the pairing dialog, told to say
// that servers are added and removed from the phone (the per-server menu, with Remove in it, is
// hidden there too). The full UI a phone gets over the LAN has the field and the menu as always.
function onAddServer(): void {
  if (vhApp.data.isTvUi)
    vhApp.showRemoteAccessDialog(RemoteAccessHint.Servers);
  else
    addServerDialogModel.value.show(true).then();
}

</script>

<template>
  <v-sheet>
    <app-bar/>

    <!-- Add server button -->
    <btn-style-2
      v-if="vhApp.data.features.isAddAccessKeySupported"
      class="mb-5"
      block
      variant="tonal"
      min-height="40px"
      :prepend-icon="vhApp.data.isTvUi ? 'mdi-cellphone' : 'mdi-plus-circle'"
      :text="locale(vhApp.data.isTvUi ? 'ADD_OR_REMOVE_SERVERS' : 'ADD_SERVER')"
      @click="onAddServer()"
    />

    <!-- Show alert, if user does not have any server -->
    <div v-if="vhApp.data.features.isAddAccessKeySupported && vhApp.data.clientProfileInfos.length === 0">
      <alert-warning :title="locale('WARNING')" :text="locale('NO_SERVER_AVAILABLE')" class="mb-4" />
      <config-card>
        <div v-html="getServerKeyMethodsHtml()" class="pa-4 text-body-small"></div>
      </config-card>
    </div>

    <!-- Single profile mode -->
    <LocationList v-else-if="vhApp.isSingleProfileMode()" :client-profile="vhApp.data.clientProfileInfos[0]" />

    <!-- Multi profile mode -->
    <ExpansionPanel v-else/>

    <AddServerDialog v-model="addServerDialogModel.isVisible" />
  </v-sheet>
</template>
