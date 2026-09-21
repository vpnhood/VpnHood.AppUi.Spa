<script setup lang="ts">
import ProxyListItem from '@/components/Proxies/ProxyListItem.vue';
import { ProxySheetType } from '@/components/Proxies/ProxyUtils';
import { computed, onUnmounted, ref, toRef, watch } from 'vue';
import i18n from '@/locales/i18n';
import {
  AppConnectionState,
  type AppProxyEndPointInfo,
  ProxyEndPoint,
  type ProxyEndPointStatus,
  ProxyProtocol
} from '@/services/VpnHood.Client.Api';
import { ComponentRouteController } from '@/services/ComponentRouteController';
import { ComponentName } from '@/helpers/UiConstants';
import { VpnHoodApp } from '@/services/VpnHoodApp';
import AddOrEditProxy from '@/components/Proxies/Manual/AddOrEditProxy.vue';

const vhApp = VpnHoodApp.instance;
const locale = i18n.global.t;

const props = defineProps<{
  isLoading: boolean,
  proxies: AppProxyEndPointInfo[],
  totalProxyCount: number
}>();

const emit = defineEmits<{ (
  event: 'loadProxies',
  recordIndex?: number,
  recordCount?: number,
  includeSucceeded?: boolean,
  includeFailed?: boolean,
  includeUnknown?: boolean,
  includeDisabled?: boolean
  ): void;
}>();

interface MenuItem {
  title: string,
  icon: string,
  refreshList: boolean,
  color?: string,
  confirm?:{ title: string, message: string },
  action: () => Promise<void> | void
}

enum FilterProxyStatus{
  Succeeded = 'SUCCEEDED',
  Failed = 'FAILED',
  Disabled = 'DISABLED'
}

const loading = toRef(props, 'isLoading');
const page = ref(1);
const itemsPerPage = 10;
const totalPages = computed(() => Math.ceil(props.totalProxyCount / itemsPerPage));
const isResettingStates = ref(false);
const isImporting = ref(false);
const showAddOrEditSheet = ref(new ComponentRouteController(ComponentName.AddOrEditProxySheet));
const addOrEditSheetType = ref<ProxySheetType>(ProxySheetType.Add);
const isDisableButtons = computed(() => isResettingStates.value || props.isLoading || isImporting.value);
const proxyStatus = ref<ProxyEndPointStatus | null>(null);
const selectedFilterProxy = ref<FilterProxyStatus | null>(null);
const proxyEndPoint = ref<ProxyEndPoint>(createEmptyProxy());
const isDisableSkeleton = ref(false);
let refreshInterval: ReturnType<typeof setInterval> | null = null;
const enableAutoRefreshProxyList = computed({
  get: () => vhApp.data.userSettings.customData?.enableAutoRefreshProxyList,
  set: async (value: boolean) => {
    (vhApp.data.userSettings.customData ??= {}).enableAutoRefreshProxyList = value;
    await vhApp.saveUserSetting();
  }
})

const menuItems = computed<MenuItem[]>(() => [
  {
    title: locale('AUTO_REFRESH'),
    icon: 'mdi-refresh-auto',
    refreshList: false,
    action: autoRefreshList
  },
  {
    title: locale('PROXY_RESET_STATES'),
    icon: 'mdi-refresh',
    refreshList: true,
    action: resetStates
  },
  {
    title: locale('DISABLE_ALL_FAILED'),
    icon: 'mdi-cancel',
    refreshList: true,
    confirm:{
      title: locale('DISABLE_ALL_FAILED'),
      message: locale('DISABLE_ALL_FAILED_PROXIES_MSG')
    },
    action: async () => {await vhApp.proxyEndPointClient.disableAllFailed();}
  },
  {
    title: locale('REMOVE_ALL_FAILED'),
    icon: 'mdi-delete-alert',
    refreshList: true,
    confirm:{
      title: locale('REMOVE_ALL_FAILED'),
      message: locale('REMOVE_ALL_FAILED_MSG')
    },
    action: async () => {await vhApp.proxyEndPointClient.deleteAll(false, true);}
  },
  {
    title: locale('REMOVE_ALL_DISABLED'),
    icon: 'mdi-delete-forever',
    refreshList: true,
    confirm:{
      title: locale('REMOVE_ALL_DISABLED'),
      message: locale('REMOVE_ALL_DISABLED_MSG')
    },
    action: async () => {await vhApp.proxyEndPointClient.deleteAll(false, false, false, true);}
  },
  {
    title: locale('REMOVE_ALL'),
    icon: 'mdi-delete',
    color: 'error',
    refreshList: true,
    confirm:{
      title: locale('REMOVE_ALL'),
      message: locale('REMOVE_ALL_PROXIES_MSG')
    },
    action: async () => {await vhApp.proxyEndPointClient.deleteAll();}
  },
]);

