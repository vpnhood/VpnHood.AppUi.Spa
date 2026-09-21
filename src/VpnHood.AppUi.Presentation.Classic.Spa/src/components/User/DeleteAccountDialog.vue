<script setup lang="ts">
import i18n from '@/locales/i18n';
import { ref, watch } from 'vue';

// STATIC by design (lifecycle §10): the confirmation shows no codes and no counts — the screen
// warns, the farewell MAIL delivers the codes, and there is nothing to fetch before showing it.
// It offers to cancel nothing (the backend never touches a store subscription — signing in again
// brings it back), and it is confirmed by an explicit acknowledgement plus a button naming the
// act — never a Yes/No pair, which is answered as fast as it is read.
const locale = i18n.global.t;

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'confirm'): void;
}>();

const understood = ref(false);

// a reopened dialog must not remember an old tick — the acknowledgement is per-attempt
watch(() => props.modelValue, () => (understood.value = false));

function onConfirm(): void {
  if (!understood.value) return;
  emit('update:modelValue', false);
  emit('confirm');
}

function onCancel(): void {
  emit('update:modelValue', false);
}
</script>

<template>
  <v-dialog
    :modelValue="props.modelValue"
    :persistent="true"
    scrollable
  >
    <v-card
      :title="locale('CONFIRM_DELETE_ACCOUNT_TITLE')"
      append-icon="mdi-alert-circle-outline"
      color="general-dialog"
    >
      <v-card-text class="text-general-dialog-text text-body-medium">
        <!-- The whole contract, in a few lines, store-neutral (lifecycle §10) -->
        <p>{{ locale('CONFIRM_DELETE_ACCOUNT_DESC') }}</p>
        <p class="mt-3">{{ locale('DELETE_ACCOUNT_CODES_NOTE') }}</p>
        <p class="mt-3">{{ locale('DELETE_ACCOUNT_SUBSCRIPTION_NOTE') }}</p>
        <p class="mt-3 text-disabled">{{ locale('DELETE_ACCOUNT_INVOICES_NOTE') }}</p>

        <!-- The explicit acknowledgement that arms the destructive button -->
        <v-checkbox
          v-model="understood"
          :label="locale('I_UNDERSTAND')"
          density="compact"
          hide-details
          class="mt-2"
        />
      </v-card-text>

      <v-card-actions>
        <!-- Cancel -->
        <v-btn :text="locale('CANCEL')" @click="onCancel()" />

        <!-- The act, named — armed only by the acknowledgement -->
        <v-btn
          variant="plain"
          color="error"
          :disabled="!understood"
          :text="locale('DELETE_MY_ACCOUNT')"
          @click="onConfirm()"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
