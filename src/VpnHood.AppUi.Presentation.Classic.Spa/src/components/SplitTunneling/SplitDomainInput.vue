<script setup lang="ts">
import { computed } from 'vue';
import i18n from '@/locales/i18n';

const locale = i18n.global.t;

const props = defineProps<{
  excludes: string;
  includes: string;
  blocks: string;
  loading?: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  'update:excludes': [value: string];
  'update:includes': [value: string];
  'update:blocks': [value: string];
}>();

const excludeDomainFilters = computed<string>({
  get: () => props.excludes,
  set: (value: string) => emit('update:excludes', value)
});

const includeDomainFilters = computed<string>({
  get: () => props.includes,
  set: (value: string) => emit('update:includes', value)
});

const blockDomainFilters = computed<string>({
  get: () => props.blocks,
  set: (value: string) => emit('update:blocks', value)
});
</script>

<template>

  <v-defaults-provider :defaults="{
      'VChip':{
        'density': 'compact',
        'color': 'sample-ip-filter-bg',
        'size': 'small',
        'class': 'px-1 ms-1 border border-opacity-25 text-sample-ip-filter-text',
        'style': 'border-radius: 3px; letter-spacing: 1px;',
        'variant': 'flat'
        },
      'VTextarea':{
        'class': 'domainList',
        'density': 'compact',
        'rows': '5',
        'variant': 'outlined',
        'color': 'highlight',
        'loading': loading,
        'disabled': disabled,
        'placeholder': locale('SPLIT_DOMAIN_PLACE_HOLDER'),
        'hideDetails': true,
        'clearable': true
        }
      }"
  >

    <!-- Domain format hints -->
    <config-card class="pa-4 mb-2">
      <ul class="text-body-small text-disabled" style="list-style: none">
        <li>
          {{ locale('EXACT_DOMAIN') }}
          <v-chip text="example.com" tabindex="-1"/>
        </li>
        <li class="mt-2">
          {{ locale('WILDCARD_DOMAIN') }}
          <v-chip text="*.example.com" tabindex="-1"/>
        </li>
        <li class="mt-2">
          {{ locale('COMMENT') }}
          <v-chip :text="locale('COMMENT_DESC')" tabindex="-1"/>
        </li>
        <li class="mt-2">
          {{ locale('DOMAIN_RULES_HINT') }}
        </li>
      </ul>
    </config-card>

    <!-- Exclude list -->
    <config-card class="pb-3 mt-4">
      <v-card-item>
        <p>{{ locale('EXCLUDE_DOMAINS') }}</p>
        <v-locale-provider :rtl="false">
          <v-textarea v-model="excludeDomainFilters"/>
        </v-locale-provider>
      </v-card-item>
    </config-card>

    <!-- Include list -->
    <config-card class="pb-3 mt-4">
      <v-card-item>
        <p>{{ locale('INCLUDE_DOMAINS') }}</p>
        <v-locale-provider :rtl="false">
          <v-textarea v-model="includeDomainFilters"/>
        </v-locale-provider>
      </v-card-item>
    </config-card>

    <!-- Block list -->
    <config-card class="pb-3 mt-4">
      <v-card-item>
        <p>{{ locale('BLOCK_DOMAINS') }}</p>
        <v-locale-provider :rtl="false">
          <v-textarea v-model="blockDomainFilters"/>
        </v-locale-provider>
      </v-card-item>
    </config-card>

  </v-defaults-provider>
</template>

<style>
.domainList textarea {
  font-size: 14px;
  padding-top: 15px;
}
.domainList textarea::placeholder {
  font-size: 12px;
}
</style>
