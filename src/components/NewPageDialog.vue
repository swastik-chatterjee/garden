<script setup>
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { folders, suggestPath } from '@/services/garden';

const props = defineProps({ modelValue: Boolean });
const emit = defineEmits(['update:modelValue']);
const router = useRouter();

const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
});

const title = ref('');
const folder = ref('');

watch(open, (v) => {
  if (v) { title.value = ''; folder.value = ''; }
});

const folderItems = computed(() => folders.value.map((f) => f.folder).filter(Boolean));
const preview = computed(() => (title.value.trim() ? suggestPath(folder.value, title.value.trim()) : ''));

function create() {
  if (!title.value.trim()) return;
  router.push({
    name: 'edit',
    params: { path: 'new' },
    query: { title: title.value.trim(), folder: folder.value.trim() },
  });
  open.value = false;
}
</script>

<template>
  <v-dialog v-model="open" max-width="480">
    <v-card>
      <v-card-title class="text-h6 pt-4">Plant a new page</v-card-title>
      <v-card-text>
        <v-text-field v-model="title" label="Title" autofocus
          hint="Becomes the page's heading and its file name." persistent-hint
          @keydown.enter.prevent="create" />
        <v-combobox v-model="folder" :items="folderItems" label="Folder" class="mt-2"
          hint="An existing folder, a new one — or empty for the top level." persistent-hint />
        <div v-if="preview" class="text-caption text-medium-emphasis mt-2">
          Will be saved as <code>{{ preview }}</code>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="open = false">Cancel</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!preview" @click="create">Create</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>