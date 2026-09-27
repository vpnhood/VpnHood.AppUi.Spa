<script setup lang="ts">
import { Util } from '@/helpers/Util'
import { VpnHoodApp } from '@/services/VpnHoodApp'
import {
  ApiException,
  VpnProfileInfo,
  VpnProfileUpdateParams,
  PatchOfBoolean,
  PatchOfString,
  PatchOfStringOf
} from '@/services/VpnHood.Client.Api';
import { onMounted, ref } from 'vue';
import { ComponentRouteController } from '@/services/ComponentRouteController'
import { ComponentName } from '@/helpers/UiConstants';
import i18n from '@/locales/i18n'
import LocationList from '@/components/Servers/LocationList.vue'
import { ConnectManager } from '@/helpers/ConnectManager';
import ExpansionPanelCollapsed from '@/components/Servers/ExpansionPanelCollapsed.vue';
import router from '@/services/router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const confirmDeleteServerDialogModel = ref(new ComponentRouteController(ComponentName.ConfirmDeleteServerDialog));
const renameServerDialogModel = ref(new ComponentRouteController(ComponentName.RenameServerDialog));
const customEndpointModel = ref(new ComponentRouteController(ComponentName.CustomEndpoint));
const currentVpnProfileInfo = ref<VpnProfileInfo>(new VpnProfileInfo());
const newVpnProfileName = ref<string>("");
const expandedPanels = ref<number[]>([]);
const customEndpoint = ref<string | null>(null);
const isCustomEndpointEnabled = ref<boolean>(true);
const invalidIpError = ref<string | null>(null);

onMounted(() => {
  // Create open state if VPN profile is active or has a single location
  expandedPanels.value = vhApp.data.vpnProfileInfos.map(x => {
     return vhApp.isActiveVpnProfile(x.vpnProfileId) || Util.isSingleLocation(x.locationInfos.length) ?
       0 : 1
  });
});

// Show confirm dialog for delete server
async function showConfirmDeleteDialog(vpnProfileInfo: VpnProfileInfo): Promise<void> {
  currentVpnProfileInfo.value = vpnProfileInfo;
  await confirmDeleteServerDialogModel.value.show();
}

// Delete server by user
async function removeServer(vpnProfileId: string): Promise<void> {
  await confirmDeleteServerDialogModel.value.show(false);
  await vhApp.deleteVpnProfile(vpnProfileId);
}

// Show rename server dialog
async function showRenameDialog(vpnProfileInfo: VpnProfileInfo): Promise<void> {
  currentVpnProfileInfo.value = vpnProfileInfo;
  newVpnProfileName.value = vpnProfileInfo.vpnProfileName;
  await renameServerDialogModel.value.show();
}

// Show endpoint dialog
async function showEndpointDialog(vpnProfileInfo: VpnProfileInfo): Promise<void> {
  currentVpnProfileInfo.value = vpnProfileInfo;
  const endpoint = vpnProfileInfo.customServerEndpoints;
  customEndpoint.value = (endpoint && endpoint.length > 0) ? endpoint[0] : null;
  isCustomEndpointEnabled.value = vpnProfileInfo.isCustomServerEndpointsEnabled;
  invalidIpError.value = null;
  await customEndpointModel.value.show();
}

// Is the profile custom endpoint set and enabled
function isCustomEndpointActive(vpnProfileInfo: VpnProfileInfo): boolean {
  const endpoint = vpnProfileInfo.customServerEndpoints;
  return vpnProfileInfo.isCustomServerEndpointsEnabled && !!endpoint && endpoint.length > 0;
}

// Rename server by user
async function saveNewVpnProfileName(): Promise<void> {
  await renameServerDialogModel.value.show(false);
  await vhApp.updateVpnProfile(currentVpnProfileInfo.value.vpnProfileId, new
    VpnProfileUpdateParams({
    vpnProfileName: new PatchOfString({ value: newVpnProfileName.value })
    })
  );
}

// Change VPN profile custom endpoint
async function saveCustomEndpoint(): Promise<void> {
  try {
    const endpointValue = customEndpoint.value?.trim();
    const newEndpoint = endpointValue ? [endpointValue] : null;
    const params = new VpnProfileUpdateParams({
      customServerEndpoints: new PatchOfStringOf({ value: newEndpoint }),
      isCustomServerEndpointsEnabled: new PatchOfBoolean({ value: isCustomEndpointEnabled.value })
    });
    await vhApp.updateVpnProfile(currentVpnProfileInfo.value.vpnProfileId, params);
    await closeCustomEndpointDialog();
  }
  catch(err: unknown){
    if (err instanceof ApiException) {
      invalidIpError.value = err.message;
      return;
    }
    invalidIpError.value = locale('CUSTOM_ENDPOINT_VALIDATION_ERROR');
  }
}

async function closeCustomEndpointDialog(): Promise<void> {
  await customEndpointModel.value.show(false);
}

