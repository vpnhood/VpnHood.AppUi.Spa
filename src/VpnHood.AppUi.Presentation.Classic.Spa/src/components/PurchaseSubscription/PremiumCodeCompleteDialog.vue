<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { Util } from '@/helpers/Util';
import { computed } from 'vue';
import router from '@/services/router';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean,
}>();

const isNewCode = computed(() =>
  VpnHoodApp.instance.data.state.sessionInfo?.accessInfo?.isNew
);

const premiumCodeDeviceCount = computed(() =>
  VpnHoodApp.instance.data.state.sessionInfo?.accessInfo?.devicesSummary?.deviceCount || 0
);

const premiumCodeActivationDate = computed(() =>
  VpnHoodApp.instance.data.state.sessionInfo?.accessInfo?.createdTime
);

const premiumCodeExpirationDate = computed(() =>
  VpnHoodApp.instance.data.state.sessionInfo?.accessInfo?.expirationTime
);

</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    :persistent="true"
  >
    <v-card color="active">

      <v-card-title class="text-center pt-4">
        <v-icon class="text-display-medium">mdi-party-popper</v-icon>
        <h2>{{ locale('CONGRATULATIONS') }}</h2>
      </v-card-title>

      <v-card-text>
        <p>{{ locale('PREMIUM_CODE_PROCESS_IS_COMPLETE_MESSAGE') }}</p>

        <!-- TODO: use theme color -->
        <v-alert
          variant="flat"
          color="#17083d"
          density="compact"
          rounded="lg"
          class="text-body-small mt-4"
        >

          <span v-if="!isNewCode && premiumCodeDeviceCount > 1" class="mb-2">
            {{ locale('ALERT_FOR_USED_PREMIUM_CODE_MORE_THAN_ONE_DEVICE') }}
          </span>

          <ul id="activationInfo"
              :class="[premiumCodeDeviceCount && premiumCodeDeviceCount > 1 ? 'text-error' :
              'text-active']"
              style="list-style: none;"
          >

            <li v-if="premiumCodeActivationDate">
              <span>{{ locale('ACTIVATED_ON') }}:</span>
              <span>{{ Util.getShortDate(premiumCodeActivationDate) }}</span>
            </li>

            <li v-if="premiumCodeExpirationDate">
              <span>{{ locale('EXPIRATION_DATE') }}:</span>
              <span>{{ Util.getShortDate(premiumCodeExpirationDate) }}</span>
            </li>

            <li v-if="premiumCodeDeviceCount && premiumCodeDeviceCount > 1">
              <span>{{ locale('USED_DEVICE') }}:</span>
              <span class="text-lowercase">{{ premiumCodeDeviceCount }}</span>
            </li>

          </ul>

        </v-alert>

      </v-card-text>

      <v-card-actions>

        <v-btn
          v-if="vhApp.data.isConnected"
          :text="locale('STATISTICS')"
          @click="router.replace({name: 'STATISTICS'})"
        />
        <v-btn
          :text="locale('CLOSE')"
          variant="plain"
          @click="router.replace({name: 'HOME'})"
        />

      </v-card-actions>

    </v-card>
  </v-dialog>
</template>

<style scoped>
#activationInfo > li {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
