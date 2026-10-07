import pluginVue from 'eslint-plugin-vue'
import pluginVuetify from 'eslint-plugin-vuetify'
import tseslint from 'typescript-eslint'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  // typescript-eslint directly, not @vue/eslint-config-typescript: that wrapper pulls in
  // fast-glob -> braces, which has no patched release. The Vue configs come after it so the Vue
  // parser takes the .vue files back, handing their <script lang="ts"> to the TypeScript parser.
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    name: 'app/vue-ts',
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] },
    },
  },

  {
    name: 'app/overrides',
    files: ['src/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },

  {
    // Vuetify migrated its type scale to Material Design 3; the MD2 class names (text-h6,
    // text-caption, ...) no longer exist in its stylesheets. This rule flags — and with --fix
    // rewrites — any MD2 typography class left behind in a template.
    name: 'app/vuetify',
    files: ['**/*.vue'],
    plugins: { vuetify: pluginVuetify },
    rules: {
      'vuetify/no-deprecated-typography': 'error',
    },
  }
]
