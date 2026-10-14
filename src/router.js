import { createRouter, createWebHistory } from 'vue-router';
import EditorView from './views/EditorView.vue';
import GraphView from './views/GraphView.vue';
import HomeView from './views/HomeView.vue';
import PageView from './views/PageView.vue';
import SearchView from './views/SearchView.vue';

const pageProps = (route) => ({ path: String(route.params.path || '') });

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/page/:path(.*)', name: 'page', component: PageView, props: pageProps },
    { path: '/edit/:path(.*)', name: 'edit', component: EditorView, props: pageProps },
    { path: '/search', name: 'search', component: SearchView },
    { path: '/graph', name: 'graph', component: GraphView },
    { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
  ],
});