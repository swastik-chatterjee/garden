<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import GardenDrawer from '@/components/GardenDrawer.vue';
import {
  createBackup, garden, importBackup, notify, recent, saveNote, ui,
} from '@/services/garden';
import { runSearch } from '@/services/search';

const route = useRoute();
const router = useRouter();
const theme = useTheme();

const drawer = ref(false);
const search = ref('');
const paletteOpen = ref(false);
const paletteQuery = ref('');
const paletteField = ref(null);
const selectedResult = ref(0);
const importDialog = ref(false);
const importFile = ref(null);
const overwriteImports = ref(false);
const importing = ref(false);

const isDark = computed(() => theme.global.current.value.dark);
const paletteResults = computed(() => {
  const query = paletteQuery.value.trim();
  if (!query) return recent.value.slice(0, 8);
  if (/^tag:/i.test(query)) {
    const tag = query.slice(4).trim().toLowerCase();
    return Object.values(garden.docs)
      .filter((page) => page.tags.some((item) => item.toLowerCase() === tag))
      .slice(0, 8);
  }
  return runSearch(query, { limit: 8 }).results.map((result) => garden.docs[result.path]).filter(Boolean);
});

const viewKey = computed(() =>
  route.name === 'page' || route.name === 'edit'
    ? `${route.name}:${route.params.path}`
    : String(route.name)
);

watch(() => [route.name, route.params.path, garden.docs[String(route.params.path || '')]?.title], () => {
  const note = route.name === 'page' ? garden.docs[String(route.params.path || '')] : null;
  document.title = note
    ? `${note.title} — Garden`
    : route.name === 'search'
      ? 'Search — Garden'
      : route.name === 'graph'
        ? 'Link graph — Garden'
        : 'Garden — Local-first digital garden';
}, { immediate: true });

watch(paletteOpen, async (open) => {
  if (!open) return;
  paletteQuery.value = '';
  selectedResult.value = 0;
  await nextTick();
  paletteField.value?.focus();
});

watch(paletteResults, () => { selectedResult.value = 0; });

function toggleTheme() {
  theme.global.name.value = isDark.value ? 'light' : 'dark';
}

function submitSearch() {
  const q = search.value.trim();
  if (!q) return;
  router.push({ name: 'search', query: { q } });
  search.value = '';
}

function openPalette() {
  paletteOpen.value = true;
}

function goToPaletteResult(index = selectedResult.value) {
  const result = paletteResults.value[index];
  if (!result) return;
  paletteOpen.value = false;
  router.push({ name: 'page', params: { path: result.path } });
}

function moveSelection(delta) {
  if (!paletteResults.value.length) return;
  selectedResult.value = (selectedResult.value + delta + paletteResults.value.length) % paletteResults.value.length;
}

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function openDailyNote() {
  if (!garden.ready) return;
  const date = localDate();
  const path = `daily/${date}.md`;
  try {
    if (!garden.docs[path]) {
      await saveNote(path, `---\ntitle: "Daily Note — ${date}"\ntags:\n  - daily\n---\n\n# ${date}\n\n`);
    }
    router.push({ name: 'page', params: { path } });
    drawer.value = false;
  } catch (error) {
    notify(error?.message || 'Could not open today’s note', 'error');
  }
}

