import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import vuetify from 'vite-plugin-vuetify';

export default defineConfig({
  base: './',                     // works when dist/ is hosted from any subpath
  plugins: [
    vue(),
    vuetify({ autoImport: true, styles: 'css' }),
  ],
  resolve: {
    alias: [
      { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      // "full Vue": bundler build that includes the runtime template compiler
      { find: /^vue$/, replacement: 'vue/dist/vue.esm-bundler.js' },
    ],
  },
  worker: { format: 'es' },       // the OPFS worker is an ES module
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  build: { target: 'es2022' },    // OPFS-era browsers only anyway
});