const filterItems = computed(() => [
  { title: locale('SUCCEEDED'), value: FilterProxyStatus.Succeeded },
  { title: locale('FAILED'), value: FilterProxyStatus.Failed },
  { title: locale('DISABLED'), value: FilterProxyStatus.Disabled }
]);

const paginationStatus = computed(() => {
  if (props.totalProxyCount === 0) return '0 - 0 of 0';
  const start = (page.value - 1) * itemsPerPage + 1;
  const end = Math.min(page.value * itemsPerPage, props.totalProxyCount);
  return locale('PAGINATION_STATUS', { start, end, total: props.totalProxyCount });
});

function createEmptyProxy(): ProxyEndPoint{
  const proxyEndpoint = new ProxyEndPoint({
    id: '',
    host: '',
    port: 8080,
    protocol: ProxyProtocol.Http,
    isEnabled: true,
    username: '',
    password: '',
    url: ''
  });
  return proxyEndpoint;
}

async function runMenuAction(item: MenuItem) {
  if (item.confirm) {
    const confirmed = await vhApp.showConfirmDialog(item.confirm.title, item.confirm.message);
    if (!confirmed) return;
  }
  await item.action();

  if (item.refreshList)
    refreshList();
}
function addProxy(): void {
  proxyEndPoint.value = createEmptyProxy();
  proxyStatus.value = null;
  addOrEditSheetType.value = ProxySheetType.Add;
  showAddOrEditSheet.value.show();
}
function editProxy(selectedProxyEndPoint: AppProxyEndPointInfo): void {
  proxyStatus.value = selectedProxyEndPoint.status;
  proxyEndPoint.value =  selectedProxyEndPoint.endPoint;
  addOrEditSheetType.value = ProxySheetType.Edit;
  showAddOrEditSheet.value.show();
}
function addProxyList(): void {
  addOrEditSheetType.value = ProxySheetType.AddList;
  showAddOrEditSheet.value.show();
}
async function resetStates(): Promise<void> {
  try {
    isResettingStates.value = true;
    await vhApp.proxyEndPointClient.resetStates();
  } finally {
    isResettingStates.value = false;
  }
}
function refreshList() {
  page.value = 1;
  handlePageChange(page.value);
}
function autoRefreshList() {
  enableAutoRefreshProxyList.value = !enableAutoRefreshProxyList.value;
  if (enableAutoRefreshProxyList.value)
    startPeriodicRefresh();
  else
    stopPeriodicRefresh();
}
function handlePageChange(newPage: number) {
  const recordIndex = (newPage - 1) * itemsPerPage;
  const filter = selectedFilterProxy.value;

  emit(
    'loadProxies',
    recordIndex,
    itemsPerPage,
    !filter || filter === FilterProxyStatus.Succeeded,
    !filter || filter === FilterProxyStatus.Failed,
    !filter, // includeUnknown
    !filter || filter === FilterProxyStatus.Disabled
  );
}

