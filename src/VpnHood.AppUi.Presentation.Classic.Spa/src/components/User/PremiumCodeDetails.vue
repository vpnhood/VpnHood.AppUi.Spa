<script setup lang="ts">
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { computed, ref } from 'vue';
import { Util } from '@/helpers/Util';
import router from '@/services/router';
import { Validators } from '@/helpers/Validators';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const showCopyIcon = ref(true);
const premiumCode = ref<string | null>(null);
const isRevealed = ref(false);

// Showing the code is its own permission, wider than typing one in: the store that forbids a code
// box does not forbid a buyer from reading the credential their own purchase produced — it is what
// they carry to their other devices (keyring plan §8).
const canShowCode = computed(() =>
  vhApp.data.canViewAccessCode && vhApp.data.state.clientProfile?.hasAccessCode === true);

// A secret stays covered until it is asked for. The mask is the shape of a code, not a redaction of
// this one: nothing about the real digits is on screen before the eye is pressed.
const maskedCode = '••••-••••-••••-••••-••••';
const displayedCode = computed(() => isRevealed.value ? premiumCode.value ?? maskedCode : maskedCode);

// Fetched on demand, never on mount: the raw code leaves the app only when the person asks to see
// it or to copy it, and once fetched it is kept for the life of this screen.
async function loadPremiumCode(): Promise<string | null> {
  if (premiumCode.value !== null)
    return premiumCode.value;

  const clientProfileId = vhApp.data.clientProfileId;
  if (!clientProfileId) {
    premiumCode.value = locale('COULD_NOT_GET_CLIENT_PROFILE_ID');
    return null;
  }

  const code = await vhApp.clientProfileClient.getAccessCode(clientProfileId);
  premiumCode.value = Validators.isEmptyString(code)
    ? locale('COULD_NOT_GET_PREMIUM_CODE')
    : code.match(/.{1,4}/g)?.join('-') ?? '';

  return premiumCode.value;
}

async function toggleReveal(): Promise<void> {
  if (!isRevealed.value)
    await loadPremiumCode();
  isRevealed.value = !isRevealed.value;
}

async function copyPremiumCode(): Promise<void> {
  const code = await loadPremiumCode();
  if (code === null)
    return;

  await navigator.clipboard.writeText(code);
  showCopyIcon.value = false;
  setTimeout(() => {
    showCopyIcon.value = true;
  }, 2000);
}
</script>

