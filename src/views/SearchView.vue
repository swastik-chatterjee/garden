<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { allTags, garden } from '@/services/garden';
import { highlight, runSearch } from '@/services/search';

const route = useRoute();
const router = useRouter();

const q = ref(typeof route.query.q === 'string' ? route.query.q : '');

watch(() => route.query.q, (value) => {
  const next = typeof value === 'string' ? value : '';
  if (next !== q.value) q.value = next;
}, { immediate: true });

let syncTimer = 0;
watch(q, (value) => {
  clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    const next = value.trim();
    if ((route.query.q || '') !== next) {
      router.replace({ query: { ...route.query, q: next || undefined } });
    }
  }, 250);
});

const trimmed = computed(() => q.value.trim());
const isTagQuery = computed(() => /^tag:/i.test(trimmed.value));
const tagName = computed(() => (isTagQuery.value ? trimmed.value.slice(4).trim().toLowerCase() : ''));

const result = computed(() => {
  if (!garden.ready || !trimmed.value || isTagQuery.value) return null;
  return runSearch(trimmed.value);
});

const tagged = computed(() => {
  if (!isTagQuery.value) return null;
  return allTags.value.find((t) => t.tag.toLowerCase() === tagName.value)
    ?? { tag: tagName.value, pages: [], count: 0 };
});

function go(path) { router.push({ name: 'page', params: { path } }); }
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-row justify="center">
      <v-col cols="12" md="10" lg="8">

        <v-text-field v-model="q" autofocus variant="outlined" rounded
          prepend-inner-icon="$mdiMagnify" clearable hide-details
          placeholder="Search pages, tags and content — try “gantt”, “gardn” or “tag:guide”" />

        <div v-if="!garden.ready" class="text-center py-12">
          <v-progress-circular indeterminate color="primary" />
        </div>

        <!-- browse -->
        <template v-else-if="!trimmed">
          <div class="text-h6 mt-8 mb-2">Browse by tag</div>
          <div v-if="allTags.length" class="d-flex flex-wrap ga-2 mb-8">
            <v-chip v-for="t in allTags" :key="t.tag" link label variant="tonal" color="primary"
              :to="{ name: 'search', query: { q: 'tag:' + t.tag } }">
              #{{ t.tag }} <span class="ml-1 text-medium-emphasis">{{ t.count }}</span>
            </v-chip>
          </div>
          <v-alert v-else type="info" variant="tonal">No pages yet — create one to get started.</v-alert>
          <v-alert type="info" variant="tonal" class="mt-4">
            Search is typo-tolerant, matches prefixes, boosts titles and tags, and
            supports the <code>tag:name</code> filter. Results show a context
            snippet around each match.
          </v-alert>
        </template>

        <!-- tag listing -->
        <template v-else-if="tagged">
          <div class="d-flex align-center mt-8 mb-2 flex-wrap ga-2">
            <div class="text-h6">Pages tagged</div>
            <v-chip label color="primary">#{{ tagName }}</v-chip>
            <v-spacer />
            <div class="text-caption text-medium-emphasis">{{ tagged.pages.length }} page{{ tagged.pages.length === 1 ? '' : 's' }}</div>
          </div>
          <v-list v-if="tagged.pages.length" lines="two">
            <v-list-item v-for="p in tagged.pages" :key="p.path" @click="go(p.path)">
              <v-list-item-title>{{ p.title }}</v-list-item-title>
              <v-list-item-subtitle>{{ p.path }} · {{ p.words }} words</v-list-item-subtitle>
            </v-list-item>
          </v-list>
          <v-alert v-else type="info" variant="tonal" class="mt-4">No page carries that tag yet.</v-alert>
        </template>

        <!-- full results -->
        <template v-else-if="result">
          <div class="d-flex align-center mt-6 mb-2">
            <div class="text-subtitle-1">
              {{ result.results.length }} result{{ result.results.length === 1 ? '' : 's' }}
            </div>
            <v-spacer />
            <div class="text-caption text-medium-emphasis">{{ result.ms }} ms</div>
          </div>

          <v-card v-for="r in result.results" :key="r.path" variant="outlined" class="mb-3 result-card"
            @click="go(r.path)">
            <v-card-item>
              <v-card-title><span v-html="highlight(r.title, r.terms, trimmed)" /></v-card-title>
              <v-card-subtitle>{{ r.path }}</v-card-subtitle>
            </v-card-item>
            <v-card-text v-if="r.snippet" class="snippet" v-html="r.snippet" />
            <v-card-actions v-if="r.tags.length">
              <v-chip v-for="tag in r.tags" :key="tag" size="x-small" label variant="tonal"
                :to="{ name: 'search', query: { q: 'tag:' + tag } }" @click.stop>#{{ tag }}</v-chip>
            </v-card-actions>
          </v-card>

          <v-alert v-if="!result.results.length" type="info" variant="tonal">
            Nothing matched “{{ trimmed }}”. Try fewer letters — prefix matching
            kicks in from the first characters — or browse the tag list.
          </v-alert>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>