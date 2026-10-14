import 'vuetify/styles';
import '@/styles/main.css';
import { createApp } from 'vue';
import { createVuetify } from 'vuetify';
import App from './App.vue';
import { router } from './router';
import { initGarden } from './services/garden';

const vuetify = createVuetify({
  icons: { defaultSet: 'mdiSvg' },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#2e7d32',
          secondary: '#6d4c41',
          accent: '#00796b',
          background: '#f4f1e8',
          surface: '#fdfbf4',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#a5d6a7',
          'on-primary': '#123018',
          secondary: '#bcaaa4',
          accent: '#80cbc4',
          background: '#121712',
          surface: '#1c231c',
        },
      },
    },
  },
});

createApp(App).use(vuetify).use(router).mount('#app');
initGarden();