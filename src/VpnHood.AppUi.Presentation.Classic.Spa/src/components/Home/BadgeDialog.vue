<script setup lang="ts">
import i18n from '@/locales/i18n';
import { Util } from '@/helpers/Util';
import router from '@/services/router';
import { computed } from 'vue';
import { getFeatureItems, type FeatureItem } from '@/components/Home/FeatureIcons';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import { RemoteAccessHint } from '@/helpers/UiConstants';
import FeatureIconDisplay from '@/components/Home/FeatureIconDisplay.vue';

const locale = i18n.global.t;
const vhApp = VpnHoodApp.instance;

const props = defineProps<{
  modelValue: boolean,
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void,
}>();

const featureItems = computed(() => getFeatureItems());

// The feature's page - or, on the TV UI, the pairing dialog with a hint: those pages are the
// phone's work there (the home Settings row already says so), and this dialog was the one way
// left to them, for a pointer. The badge itself stays: it tells a TV user why traffic behaves as
// it does. The pairing dialog stacks over this one, so Back returns here.
async function onFeatureClick(feature: FeatureItem): Promise<void> {
  if (vhApp.data.isTvUi)
    vhApp.showRemoteAccessDialog(RemoteAccessHint.Settings);
  else
    await router.replace(feature.pageLink);
}
</script>

<template>
  <!-- close-on-back off: the route decides. Vuetify's own Back handling cancels the navigation
       and closes the topmost dialog itself, which breaks a dialog stacked on this one (the TV
       UI's pairing dialog): its closing pops its history entry, this dialog took that pop as a
       Back aimed at itself and closed too. -->
  <v-dialog
    :modelValue="props.modelValue"
    :close-on-back="false"
    @update:modelValue="emit('update:modelValue',$event)"
  >
    <v-card :title="locale('IN_USE_FEATURES')" color="general-dialog">

      <v-card-text class="text-disabled text-body-small">{{locale('IN_USE_FEATURES_DESC')}}</v-card-text>

      <v-list id="badgeList" >
        <template v-for="(feature, index) in featureItems" :key="index">
          <v-list-item
            v-if="feature.isActive"
            :append-icon="Util.getLocalizedRightChevron()"
            :title="locale(feature.title)"
            slim
            @click="onFeatureClick(feature)"
          >
            <template v-slot:prepend>
              <FeatureIconDisplay :icon="feature.icon" :second-icon="feature.secondIcon" class="me-4" />
            </template>
          </v-list-item>
        </template>
      </v-list>

      <v-card-actions>
        <!-- Cancel -->
        <v-btn :text="locale('CLOSE')" @click="emit('update:modelValue', false)" />
      </v-card-actions>

    </v-card>
  </v-dialog>
</template>

<style scoped>
/*noinspection CssUnresolvedCustomProperty,CssUnusedSymbol*/
#badgeList .v-list-item:not(:last-child) {
  border-bottom: 1px solid rgba(var(--v-theme-on-general-dialog),.1);
}
</style>
