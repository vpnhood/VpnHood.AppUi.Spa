<script setup lang="ts">
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
// v-dialog does not render its content until it is opened, which is what makes the plate's async
// encoder chunk actually pay here: the request is not made on the page that merely CONTAINS the link.
import QrPlate from '@/components/OpenOnPhoneDialog/QrPlate.vue';
import { useDialogFocus } from '@/helpers/InitialFocus';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
const { target: closeBtnRef, onAfterEnter } = useDialogFocus();

defineProps<{
  modelValue: boolean,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
}>();

const dialogState = vhApp.data.uiState.openOnPhoneDialogState;

// Emit rather than clear a flag: the route controller behind this model has a history entry to pop,
// and closing any other way would leave it stranded.
function onClose(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <!-- Opened by VpnHoodApp.onExternalLinkClick, which is where the decision to show a code instead
       of following the link is made. Nothing else opens it, so it carries no props: the address and
       the heading come from the shared state that call set. -->
  <v-dialog :model-value="modelValue" max-width="480" @update:model-value="onClose()" @after-enter="onAfterEnter">
    <v-card color="general-dialog" class="text-general-dialog-text">

      <!-- text-wrap: v-card-title is single-line with an ellipsis by default, and a translated
           document name is routinely longer than the English one it came from. -->
      <v-card-title v-if="dialogState.title" class="text-center text-wrap">{{ dialogState.title }}</v-card-title>

      <v-card-text class="text-center">
        <p class="text-body-medium mb-4">{{ locale('SCAN_QR_TO_OPEN') }}</p>

        <qr-plate :url="dialogState.url"/>
      </v-card-text>

      <v-card-actions>
        <v-spacer/>
        <!-- Focused on arrival, so a remote has something under it: this dialog is only ever raised
             on a device driven by a D-pad, which has no way to reach an unfocused control. -->
        <v-btn ref="closeBtnRef" :text="locale('CLOSE')" @click="onClose()"/>
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>
