<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { garden, getNote, notify, saveNote, suggestPath } from '@/services/garden';

const props = defineProps({ path: { type: String, default: '' } });
const router = useRouter();
const content = ref('');
const loaded = ref(false);
const saving = ref(false);

const isNew = computed(() => props.path === 'new');
const heading = computed(() => isNew.value ? 'New page' : `Edit ${props.path}`);

watch([() => garden.ready, () => props.path], () => {
  if (!garden.ready) return;
  const note = isNew.value ? null : getNote(props.path);
  content.value = note?.raw || (isNew.value ? newPageContent() : '');
  loaded.value = true;
}, { immediate: true });

async function save() {
  if (!content.value.trim() || saving.value) return;
  saving.value = true;
  try {
    const title = content.value.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '') || 'Untitled';
    const path = isNew.value
      ? suggestPath(String(router.currentRoute.value.query.folder || ''), title)
      : props.path;
    await saveNote(path, content.value);
    notify(`Saved ${path}`);
    await router.replace({ name: 'page', params: { path } });
  } catch (error) {
    notify(error?.message || 'Could not save the page', 'error');
  } finally {
    saving.value = false;
  }
}

function newPageContent() {
  const title = String(router.currentRoute.value.query.title || 'Untitled').trim();
  return `---\ntitle: ${JSON.stringify(title)}\ntags: []\n---\n\n# ${title}\n\n`;
}
</script>

<template>
  <v-container fluid class="pa-4 pa-md-6">
    <v-row justify="center">
      <v-col cols="12" xl="10">
        <div class="d-flex align-center ga-3 mb-4">
          <h1 class="text-h5 font-weight-bold">{{ heading }}</h1>
          <v-spacer />
          <v-btn variant="text" @click="router.back()">Cancel</v-btn>
          <v-btn color="primary" variant="flat" prepend-icon="mdi-content-save-outline"
            :disabled="!loaded || !content.trim()" :loading="saving" @click="save">
            Save
          </v-btn>
        </div>
        <v-textarea v-model="content" label="Markdown" variant="outlined" auto-grow
          :min-rows="24" spellcheck class="editor-source" />
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.editor-source :deep(textarea) {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  line-height: 1.6;
}
</style>