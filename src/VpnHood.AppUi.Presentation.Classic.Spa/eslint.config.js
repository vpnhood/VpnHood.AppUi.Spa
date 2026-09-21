import pluginVue from 'eslint-plugin-vue'
import pluginVuetify from 'eslint-plugin-vuetify'
import vueTsEslintConfig from '@vue/eslint-config-typescript'

export default [
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**'],
  },

  ...pluginVue.configs['flat/essential'],
  ...vueTsEslintConfig(),

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
