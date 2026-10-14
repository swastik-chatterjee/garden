<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useTheme } from 'vuetify';
import { garden, graphMermaid } from '@/services/garden';
import { applyMermaidTheme, renderMermaidText } from '@/services/mermaid';

const theme = useTheme();
const surface = ref(null);
const model = ref(null);

const isDark = computed(() => theme.global.current.value.dark);
const orphanPages = computed(() =>
  model.value ? model.value.orphans.map((p) => garden.docs[p]).filter(Boolean) : []
);

async function build() {
  if (!garden.ready) return;
  model.value = graphMermaid();
  await nextTick();
  await applyMermaidTheme(isDark.value);
  if (surface.value && model.value.pages) {
    await renderMermaidText(surface.value, model.value.text);
  }
}

watch(() => garden.ready, () => build());
watch(isDark, () => build());
onMounted(() => build());
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-row justify="center">
      <v-col cols="12" xl="10">

        <div class="d-flex flex-wrap align-center mb-4 ga-2">
          <div class="text-h5 font-weight-bold mr-2">Link graph</div>
          <v-chip label variant="tonal" size="small" prepend-icon="mdi-file-document-outline">
            {{ model?.pages ?? '…' }} pages
          </v-chip>
          <v-chip label variant="tonal" size="small" prepend-icon="mdi-link-variant">
          
          </v-chip>
          <v-chip v-if="model?.orphans?.length" label variant="tonal" size="small" color="warning">
            {{ model.orphans.length }} orphans
          </v-chip>
          <v-spacer />
          <div class="text-caption text-medium-emphasis d-none d-sm-block">
            Folders become subgraphs — drawn live with Mermaid.
          </div>
        </div>

        <v-alert v-if="!garden.ready && !garden.error" type="info" variant="tonal" class="mb-4">
          Loading the garden…
        </v-alert>
        <v-alert v-else-if="garden.error" type="error" variant="tonal">{{ garden.error }}</v-alert>
        <v-alert v-else-if="!model?.pages" type="info" variant="tonal">
          No pages yet — plant one first.
        </v-alert>
        <div v-else ref="surface" class="graph-surface" />

        <v-alert v-if="model?.truncated" type="warning" variant="tonal" density="compact" class="mt-4">
          Large garden — only the best-connected pages are drawn.
        </v-alert>

        <template v-if="orphanPages.length">
          <div class="text-overline text-medium-emphasis mt-6 mb-2">Orphans — no links in or out</div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip v-for="p in orphanPages" :key="p.path" size="small" label link variant="tonal"
              :to="{ name: 'page', params: { path: p.path } }">{{ p.title }}</v-chip>
          </div>
        </template>
      </v-col>
    </v-row>
  </v-container>
</template>  {{ model?.edges ?? '…' }} links