<script setup lang="ts">
import { computed, ref } from 'vue';
import i18n from '@/locales/i18n';
import { VpnHoodApp } from '@/services/VpnHoodApp';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

export interface IListItemInfo {
  id: string;
  name: string;
  icon: string;
  isSelected: boolean;
}

const props = defineProps<{
  list: IListItemInfo[];
  loading: boolean;
  iconSize: string;
  isIconAsFlag?: boolean;
  // dims the whole list and blocks input (pointer and keyboard); the stored selection keeps
  // showing so the user sees what would come back when the blocking condition lifts
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:list', value: IListItemInfo[]): void;
}>();

const search = ref<string | null>(null);
const isShowSearchBox = ref<boolean>(!vhApp.data.isTvUi);

/*** Filters the list items based on search input. ***/
const filteredListItem = computed(() => {
  if (!search.value) return props.list;
  const searchText = search.value.toLowerCase();
  return props.list.filter(x => x.name.toLowerCase().includes(searchText));
});

/*** Toggles a single item selection and notifies parent ***/
const toggleListItem = (x: IListItemInfo) => {
  // Flip in place: items are reactive, so only the tapped row re-renders and the switch answers
  // the tap at once. Rebuilding the array re-rendered every row per tap, which on a long app list
  // blocked the main thread — the toggle lagged and the ripple never got a frame to grow.
  x.isSelected = !x.isSelected;
  emit('update:list', props.list);
};

/*** Select all items and notifies parent ***/
async function onSelectAll() {
  const result = await vhApp.showConfirmDialog(locale('SELECT_ALL_ITEMS'), locale('ARE_YOU_SURE'));
  if (result)
    emit('update:list', props.list.map(x => ({ ...x, isSelected: true })));
}

/*** Deselect all items and notifies parent ***/
async function onClearAll() {
  const result = await vhApp.showConfirmDialog(locale('CLEAR_ALL_ITEMS'), locale('ARE_YOU_SURE'));
  if (result)
    emit('update:list', props.list.map(x => ({ ...x, isSelected: false })));
}
</script>

<template>
  <!-- disabled also lands on every interactive child: the card's pointer-events block does not
       stop keyboard focus, and TV devices navigate by keyboard alone -->
  <config-card :loading="loading" :disabled="disabled" class="pt-3">
    <v-card-item>
      <div class="d-flex flex-wrap ga-2">
        <!-- Select all apps button -->
        <btn-style-5
          prepend-icon="mdi-select-all"
          class="flex-grow-1 text-body-small"
          :text="locale('SELECT_ALL')"
          :disabled="disabled"
          @click="onSelectAll()"
        />

        <!-- Clear all apps button -->
        <btn-style-5
          prepend-icon="mdi-select-remove"
          class="flex-grow-1 text-body-small"
          :text="locale('CLEAR_ALL')"
          :disabled="disabled"
          @click="onClearAll()"
        />

        <!-- Search button -->
        <btn-style-5
          v-if="!isShowSearchBox"
          prepend-icon="mdi-magnify"
          class="flex-grow-1 text-body-small"
          :text="locale('SEARCH')"
          :disabled="disabled"
          @click="isShowSearchBox = !isShowSearchBox"
        />
      </div>
    </v-card-item>

    <v-card-item v-if="isShowSearchBox">
      <v-text-field
        v-model="search"
        single-line
        clearable
        hide-details
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        rounded="pill"
        color="highlight"
        class="my-search-field"
        :disabled="disabled"
        :placeholder="locale('SEARCH')"
      />
    </v-card-item>

    <template v-if="loading">
      <v-skeleton-loader
        v-for="i in 8"
        :key="i"
        color="config-card-bg"
        type="list-item-avatar"
      />
    </template>

    <v-list
      v-else
      class="mt-3"
      select-strategy="classic"
      bg-color="transparent"
      selectable
      :disabled="disabled"
    >
      <v-list-item
        v-for="(item, index) in filteredListItem"
        :key="item.id"
        :value="item.id"
        :title="item.name"
        :ripple="true"
        :active="false"
        class="text-body-small"
        :class="{'border-b': filteredListItem.length > index + 1}"
        @click="toggleListItem(item)"
      >
        <template v-if="props.isIconAsFlag" v-slot:prepend>
          <span class="overflow-hidden d-inline-flex align-center justify-center item-flag me-2">
          <img :src="item.icon" height="100%" alt=""/>
        </span>
        </template>

        <template v-else v-slot:prepend>
          <v-avatar :size="props.iconSize">
            <!-- plain img, not v-img: icons are inline base64, so v-img's lazy-load observer and
                 fade transition buy nothing and cost a component per row -->
            <img :src="item.icon" class="item-icon" alt=""/>
          </v-avatar>
        </template>

        <template v-slot:append>
          <v-switch
            :model-value="item.isSelected"
            :hide-details="true"
            tabindex="-1"
            readonly
            density="compact"
          />
        </template>
      </v-list-item>
    </v-list>
  </config-card>
</template>

<style scoped>
.my-search-field :deep(input) {
  font-size: 13px;
}
.item-flag {
  width: 26px;
  height: 18px;
  border-radius: 2px;
}
.item-icon {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
