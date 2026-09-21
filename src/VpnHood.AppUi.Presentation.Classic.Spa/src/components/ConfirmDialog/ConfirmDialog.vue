<script setup lang="ts">
import { watch } from 'vue';
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { useDialogFocus } from '@/helpers/InitialFocus';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;
// On a TV the question opens with No under the remote: the safe answer, and a control rather than
// the dialog's wrapper, which is where Vuetify parks focus and where the arrows have nowhere to go.
const { target: noBtnRef, onAfterEnter } = useDialogFocus();

const props = defineProps<{
  modelValue: boolean,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
}>();

// Answered once: by a button, or by the dialog closing some other way (Back pops its route entry).
function settle(answer: boolean): void {
  vhApp.confirmDialogDeferred?.resolve(answer);
  vhApp.confirmDialogDeferred = null;
}

function onConfirm(): void {
  settle(true);
  emit('update:modelValue', false);
}

function onCancel(): void {
  settle(false);
  emit('update:modelValue', false);
}

watch(() => props.modelValue, (isOpen, wasOpen) => {
  if (!isOpen && wasOpen)
    settle(false);
});
</script>

<template>
    <!-- Route-controlled (App.vue binds it to VpnHoodApp.confirmDialogModel): Back pops the entry
         and the watcher above answers No. close-on-back is off because Vuetify would otherwise
         intercept that Back itself, and for a persistent dialog it cancels the navigation and
         shakes, so the dialog could never be closed by Back. persistent stays: a question is not
         dismissed by a click beside it. -->
    <v-dialog
      :modelValue="props.modelValue"
      :persistent="true"
      :close-on-back="false"
      @after-enter="onAfterEnter"
      >
      <v-card
        :title="vhApp.data.uiState.confirmDialogState.title"
        append-icon="mdi-alert-circle-outline"
        color="general-dialog"
      >
        <v-card-text class="text-general-dialog-text text-body-medium">
          {{ vhApp.data.uiState.confirmDialogState.message }}
        </v-card-text>

        <v-card-actions>

          <!-- Cancel -->
          <v-btn ref="noBtnRef" :text="locale('NO')" @click="onCancel()" />

          <!-- Confirm -->
          <v-btn variant="plain" :text="locale('YES')" @click="onConfirm()" />

        </v-card-actions>
      </v-card>
    </v-dialog>
</template>
