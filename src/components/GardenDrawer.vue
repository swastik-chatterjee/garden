<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import NewPageDialog from './NewPageDialog.vue';
import { allTags, folders, formatBytes, garden, pages } from '@/services/garden';

defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);

const route = useRoute();
const dialog = ref(false);
const opened = ref([]);

const currentPath = computed(() =>
  typeof route.params.path === 'string' ? route.params.path : ''
);

watch(currentPath, (path) => {
  if (path.includes('/')) opened.value = [path.slice(0, path.lastIndexOf('/'))];
}, { immediate: true });
</script>

<template>
  <v-navigation-drawer :model-value="modelValue" width="300"
    @update:model-value="emit('update:modelValue', $event)">

    <div class="pa-4 pb-2">
      <v-btn block color="primary" variant="flat" size="large"
        prepend-icon="mdi-file-plus-outline" @click="dialog = true">
        New page
      </v-btn>
      <div class="text-caption text-medium-emphasis mt-3">
        {{ garden.ready
          ? pages.length + ' pages · ' + formatBytes(garden.stats.usage) + ' in OPFS'
          : 'Opening the garden…' }}
      </div>
    </div>

    <v-list v-model:opened="opened" nav density="compact">
      <v-list-item prepend-icon="mdi-home-outline" title="Home" :to="{ name: 'home' }" />
      <v-list-item prepend-icon="mdi-magnify" title="Search" :to="{ name: 'search' }" />
      <v-list-item prepend-icon="mdi-graph-outline" title="Link graph" :to="{ name: 'graph' }" />
      <v-divider class="my-2" />
      <v-list-subheader>Pages</v-list-subheader>

      <v-list-group v-for="group in folders" :key="group.folder || '~'" :value="group.folder">
        <template #activator="{ props }">
          <v-list-item v-bind="props" prepend-icon="mdi-folder-outline"
            :title="group.folder || 'Top level'" />
        </template>
        <v-list-item v-for="p in group.list" :key="p.path" :title="p.title"
          :to="{ name: 'page', params: { path: p.path } }" :active="currentPath === p.path" />
      </v-list-group>

      <v-list-item v-if="garden.ready && !pages.length" title="No pages yet" disabled />
    </v-list>

    <template #append>
      <div class="pa-4">
        <div class="text-overline text-medium-emphasis mb-1">Tags</div>
        <div v-if="allTags.length" class="d-flex flex-wrap ga-1">
          <v-chip v-for="t in allTags" :key="t.tag" size="x-small" label variant="tonal" link
            :to="{ name: 'search', query: { q: 'tag:' + t.tag } }">
            #{{ t.tag }} · {{ t.count }}
          </v-chip>
        </div>
        <div v-else class="text-caption text-medium-emphasis">Tags appear here as you add them.</div>
      </div>
    </template>

    <new-page-dialog v-model="dialog" />
  </v-navigation-drawer>
</template>