<script setup lang="ts">
defineProps<{
  label: string,
  type: "text" | "email" | "url" | "date" | "number",
  required?: boolean,
  // when labelStyle is placeholder, the `label` is shown as the placeholder, unless an explicit placeholder is given
  labelStyle?: "placeholder" | "normal",
  placeholder?: string,
  min?: string | number,
  max?: string | number
}>();

defineEmits<{
  "input-blur": [],
  "input-change": []
}>();

const model = defineModel();
const id = `input-${crypto.randomUUID()}`;
</script>

<template>
  <div>
    <label v-if="labelStyle !== 'placeholder'" :for="id" class="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">{{ label }}</label>
    <input :type="type" v-model="model" :id="id" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" :required="required" :placeholder="placeholder ?? (labelStyle === 'placeholder' ? label : '')" @blur="$emit('input-blur')"  @input="$emit('input-change')" :min="min" :max="max" />
  </div>
</template>
