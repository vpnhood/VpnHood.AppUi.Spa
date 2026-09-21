<script setup lang="ts">
// The in-place counterpart of SettingsItem: that one navigates to a subpage and shows state as
// read-only chips; this one changes a boolean setting right here with a switch, so it has no
// click target and no chevron.
const props = defineProps<{
  title: string,
  modelValue: boolean,
  // paragraph under the row; omit when the caller renders its own content through the slot
  description?: string,
  // disables only the switch; the stored value keeps showing so the user sees what would come
  // back when the blocking condition lifts
  disabled?: boolean,
  // the feature's caution said quietly next to the title, only while the caller provides it
  warning?: string,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
}>();

// Vuetify's switch models null as well as booleans; a settings toggle is always a boolean
function onSwitchChange(value: boolean | null): void {
  if (value !== null)
    emit('update:modelValue', value);
}
</script>

<template>
  <config-card class="pb-2">
    <v-card-item>
      <!-- data-tv-row: on the TV the whole title row is the step and wears the ring, not the switch -->
      <div class="d-flex align-center justify-space-between" data-tv-row>
        <div class="d-flex align-center ga-2">
          <span>{{ props.title }}</span>

          <v-chip
            v-if="props.warning"
            :text="props.warning"
            size="small"
            variant="tonal"
            density="comfortable"
            color="warning"
            tabindex="-1"
          />
        </div>
        <v-switch
          :model-value="props.modelValue"
          :disabled="props.disabled"
          hide-details
          @update:model-value="onSwitchChange"
        />
      </div>

      <p v-if="props.description" class="text-body-small text-disabled">{{ props.description }}</p>

      <!-- extra content under the row, e.g. a conditional alert -->
      <slot/>
    </v-card-item>
  </config-card>
</template>
