<script setup lang="ts">
import { ref, toRef, watch } from 'vue';
import i18n from '@/locales/i18n';
import { ProxyEndPoint, ProxyProtocol } from '@/services/VpnHood.Client.Api';
import { Validators } from '@/helpers/Validators';

const locale = i18n.global.t;

const props = defineProps<{
  proxyEndPoint: ProxyEndPoint,
  fieldRules: { host: () => true|string; port: () => true|string }
}>()
const emit = defineEmits<{
  (e: 'process-host-field'): void
}>()

const protocolItems = [
  { value: ProxyProtocol.Http, title: 'http' },
  { value: ProxyProtocol.Https, title: 'https' },
  { value: ProxyProtocol.Socks4, title: 'socks4' },
  { value: ProxyProtocol.Socks5, title: 'socks5' }
];

const proxy = toRef(props, 'proxyEndPoint');
const isShowAuthenticationFields = ref(!Validators.isEmptyString(proxy.value.username) ||
  !Validators.isEmptyString(proxy.value.password));

// Reset username and password field when the isShowAuthenticationFields switch state changed
watch(isShowAuthenticationFields, async (newVal, oldVal) => {
  if (oldVal && !newVal) {
    proxy.value.username = '';
    proxy.value.password = ''
  }
});
</script>

<template>

  <div class="d-flex align-center justify-space-between">
    <span>{{ locale('ENABLED') }}</span>
    <v-switch v-model="proxy.isEnabled" density="compact" hide-details />
  </div>

  <v-text-field
    v-model="proxy.host"
    :label="locale('PROXY_HOST')"
    @blur="emit('process-host-field')"
    :rules="[props.fieldRules.host]"
    hide-details="auto"
    variant="outlined"
    density="comfortable"
    clearable
    rounded="lg"
    color="highlight"
    class="mt-5"
  />

  <v-text-field
    v-model.number="proxy.port"
    :label="locale('PROXY_PORT')"
    :rules="[props.fieldRules.port]"
    hide-details="auto"
    type="number"
    variant="outlined"
    density="comfortable"
    clearable
    rounded="lg"
    color="highlight"
    class="my-4"
  />

  <v-select
    v-model="proxy.protocol"
    :items="protocolItems"
    item-title="title"
    item-value="value"
    variant="outlined"
    density="comfortable"
    rounded="lg"
    color="highlight"
    :label="locale('PROXY_PROTOCOL')"
  />

  <div class="d-flex align-center justify-space-between">
    <span>{{ locale('AUTHENTICATION') }}</span>
    <v-switch v-model="isShowAuthenticationFields" density="compact" hide-details/>
  </div>

  <template v-if="isShowAuthenticationFields">
    <v-text-field
      v-model="proxy.username"
      :label="locale('PROXY_USERNAME')"
      hide-details="auto"
      variant="outlined"
      density="comfortable"
      clearable
      rounded="lg"
      color="highlight"
      class="mt-4"
    />

    <v-text-field
      v-model="proxy.password"
      :label="locale('PROXY_PASSWORD')"
      hide-details="auto"
      variant="outlined"
      density="comfortable"
      clearable
      rounded="lg"
      color="highlight"
      class="mt-4"
    />
  </template>
</template>
