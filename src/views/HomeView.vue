<script setup>
import { computed, ref } from 'vue';
import NewPageDialog from '@/components/NewPageDialog.vue';
import {
  allTags, formatBytes, formatDate, garden, linkStats, pages, recent,
} from '@/services/garden';

const newPage = ref(false);

const usagePct = computed(() => {
  const { usage, quota } = garden.stats;
  return quota > 0 ? Math.min(100, (usage / quota) * 100) : 0;
});

const cards = computed(() => [
  { icon: '$mdiFileDocumentOutline', label: 'Pages', value: String(pages.value.length || 0) },
  { icon: '$mdiTagOutline', label: 'Tags', value: String(allTags.value.length || 0) },
  { icon: '$mdiLinkVariant', label: 'Wikilinks', value: String(linkStats.value.resolved || 0) },
]);
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-row justify="center">
      <v-col cols="12" xl="10">

        <div v-if="!garden.ready && !garden.error" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" size="48" />
        </div>

        <v-alert v-else-if="garden.error" type="error" variant="tonal">{{ garden.error }}</v-alert>

        <template v-else>
          <v-card class="hero pa-6 pa-md-8 mb-6" variant="outlined">
            <div class="d-flex flex-wrap align-center">
              <v-avatar color="primary" size="56" class="mr-4 mb-2">
                <v-icon icon="$mdiSprout" size="32" />
              </v-avatar>
              <div>
                <div class="text-h4 font-weight-bold">Your digital garden</div>
                <div class="text-body-2 text-medium-emphasis">
                  Markdown · Mermaid · full-text search — stored locally in your
                  browser's OPFS. No server, no account.
                </div>
              </div>
            </div>
            <div class="d-flex flex-wrap ga-3 mt-6">
              <v-btn color="primary" variant="flat" prepend-icon="$mdiFilePlusOutline" @click="newPage = true">
                New page
              </v-btn>
              <v-btn variant="tonal" prepend-icon="$mdiGraphOutline" :to="{ name: 'graph' }">Link graph</v-btn>
              <v-btn variant="tonal" prepend-icon="$mdiMagnify" :to="{ name: 'search' }">Search</v-btn>
            </div>
          </v-card>

          <v-row dense class="mb-6">
            <v-col v-for="c in cards" :key="c.label" cols="6" md="3">
              <v-card variant="outlined" class="pa-4 fill-height">
                <div class="d-flex align-center">
                  <v-icon :icon="c.icon" color="primary" size="28" class="mr-3" />
                  <div>
                    <div class="text-h5 font-weight-bold">{{ c.value }}</div>
                    <div class="text-caption text-medium-emphasis">{{ c.label }}</div>
                  </div>
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" md="3">
              <v-card variant="outlined" class="pa-4 fill-height">
                <div class="text-caption text-medium-emphasis mb-1">OPFS storage</div>
                <div class="text-h6">
                  {{ formatBytes(garden.stats.usage) }}
                  <span v-if="garden.stats.quota" class="text-caption text-medium-emphasis">
                    of {{ formatBytes(garden.stats.quota) }}
                  </span>
                </div>
                <v-progress-linear :model-value="usagePct" color="primary" height="6" rounded class="mt-2" />
              </v-card>
            </v-col>
          </v-row>

          <div class="d-flex align-center mb-2">
            <div class="text-h6">Recently tended</div>
            <v-spacer />
            <v-btn variant="text" size="small" :to="{ name: 'search' }">Browse everything</v-btn>
          </div>
          <v-list v-if="recent.length" lines="two">
            <v-list-item v-for="p in recent" :key="p.path" :to="{ name: 'page', params: { path: p.path } }">
              <template #prepend>
                <v-icon icon="$mdiFileDocumentOutline" color="primary" />
              </template>
              <v-list-item-title>{{ p.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ p.path }} · {{ formatDate(p.modified) }}</v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </template>

        <new-page-dialog v-model="newPage" />
      </v-col>
    </v-row>
  </v-container>
</template>