async function startPeriodicRefresh(): Promise<void> {
  if (refreshInterval ||
    document.hidden ||
    vhApp.data.connectionState === AppConnectionState.None ||
    !enableAutoRefreshProxyList.value)
    return;

  refreshInterval = setInterval(async () => {
      // Don't show loading skeleton on periodic refresh
      isDisableSkeleton.value = true;

      emit('loadProxies');

  }, 3000);
}
function stopPeriodicRefresh(): void {
  isDisableSkeleton.value = false;
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

onUnmounted(() => {
  stopPeriodicRefresh();
});

watch(selectedFilterProxy, () => {
  refreshList();
});
</script>

<template>
  <!-- Proxies list -->
  <config-card :loading="loading ? 'highlight' : false">
    <v-card-item>

      <!-- Title and Menu button -->
      <div class="d-flex align-center justify-space-between">
        <span>{{ locale('PROXIES') }}</span>
        <v-btn
          v-if="props.proxies.length"
          icon
          density="compact"
          variant="plain"
          :disabled="isDisableButtons"
        >
          <v-icon>mdi-dots-vertical</v-icon>
          <v-menu activator="parent">
            <!-- Menu items -->
            <v-list>

              <!-- Reset states -->
              <v-list-item
                v-for="(item, index) in menuItems"
                :key="index"
                :title="item.title"
                :prepend-icon="item.icon"
                :base-color="item.color"
                :class="{'border-b': index < (menuItems.length - 1)}"
                prepend-gap="10px"
                @click="runMenuAction(item)"
              >
                <template v-slot:append v-if="item.title === locale('AUTO_REFRESH')">
                    <v-switch v-model="enableAutoRefreshProxyList" density="compact" hide-details/>
                </template>
              </v-list-item>

            </v-list>
          </v-menu>
        </v-btn>
      </div>

      <!-- Add proxy buttons -->
      <v-row class="mt-2" dense>

        <!-- Add single proxy -->
        <v-col cols="6">
          <v-btn
            block
            rounded="pill"
            variant="tonal"
            color="highlight"
            class="text-transform-none"
            prepend-icon="mdi-plus"
            :disabled="isDisableButtons"
            :text="locale('ADD')"
            @click="addProxy()"
          />
        </v-col>

        <!-- Add proxy list -->
        <v-col cols="6">
          <v-btn
            block
            rounded="pill"
            variant="tonal"
            color="highlight"
            class="text-capitalize"
            prepend-icon="mdi-playlist-plus"
            :disabled="isDisableButtons"
            :text="locale('ADD_LIST')"
            @click="addProxyList()"
          />
        </v-col>

      </v-row>

      <v-select
        v-if="selectedFilterProxy || props.totalProxyCount > itemsPerPage"
        v-model="selectedFilterProxy"
        :disabled="isDisableButtons"
        density="compact"
        label="Filter Status"
        clear-icon="mdi-close"
        prepend-inner-icon="mdi-filter-variant"
        rounded="pill"
        icon-color="highlight"
        base-color="highlight"
        color="highlight"
        variant="outlined"
        :items="filterItems"
        item-title="title"
        item-value="value"
        class="mt-6"
        :class="{'text-highlight': !selectedFilterProxy}"
        hide-details
        clearable
      />

    </v-card-item>

    <v-divider class="my-2"/>

    <!-- Proxy list loading skeleton -->
    <template v-if="loading && !isDisableSkeleton">
      <v-skeleton-loader
        v-for="i in 4"
        :key="i"
        color="config-card-bg"
        type="list-item-two-line"
      />
    </template>

    <!-- Proxy list -->
    <template v-else-if="props.proxies.length">
      <v-list lines="three" bg-color="transparent">
        <proxy-list-item
          v-for="(proxy, index) in props.proxies"
          :key="proxy.endPoint.id"
          :proxy="proxy"
          :class="{'border-b': index !== props.proxies.length - 1}"
          @click="editProxy(proxy)"
        />
      </v-list>
      <template v-if="props.totalProxyCount > itemsPerPage">
        <v-divider/>
        <v-pagination
          v-model="page"
          :length="totalPages"
          :total-visible="3"
          size="small"
          show-first-last-page
          active-color="highlight"
          density="compact"
          class="my-3"
          @update:model-value="handlePageChange"
        />
        <p class="text-disabled text-body-small text-center mb-3">{{paginationStatus}}</p>
      </template>
    </template>


    <!-- Empty list message -->
    <v-card-text v-else class="text-disabled text-center">
      {{ locale( selectedFilterProxy ? 'PROXY_FILTER_NO_RESULT' : 'PROXY_LIST_EMPTY') }}
    </v-card-text>

  </config-card>

  <add-or-edit-proxy
    v-model="showAddOrEditSheet.isVisible"
    :proxy-type="addOrEditSheetType"
    :selected-proxy-end-point="proxyEndPoint"
    :proxy-status="proxyStatus"
    @refresh-list="refreshList"
  />

</template>