<template>
  <config-card>
    <v-card-title>{{locale('PREMIUM_CODE_DETAILS')}}</v-card-title>
    <v-card-text>
      <ul id="premiumCodeInfoList">

        <!-- Code — hidden behind the eye. Shown wherever the operator sells codes, including on a
             build that cannot take a typed one: that person still needs their code for the devices
             where typing it is allowed (keyring plan §8). -->
        <li v-if="canShowCode" class="code-row">
          <span class="text-label-large text-disabled">{{ locale('CODE') }}:</span>
          <span class="text-label-large text-active code-line">
                {{displayedCode}}
                <v-btn
                  size="small"
                  density="comfortable"
                  class="text-disabled"
                  :icon="isRevealed ? 'mdi-eye-off-outline' : 'mdi-eye-outline'"
                  :aria-label="locale(isRevealed ? 'HIDE_CODE' : 'SHOW_CODE')"
                  @click="toggleReveal()"
                />
                <v-btn
                  size="small"
                  density="comfortable"
                  :icon="showCopyIcon ? 'mdi-content-copy' : 'mdi-check'"
                  :class="[showCopyIcon ? 'text-disabled' : 'text-active']"
                  :aria-label="locale('COPY_CODE')"
                  @click="copyPremiumCode()"
                />
              </span>
        </li>

        <template v-if="vhApp.data.state.sessionInfo?.accessInfo">
          <!-- Max Device -->
          <li>
            <span class="text-label-large text-disabled">{{ locale('MAX_DEVICE') }}:</span>
            <span class="text-label-large text-active">
                  {{ vhApp.data.state.sessionInfo.accessInfo.maxDeviceCount > 0
              ? vhApp.data.state.sessionInfo.accessInfo.maxDeviceCount
              : locale('UNLIMITED')}}
                </span>
          </li>

          <!-- Used device -->
          <li>
            <span class="text-label-large text-disabled">{{locale('USED_DEVICE')}}:</span>
            <span v-if="vhApp.data.state.sessionInfo.accessInfo.devicesSummary?.hasMoreDevices" class="text-highlight">
                  {{locale('MORE_THAN_X_DEVICES', {x: vhApp.data.state.sessionInfo.accessInfo.devicesSummary?.deviceCount})}}
                </span>
            <span v-else class="text-highlight">
                  {{ vhApp.data.state.sessionInfo.accessInfo.devicesSummary?.deviceCount }}
                </span>
          </li>

          <!-- Activation time -->
          <li>
            <span class="text-label-large text-disabled">{{ locale('ACTIVATED_ON') }}:</span>
            <span class="text-label-large text-active">
                  {{Util.getShortDate(vhApp.data.state.sessionInfo.accessInfo.createdTime) }}
                </span>
          </li>

          <!-- Expiration time -->
          <li>
            <span class="text-label-large text-disabled">{{ locale('EXPIRATION_DATE') }}:</span>
            <span :class="[vhApp.data.state.sessionInfo.accessInfo.expirationTime ? 'text-error' : 'text-active']">
                  {{ vhApp.data.state.sessionInfo.accessInfo.expirationTime
              ? Util.getShortDate(vhApp.data.state.sessionInfo.accessInfo.expirationTime)
              : locale('NEVER') }}
                </span>
          </li>

          <!-- Last use -->
          <li>
            <span class="text-label-large text-disabled">{{ locale('LAST_USED') }}:</span>
            <span class="text-highlight">
                  {{ Util.getShortDate(vhApp.data.state.sessionInfo.accessInfo.lastUsedTime) }}
                </span>
          </li>
        </template>
      </ul>

      <!-- Why the code is worth reading at all -->
      <p v-if="canShowCode" class="text-body-small text-disabled mt-2 px-2">
        {{ locale('USE_CODE_ON_OTHER_DEVICES') }}
      </p>

      <!-- If disconnected -->
      <div v-if="!vhApp.data.state.sessionInfo?.accessInfo" class="text-center text-body-small text-disabled mt-4">
        <v-icon icon="mdi-information-outline" size="30"/>
        <p class="mt-3">{{locale('DISPLAY_INFO_AFTER_CONNECTION')}}</p>
      </div>

    </v-card-text>

    <!-- More details -->
    <v-card-actions v-if="vhApp.data.state.sessionInfo?.accessInfo">
      <btn-style-1
        class="ms-auto"
        :append-icon="Util.getLocalizedRightChevron()"
        :text="locale('MORE_DETAILS')"
        size="small"
        @click="router.push({name: 'STATISTICS'})"
      />
    </v-card-actions>

  </config-card>
</template>

<style scoped>
#premiumCodeInfoList{
  list-style: none;
}
#premiumCodeInfoList > li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 5px 7px;
}

#premiumCodeInfoList > li:nth-child(odd) {
  /*noinspection CssUnresolvedCustomProperty*/
  background-color: rgb(var(--v-theme-zebra-on-config-card-bg));
}

/* The code plus its two buttons is the one value that can outgrow a narrow screen, and the
   font must not shrink: the row wraps instead, dropping the code under the label as one
   unbreakable unit that keeps its end alignment (margin-inline-start, so RTL mirrors). */
#premiumCodeInfoList > li.code-row {
  flex-wrap: wrap;
}
.code-line {
  display: flex;
  align-items: center;
  white-space: nowrap;
  margin-inline-start: auto;
}
</style>
