<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTheme } from 'vuetify';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import {
  backlinksTo, deleteNote, formatBytes, formatDate, garden, notify,
  outgoingOf, resolveWiki,
} from '@/services/garden';
import { applyMermaidTheme, renderMermaidBlocks } from '@/services/mermaid';

const props = defineProps({ path: { type: String, default: '' } });
const route = useRoute();
const router = useRouter();
const theme = useTheme();

const content = ref(null);
const toc = ref([]);
const confirmDelete = ref(false);

const note = computed(() => (garden.ready ? garden.docs[props.path] : undefined));
const backlinks = computed(() => (note.value ? backlinksTo(props.path) : []));
const outgoing = computed(() => (note.value ? outgoingOf(props.path) : []));
const asideVisible = computed(() => toc.value.length > 0 || backlinks.value.length > 0);

const isDark = computed(() => theme.global.current.value.dark);

const suggestedTitle = computed(() =>
  props.path.split('/').pop().replace(/\.md$/i, '').replace(/[-_]+/g, ' ')
);
const missingFolder = computed(() =>
  props.path.includes('/') ? props.path.slice(0, props.path.lastIndexOf('/')) : ''
);

watch([() => note.value?.html, isDark], () => paint(), { immediate: true });
onMounted(() => paint());

async function paint() {
  if (!note.value) { toc.value = []; return; }
  await nextTick();
  const root = content.value;
  if (!root) return;

  buildToc(root);
  decorate(root);

  await applyMermaidTheme(isDark.value);
  await renderMermaidBlocks(root);

  const anchor = typeof route.query.a === 'string' ? route.query.a : '';
  if (anchor) scrollToAnchor(anchor);
}

function buildToc(root) {
  toc.value = Array.from(root.querySelectorAll('h1, h2, h3, h4'))
    .filter((h) => h.id)
    .map((h) => ({ id: h.id, level: Number(h.tagName.slice(1)), text: h.textContent.trim() }));
}

function decorate(root) {
  root.querySelectorAll('a.wikilink').forEach((a) => {
    const target = a.dataset.wikilink || '';
    const hit = resolveWiki(target);
    a.classList.toggle('wikilink--missing', !hit);
    if (hit) {
      a.dataset.resolved = hit;
      a.title = garden.docs[hit]?.title || target;
    } else {
      a.title = `“${target}” doesn't exist yet — click to plant it`;
    }
  });
  root.querySelectorAll('a[href^="http"]').forEach((a) => {
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  });
}

function onClick(event) {
  const a = event.target.closest('a');
  if (!a) return;

  if (a.classList.contains('wikilink')) {
    event.preventDefault();
    const target = a.dataset.wikilink || '';
    const hit = resolveWiki(target);
    if (hit) {
      const section = a.dataset.anchor || '';
      if (hit === props.path) { if (section) scrollToAnchor(section); return; }
      router.push({ name: 'page', params: { path: hit }, query: section ? { a: section } : {} });
    } else {
      router.push({
        name: 'edit', params: { path: 'new' },
        query: { title: target, folder: note.value?.folder || '' },
      });
      notify(`Drafting “${target}”`, 'info');
    }
    return;
  }

  const href = a.getAttribute('href') || '';
  if (href.startsWith('#')) {
    event.preventDefault();
    scrollToAnchor(decodeURIComponent(href.slice(1)));
  }
}

function openOutgoing(o) {
  if (o.kind === 'page') router.push({ name: 'page', params: { path: o.path } });
  else {
    router.push({
      name: 'edit', params: { path: 'new' },
      query: { title: o.target, folder: note.value?.folder || '' },
    });
    notify(`Drafting “${o.target}”`, 'info');
  }
}

