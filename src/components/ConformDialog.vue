<script setup>
defineProps({
  modelValue: Boolean,
  title: { type: String, default: 'Are you sure?' },
  text: { type: String, default: '' },
  confirmText: { type: String, default: 'Confirm' },
  cancelText: { type: String, default: 'Cancel' },
  color: { type: String, default: 'primary' },
});
defineEmits(['update:modelValue', 'confirm']);
</script>

<template>
  <v-dialog :model-value="modelValue" max-width="420"
    @update:model-value="$emit('update:modelValue', $event)">
    <v-card>
      <v-card-title class="text-h6 pt-4">{{ title }}</v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">{{ text }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="$emit('update:modelValue', false)">{{ cancelText }}</v-btn>
        <v-btn :color="color" variant="flat" @click="$emit('confirm')">{{ confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>