function expansionPanelClick(vpnProfileInfo: VpnProfileInfo): void{
  if (!Util.isSingleLocation(vpnProfileInfo.locationInfos.length))
    return;
  ConnectManager.connectWithProfile({vpnProfileId: vpnProfileInfo.vpnProfileId, isDiagnose: false});
}
</script>

<template>
  <v-expansion-panels
    v-for="(vpnProfileInfo, index) in vhApp.data.vpnProfileInfos"
    :key="index"
    v-model="expandedPanels[index]"
    flat
    rounded="xl"
    bg-color="config-card-bg"
    class="mb-4"
  >
    <v-expansion-panel
      :readonly="Util.isSingleLocation(vpnProfileInfo.locationInfos.length)"
      hide-actions
      class="py-4"
      @click="expansionPanelClick(vpnProfileInfo)"
    >

      <!-- Country flag on collapse state -->
      <expansion-panel-collapsed
        v-if="!Util.isSingleLocation(vpnProfileInfo.locationInfos.length) && expandedPanels[index] !== 0"
        @click="expandedPanels[index] = 0"
        :vpn-profile-info="vpnProfileInfo"
      />

      <!-- Profile title row -->
      <template v-slot:title>
        <v-row class="align-center mx-0">

          <!-- Radio button -->
          <v-col cols="auto">
              <!-- Active -->
              <v-icon
                v-if="vhApp.isActiveVpnProfile(vpnProfileInfo.vpnProfileId)"
                icon="mdi-check-circle-outline"
                size="28"
                color="active-profile-radio"
              />

              <!-- Inactive -->
              <v-icon
                v-else
                icon="mdi-circle-outline"
                size="28"
                color="inactive-profile-radio"
                opacity=".6"
              />
          </v-col>

          <!-- Profile name -->
          <v-col class="px-0 text-truncate limited-width-to-truncate">
            <h4
              class="text-truncate text-capitalize"
              :class="{'opacity-60': !vhApp.isActiveVpnProfile(vpnProfileInfo.vpnProfileId)}"
            >
              {{ vpnProfileInfo.vpnProfileName }}
            </h4>
          </v-col>

          <!-- Menu button. Not on the TV UI: everything in it is done from a phone through remote
               access (§3.1 of the TV plan), and a popup menu is a poor fit for a D-pad anyway. -->
          <v-col v-if="!vhApp.data.isTvUi" cols="auto">
            <v-btn :icon="true" density="compact" variant="plain">
              <v-icon>mdi-dots-vertical</v-icon>
              <v-menu activator="parent">
                <!-- Menu items -->
                <v-list>

                  <!-- Rename item -->
                  <v-list-item
                    v-if="!vpnProfileInfo.isBuiltIn"
                    :title="locale('RENAME')" prepend-icon="mdi-pencil"
                    @click="showRenameDialog(vpnProfileInfo)"
                  />
                  <v-divider v-if="!vpnProfileInfo.isBuiltIn"/>

                  <!-- Diagnose item -->
                  <v-list-item
                    :title="locale('DIAGNOSE')"
                    :disabled="!vhApp.data.state.canDiagnose"
                    prepend-icon="mdi-speedometer"
                    @click="ConnectManager.connectWithProfile({vpnProfileId: vpnProfileInfo.vpnProfileId, isDiagnose: true})"
                  />
                  <v-divider v-if="vhApp.data.features.isAddAccessKeySupported"/>

                  <!-- Custom endpoint -->
                  <v-list-item
                    :title="locale('CUSTOM_ENDPOINT')"
                    prepend-icon="mdi-ip-outline"
                    @click="showEndpointDialog(vpnProfileInfo)"
                  />
                  <v-divider />

                  <!-- Starlink Tools: profile scoped like the custom address above it, and a mock
                       page, so it stays behind the /starlink debug command on Android — invisible to anyone
                       who has not typed it into DebugData1, and hidden outright elsewhere -->
                  <template v-if="vhApp.data.isStarlinkToolsEnabled">
                    <v-list-item
                      :title="locale('STARLINK_TOOLS')"
                      prepend-icon="mdi-satellite-uplink"
                      @click="router.push({name: 'STARLINK_TOOLS', query: {vpnProfileId: vpnProfileInfo.vpnProfileId}})"
                    />
                    <v-divider />
                  </template>

                  <!-- Delete item -->
                  <v-list-item v-if="vhApp.data.features.isAddAccessKeySupported"
                               :title="locale('REMOVE')"
                               prepend-icon="mdi-delete"
                               @click="showConfirmDeleteDialog(vpnProfileInfo)"
                  />
                </v-list>
              </v-menu>
            </v-btn>
          </v-col>

          <!-- Expand/Collapse mark. The +/- circles, kept after trying a chevron (the location groups
               beneath already use one as their own mark), the unfold pair and the caret pair. -->
          <v-col v-if="!Util.isSingleLocation(vpnProfileInfo.locationInfos.length)" cols="auto" class="ps-0">
              <v-icon v-if="expandedPanels[index] === 0" size="27" opacity=".6" icon="mdi-minus-circle-outline" />
              <v-icon v-else icon="mdi-plus-circle-outline" opacity=".6" size="27" />
          </v-col>

        </v-row>
      </template>

      <!-- Countries list -->
      <template v-slot:text>
        <LocationList :vpn-profile="vpnProfileInfo"/>
      </template>

      <!-- Support id & redacted host with custom server address badge -->
      <div class="d-flex align-center justify-space-between text-disabled text-body-small px-4 mt-2">
        <span>SID:{{ vpnProfileInfo.supportId }}</span>
        <span class="d-flex align-center ga-1">
          <v-icon v-if="isCustomEndpointActive(vpnProfileInfo)" icon="mdi-ip-network" size="16" />
          {{ vpnProfileInfo.hostNames[0] }}
        </span>
      </div>
    </v-expansion-panel>
  </v-expansion-panels>

  <!-- Rename dialog -->
  <v-dialog v-model="renameServerDialogModel.isVisible" max-width="600">
    <v-card :title="locale('RENAME')" color="general-dialog">

      <v-card-text class="text-general-dialog-text">
        <!-- Name text field -->
        <v-text-field
          v-model="newVpnProfileName"
          spellcheck="false"
          autocomplete="off"
          color="highlight"
          :hint="locale('SAVE_EMPTY_TO_DISPLAY_DEFAULT_NAME')"
          persistent-hint
          :clearable="true">
        </v-text-field>
      </v-card-text>

      <v-card-actions>

        <!-- Cancel button -->
        <v-btn
          :text="locale('CANCEL')"
          @click="renameServerDialogModel.show(false)"
        />

        <!-- Save button -->
        <v-btn :text="locale('SAVE')" @click="saveNewVpnProfileName" variant="plain"/>

      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Endpoint dialog -->
  <v-dialog v-model="customEndpointModel.isVisible" max-width="600">
    <v-card :title="locale('CUSTOM_ENDPOINT')" color="general-dialog">

      <v-card-text class="text-general-dialog-text">
        <!-- Enable/disable custom endpoint -->
        <div class="d-flex align-center justify-space-between">
          <span>{{ locale('CUSTOM_ENDPOINT_ENABLE') }}</span>
          <v-switch v-model="isCustomEndpointEnabled" density="compact" hide-details/>
        </div>

        <!-- IP text field -->
        <v-locale-provider :rtl="false">
          <v-text-field
            v-model="customEndpoint"
            :error-messages="invalidIpError"
            :placeholder="locale('CUSTOM_ENDPOINT_PLACE_HOLDER')"
            spellcheck="false"
            autocomplete="off"
            color="highlight"
            :clearable="true">
          </v-text-field>
        </v-locale-provider>

        <p class="text-body-small mb-2">{{locale('CUSTOM_ENDPOINT_DESC')}}</p>
        <div class="d-flex flex-wrap ga-2">
          <v-chip
            density="compact"
            color="sample-ip-filter-bg"
            size="small"
            class="px-1 border border-opacity-25 text-sample-ip-filter-text"
            style="border-radius: 3px; letter-spacing: 1px;"
            variant="flat"
            text="IPv4: 192.0.2.1:443"
          />
          <v-chip
            density="compact"
            color="sample-ip-filter-bg"
            size="small"
            class="px-1 border border-opacity-25 text-sample-ip-filter-text"
            style="border-radius: 3px; letter-spacing: 1px;"
            variant="flat"
            text="IPv6: [2001:db8::1]:443"
          />
        </div>
      </v-card-text>

      <v-card-actions>

        <!-- Cancel button -->
        <v-btn :text="locale('CANCEL')" @click="closeCustomEndpointDialog()" />

        <!-- Save button -->
        <v-btn :text="locale('SAVE')" @click="saveCustomEndpoint()"/>

      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Confirm delete server dialog -->
  <v-dialog v-model="confirmDeleteServerDialogModel.isVisible">
    <v-card color="general-dialog" :title="locale('WARNING')">

      <v-card-text class="text-general-dialog-text">
        <p class="text-body-small mb-3">{{ locale("CONFIRM_REMOVE_SERVER") }}</p>
        <strong>{{ currentVpnProfileInfo.vpnProfileName }}</strong>
      </v-card-text>

      <!-- Dialog buttons -->
      <v-card-actions>

        <!-- Cancel delete button -->
        <v-btn :text="locale('NO')"
          @click="confirmDeleteServerDialogModel.show(false)"
        />

        <!-- Confirm delete button -->
        <v-btn :text="locale('YES')" @click="removeServer(currentVpnProfileInfo.vpnProfileId)" variant="plain"/>

      </v-card-actions>
    </v-card>
  </v-dialog>

</template>

<style>
/*noinspection CssUnusedSymbol*/
.v-expansion-panel-title__overlay{
  display: none !important;
}
</style>