function scrollToHeading(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function scrollToAnchor(text) {
  const wanted = anchorSlug(text);
  const root = content.value;
  if (!root) return;
  const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4, h5, h6'));
  const el =
    headings.find((h) => h.id === wanted) ||
    headings.find((h) => (h.textContent || '').trim().toLowerCase() === String(text).trim().toLowerCase());
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else notify(`No section called “${text}”`, 'info');
}

function anchorSlug(text) {
  return encodeURIComponent(String(text).trim().toLowerCase().replace(/\s+/g, '-'));
}

async function onDelete() {
  confirmDelete.value = false;
  const path = props.path;
  await deleteNote(path);
  notify(`Deleted ${path}`);
  router.replace({ name: 'home' });
}
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">

    <v-row v-if="!garden.ready && !garden.error" justify="center">
      <v-col cols="12" md="10" lg="8">
        <v-skeleton-loader type="article" boilerplate />
      </v-col>
    </v-row>

    <v-row v-else-if="garden.error" justify="center">
      <v-col cols="12" md="8">
        <v-alert type="error" prominent title="Garden couldn't start">{{ garden.error }}</v-alert>
      </v-col>
    </v-row>

    <v-row v-else-if="note" justify="center">
      <v-col cols="12" :lg="asideVisible ? 8 : 9" :xl="asideVisible ? 8 : 9">

        <div class="d-flex flex-wrap align-center ga-2 mb-2">
          <v-chip v-if="note.folder" size="small" label variant="tonal" prepend-icon="mdi-folder-outline">
            {{ note.folder }}/
          </v-chip>
          <v-chip v-for="tag in note.tags" :key="tag" size="small" label link variant="tonal" color="primary"
            :to="{ name: 'search', query: { q: 'tag:' + tag } }" title="Search this tag">
            #{{ tag }}
          </v-chip>
          <v-spacer />
          <v-btn size="small" variant="text" prepend-icon="mdi-pencil-outline"
            :to="{ name: 'edit', params: { path: note.path } }">Edit</v-btn>
          <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete-outline"
            @click="confirmDelete = true">Delete</v-btn>
        </div>

        <h1 class="text-h4 text-md-h3 font-weight-bold mb-1">{{ note.title }}</h1>
        <div class="text-caption text-medium-emphasis mb-6">
          {{ formatDate(note.modified) }} · {{ note.words }} words · {{ formatBytes(note.size) }}
        </div>

        <div ref="content" class="markdown-body" v-html="note.html" @click="onClick" />

        <template v-if="outgoing.length">
          <v-divider class="my-8" />
          <div class="text-overline text-medium-emphasis mb-2">Links from this page</div>
          <div class="d-flex flex-wrap ga-2">
            <v-chip v-for="o in outgoing" :key="o.key" size="small" label link variant="tonal"
              :color="o.kind === 'page' ? 'primary' : 'default'"
              :style="o.kind === 'missing' ? 'opacity: .75' : ''"
              @click="openOutgoing(o)">
              {{ o.kind === 'page' ? o.title : o.target + ' · new' }}
            </v-chip>
          </div>
        </template>
      </v-col>

      <v-col v-if="asideVisible" cols="12" lg="4" xl="3">
        <v-card v-if="toc.length" variant="outlined" class="toc-card mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">On this page</v-card-title>
          <v-card-text class="pt-0">
            <a v-for="h in toc" :key="h.id" class="toc-line d-block"
              :style="{ paddingLeft: (h.level - 1) * 14 + 'px' }" @click="scrollToHeading(h.id)">
              {{ h.text }}
            </a>
          </v-card-text>
        </v-card>

        <v-card v-if="backlinks.length" variant="outlined">
          <v-card-title class="text-subtitle-1 font-weight-bold">
            {{ backlinks.length }} page{{ backlinks.length === 1 ? '' : 's' }} link here
          </v-card-title>
          <v-card-text class="pt-0">
            <div v-for="b in backlinks" :key="b.path" class="mb-4">
              <a class="text-body-2 font-weight-medium garden-link"
                @click="router.push({ name: 'page', params: { path: b.path } })">{{ b.title }}</a>
              <div v-if="b.context" class="text-caption text-medium-emphasis wiki-context">{{ b.context }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-else justify="center">
      <v-col cols="12" md="8" lg="6">
        <v-card variant="outlined" class="pa-8 text-center">
          <v-icon icon="mdi-sprout" size="48" color="primary" class="mb-4" />
          <div class="text-h6 mb-1">“{{ suggestedTitle }}” hasn't been planted yet</div>
          <div class="text-body-2 text-medium-emphasis mb-6">
            Nothing lives at <code>{{ path }}</code>. One click and you're in the editor.
          </div>
          <v-btn color="primary" prepend-icon="mdi-pencil-outline"
            :to="{ name: 'edit', params: { path: 'new' }, query: { title: suggestedTitle, folder: missingFolder } }">
            Create this page
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <confirm-dialog v-model="confirmDelete" title="Delete this page?"
      :text="`This removes ${path} from OPFS. There is no trash bin — be sure.`"
      confirm-text="Delete" color="error" @confirm="onDelete" />
  </v-container>
</template>