function downloadBackup() {
  if (!garden.ready) return;
  const blob = new Blob([createBackup()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `garden-backup-${localDate()}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Garden backup downloaded');
}

async function restoreBackup() {
  if (!garden.ready || !importFile.value || importing.value) return;
  importing.value = true;
  try {
    const result = await importBackup(await importFile.value.text(), { overwrite: overwriteImports.value });
    importDialog.value = false;
    importFile.value = null;
    notify(`Imported ${result.imported} page${result.imported === 1 ? '' : 's'}; skipped ${result.skipped} existing page${result.skipped === 1 ? '' : 's'}.`);
  } catch (error) {
    notify(error?.message || 'Could not import the backup', 'error');
  } finally {
    importing.value = false;
  }
}

function onShortcut(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    openPalette();
  }
}

onMounted(() => window.addEventListener('keydown', onShortcut));
onBeforeUnmount(() => window.removeEventListener('keydown', onShortcut));
</script>

<template>
  <v-app>
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <garden-drawer
      v-model="drawer"
      @daily-note="openDailyNote"
      @export-backup="downloadBackup"
      @import-backup="importDialog = true"
    />

    <v-app-bar flat border="bottom" color="surface" role="banner">
      <template #prepend>
        <v-app-bar-nav-icon aria-label="Open navigation menu" @click="drawer = !drawer" />
      </template>

      <v-btn icon="$mdiSprout" color="primary" variant="text" class="ml-1"
        aria-label="Garden home" :to="{ name: 'home' }" />

      <v-toolbar-title class="d-none d-sm-flex flex-column ml-1">
        <span class="text-h6 font-weight-bold" style="line-height: 1.1">Garden</span>
        <span class="text-caption text-medium-emphasis" style="line-height: 1">local OPFS wiki</span>
      </v-toolbar-title>

      <v-spacer />

      <v-text-field
        v-model="search"
        class="mx-2 d-none d-md-flex"
        style="max-width: 360px; min-width: 180px"
        density="compact" variant="outlined" rounded hide-details
        aria-label="Search pages"
        placeholder="Search (Ctrl-K)"
        prepend-inner-icon="$mdiMagnify"
        clearable
        @keyup.enter="submitSearch"
      />

      <v-btn icon="$mdiMagnify" variant="text" aria-label="Open command palette"
        title="Search all pages (Ctrl+K)" @click="openPalette" />
      <v-btn icon="$mdiGraphOutline" variant="text" aria-label="Link graph" title="Link graph" :to="{ name: 'graph' }" />
      <v-btn :icon="isDark ? '$mdiWeatherSunny' : '$mdiWeatherNight'" variant="text"
        :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'"
        :title="isDark ? 'Switch to light' : 'Switch to dark'" @click="toggleTheme" />
    </v-app-bar>

    <v-main id="main-content" tabindex="-1">
      <router-view :key="viewKey" />
    </v-main>

    <v-snackbar v-model="ui.snackbar" :color="ui.color" timeout="2600"
      location="bottom right" elevation="6">
      {{ ui.text }}
    </v-snackbar>

    <v-dialog v-model="paletteOpen" max-width="640" aria-label="Search pages">
      <v-card class="command-palette">
        <v-card-text class="pb-2">
          <v-text-field
            ref="paletteField"
            v-model="paletteQuery"
            autofocus
            label="Search your garden"
            placeholder="Type a page title, tag, or phrase"
            prepend-inner-icon="$mdiMagnify"
            variant="outlined"
            hide-details
            aria-controls="palette-results"
            @keydown.down.prevent="moveSelection(1)"
            @keydown.up.prevent="moveSelection(-1)"
            @keydown.enter.prevent="goToPaletteResult()"
          />
          <div class="text-caption text-medium-emphasis mt-2">
            Search pages and content · use <kbd>↑</kbd> <kbd>↓</kbd> to navigate · <kbd>Esc</kbd> to close
          </div>
        </v-card-text>
        <v-list id="palette-results" role="listbox" aria-label="Matching pages" class="pt-0">
          <v-list-item
            v-for="(page, index) in paletteResults"
            :key="page.path"
            role="option"
            :aria-selected="selectedResult === index"
            :active="selectedResult === index"
            :title="page.title"
            :subtitle="page.path"
            prepend-icon="$mdiFileDocumentOutline"
            @mousemove="selectedResult = index"
            @click="goToPaletteResult(index)"
          />
          <v-list-item v-if="!paletteResults.length" title="No matching pages" disabled />
        </v-list>
      </v-card>
    </v-dialog>

    <v-dialog v-model="importDialog" max-width="520" aria-labelledby="import-title">
      <v-card>
        <v-card-title id="import-title" class="text-h6 pt-4">Import a Garden backup</v-card-title>
        <v-card-text>
          <p class="mb-4">Choose a Garden JSON backup. Existing pages are skipped unless you enable overwrite.</p>
          <v-file-input
            v-model="importFile"
            label="Backup file"
            accept=".json,application/json"
            prepend-icon="$mdiFileDocumentOutline"
            show-size
          />
          <v-checkbox
            v-model="overwriteImports"
            label="Overwrite pages with matching paths"
            color="primary"
            hide-details
          />
          <p class="text-caption text-medium-emphasis mt-3">
            Importing cannot be undone. Export a backup before overwriting pages you want to keep.
          </p>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="importDialog = false">Cancel</v-btn>
          <v-btn color="primary" variant="flat" :disabled="!importFile" :loading="importing" @click="restoreBackup">
            Import
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>