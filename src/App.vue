<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import GardenDrawer from '@/components/GardenDrawer.vue';
import { ui } from '@/services/garden';

const route = useRoute();
const router = useRouter();
const theme = useTheme();

const drawer = ref(false);
const search = ref('');
const searchField = ref(null);

const isDark = computed(() => theme.global.current.value.dark);

const viewKey = computed(() =>
  route.name === 'page' || route.name === 'edit'
    ? `${route.name}:${route.params.path}`
    : String(route.name)
);

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'light' : 'dark';
}

function submitSearch() {
  const q = search.value.trim();
  if (!q) return;
  router.push({ name: 'search', query: { q } });
  search.value = '';
}

function onShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    searchField.value?.focus();
  }
}

onMounted(() => window.addEventListener('keydown', onShortcut));
onBeforeUnmount(() => window.removeEventListener('keydown', onShortcut));
</script>

<template>
  <v-app>
    <garden-drawer v-model="drawer" />

    <v-app-bar flat border="bottom" color="surface">
      <template #prepend>
        <v-app-bar-nav-icon @click="drawer = !drawer" />
      </template>

      <v-icon icon="$mdiSprout" color="primary" size="28" class="ml-1"
        style="cursor: pointer" @click="router.push({ name: 'home' })" />

      <v-toolbar-title class="d-none d-sm-flex flex-column ml-1" style="cursor: pointer"
        @click="router.push({ name: 'home' })">
        <span class="text-h6 font-weight-bold" style="line-height: 1.1">Garden</span>
        <span class="text-caption text-medium-emphasis" style="line-height: 1">local OPFS wiki</span>
      </v-toolbar-title>

      <v-spacer />

      <v-text-field
        ref="searchField"
        v-model="search"
        class="mx-2"
        style="max-width: 360px; min-width: 180px"
        density="compact" variant="outlined" rounded hide-details
        placeholder="Search (Ctrl-K)"
        prepend-inner-icon="$mdiMagnify"
        clearable
        @keyup.enter="submitSearch"
      />

      <v-btn icon="$mdiGraphOutline" variant="text" title="Link graph" :to="{ name: 'graph' }" />
      <v-btn :icon="isDark ? '$mdiWeatherSunny' : '$mdiWeatherNight'" variant="text"
        :title="isDark ? 'Switch to light' : 'Switch to dark'" @click="toggleTheme" />
    </v-app-bar>

    <v-main>
      <router-view :key="viewKey" />
    </v-main>

    <v-snackbar v-model="ui.snackbar" :color="ui.color" timeout="2600"
      location="bottom right" elevation="6">
      {{ ui.text }}
    </v-snackbar>
  </v-app>
</template>