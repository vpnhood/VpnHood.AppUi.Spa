<script setup lang="ts">
import { computed } from 'vue';
import i18n from '@/locales/i18n';

const locale = i18n.global.t;

const props = defineProps<{
  excludes: string;
  includes: string;
  blocks?: string;
  loading?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:excludes': [value: string];
  'update:includes': [value: string];
  'update:blocks': [value: string];
}>();

const excludeIpFilters = computed<string>({
  get: () => props.excludes,
  set: (value: string) => emit('update:excludes', value)
});

const includeIpFilters = computed<string>({
  get: () => props.includes,
  set: (value: string) => emit('update:includes', value)
});

const blockIpFilters = computed<string>({
  get: () => props.blocks ?? '',
  set: (value: string) => emit('update:blocks', value)
});
</script>

<template>

  <v-defaults-provider :defaults="{
      'VChip':{
        'density': 'compact',
        'color': 'sample-ip-filter-bg',
        'size': 'small',
        'class': 'px-1 ms-1 border  border-opacity-25 text-sample-ip-filter-text',
        'style': 'border-radius: 3px; letter-spacing: 1px;',
        'variant': 'flat'
        },
      'VTextarea':{
        'class': 'ipList',
        'density': 'compact',
        'rows': '5',
        'variant': 'outlined',
        'color': 'highlight',
        'loading': loading,
        'disabled': disabled,
        'placeholder': locale('SPLIT_IP_PLACE_HOLDER'),
        'hideDetails': true,
        'clearable': true
        }
      }"
  >

    <!-- Sample ip format -->
   <config-card class="pa-4 mb-2">
     <ul class="text-body-small text-disabled" style="list-style: none">
       <li>
         {{locale('SINGLE_IP')}}
         <v-chip text="192.168.1.1" tabindex="-1"/>
       </li>
       <li class="mt-2">
         {{locale('RANGES_OF_IP')}}
         <v-chip text="192.168.1.1-192.168.1.255" tabindex="-1"/>
       </li>
       <li class="mt-2">
         {{locale('CIDR_NOTATION')}}
         <v-chip text="192.168.1.0/24"  tabindex="-1"/>
       </li>
       <li class="mt-2">
         {{locale('COMMENT')}}
         <v-chip :text="locale('COMMENT_DESC')"  tabindex="-1"/>
       </li>
     </ul>
   </config-card>

    <!-- Exclude list -->
    <config-card class="pb-3 mt-4">
      <v-card-item>
        <p>{{locale('EXCLUDE_IPS')}}</p>
        <v-locale-provider :rtl="false">
          <v-textarea v-model="excludeIpFilters"/>
        </v-locale-provider>
      </v-card-item>
    </config-card>

    <!-- Include list -->
    <config-card class="pb-3 mt-4">
      <v-card-item>
        <p>{{locale('INCLUDE_IPS')}}</p>
        <v-locale-provider :rtl="false">
          <v-textarea v-model="includeIpFilters"/>
        </v-locale-provider>
      </v-card-item>
    </config-card>

    <!-- Block list -->
    <config-card v-if="blocks !== undefined" class="pb-3 mt-4">
      <v-card-item>
        <p>{{locale('BLOCK_IPS')}}</p>
        <v-locale-provider :rtl="false">
          <v-textarea v-model="blockIpFilters"/>
        </v-locale-provider>
      </v-card-item>
    </config-card>

  </v-defaults-provider>
</template>

<style>
.ipList textarea{
  /*noinspection CssUnresolvedCustomProperty*/
  font-size: 14px;
  padding-top: 15px;
}
.ipList textarea::placeholder{
  font-size: 12px;
}
</style>
