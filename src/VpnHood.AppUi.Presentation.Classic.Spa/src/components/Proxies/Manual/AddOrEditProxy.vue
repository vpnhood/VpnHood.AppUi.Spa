<script setup lang="ts">
import { AppProxyEndPointInfo, ProxyEndPoint, type ProxyEndPointStatus } from '@/services/VpnHood.Client.Api';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import i18n from '@/locales/i18n';
import { ProxySheetType } from '@/components/Proxies/ProxyUtils';
import { computed, ref, toRef, watch } from 'vue';
import { Validators } from '@/helpers/Validators';
import ProxyFields from '@/components/Proxies/Manual/ProxyFields.vue';
import ProxyStatus from '@/components/Proxies/Manual/ProxyStatus.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean,
  proxyType: ProxySheetType,
  selectedProxyEndPoint: ProxyEndPoint,
  proxyStatus: ProxyEndPointStatus | null
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
  (e: 'refreshList'): void;
}>();

const proxy = toRef(props, 'selectedProxyEndPoint');
const isFieldDirty = ref(false);
const isProcessing = ref(false);
const oldProxyId = ref('');
const proxyList = ref('');
const isAddButtonAvailable = computed((): boolean => {
  if (isProcessing.value) return false;
  if (props.proxyType === ProxySheetType.AddList) return !Validators.isEmptyString(proxyList.value);
  return fieldRules.host() === true && fieldRules.port() === true;
});

const fieldRules = {
  host: () => !Validators.isEmptyString(proxy.value.host) || locale('PROXY_REQUIRED_HOST'),
  port: () => proxy.value.port > 0 && proxy.value.port <= 65535 || locale('PROXY_INVALID_PORT')
};

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    // Reset fields when opening
    oldProxyId.value = props.selectedProxyEndPoint.id;
  }
})

async function processHostField(): Promise<void> {
  isFieldDirty.value = true;
  if (Validators.isEmptyString(proxy.value.host) || fieldRules.port() !== true || isProcessing.value)
    return;

  try {
    isProcessing.value = true;
    const result: AppProxyEndPointInfo = await vhApp.proxyEndPointClient.parse(proxy.value.host.trim(), proxy.value);
    Object.assign(proxy.value, result.endPoint);
    isFieldDirty.value = false;
  } finally {
    isProcessing.value = false;
  }
}

async function addOrUpdateProxy(){
  isProcessing.value = true;
  switch (props.proxyType) {
    case ProxySheetType.Add:
      await vhApp.proxyEndPointClient.add(proxy.value);
      break;
    case ProxySheetType.AddList:
      await vhApp.proxyEndPointClient.import(proxyList.value);
      break;
    default:
      await vhApp.proxyEndPointClient.update(oldProxyId.value, proxy.value);
      break;
  }
  closeSheet();
}

async function deleteProxy(): Promise<void> {
  if (!await vhApp.showConfirmDialog(locale('REMOVE_PROXY'), locale('REMOVE_PROXY_MSG')))
    return;

  try {
    isProcessing.value = true;
    await vhApp.proxyEndPointClient.delete(proxy.value.id);
    closeSheet();
  }
  finally {
    isProcessing.value = false;
  }
}


function closeSheet(){
  emit('update:modelValue',false);
  emit('refreshList');
  isProcessing.value = false;
  if (props.proxyType === ProxySheetType.AddList)
    proxyList.value = '';
}

</script>

<template>
  <v-bottom-sheet
    :modelValue="props.modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
    location="bottom"
    width="100%"
    :max-width="vhApp.data.uiState.maxWidthOnLargeScreen"
  >

    <config-card color="background" class="rounded-xl rounded-b-0" :disabled="isProcessing" :loading="isProcessing">

      <v-card-item>
        <!-- Add proxy list -->
        <template v-if="props.proxyType === ProxySheetType.AddList">
          <p class="text-body-small text-disabled mb-3">{{locale('PROXY_IMPORT_DESC')}}</p>
          <v-textarea
            v-model="proxyList"
            :label="locale('PROXY_IMPORT_LABEL')"
            variant="outlined"
            hide-details="auto"
            no-resize
            rows="6"
          />
        </template>

        <!-- Add or edit proxy -->
        <proxy-fields
          v-else
          :field-rules="fieldRules"
          :proxy-end-point="proxy"
          @process-host-field="processHostField"
        />
      </v-card-item>

      <template v-if="props.proxyType === ProxySheetType.Edit">
        <v-divider/>
        <v-card-item class="py-1">
          <proxy-status :status="props.proxyStatus" />
        </v-card-item>
      </template>

      <v-divider />
      <v-card-actions>
        <v-btn
          v-if="props.proxyType === ProxySheetType.Edit"
          :text="locale('REMOVE')"
          variant="text"
          density="comfortable"
          color="error"
          @click="deleteProxy()"
        />
        <v-spacer />

        <!-- Cancel button -->
        <v-btn
          :text="locale('CANCEL')"
          variant="plain"
          @click="emit('update:modelValue',false)"
        />

        <!-- Add or update button -->
        <v-btn
          class="font-weight-bold text-transform-none"
          color="highlight"
          :text="locale(props.proxyType === ProxySheetType.Edit ? 'SAVE' : 'ADD')"
          :disabled="!isAddButtonAvailable"
          @click="addOrUpdateProxy()"
        />

      </v-card-actions>
    </config-card>
  </v-bottom-sheet>
</template>
