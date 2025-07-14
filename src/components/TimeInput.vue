<script setup lang="ts">
import { onMounted } from 'vue';
import { watch } from 'vue';
import { ref } from 'vue';

const MS_IN_MINUTE = 1000 * 60;

defineProps<{
  label: string,
  required?: boolean
}>();


defineEmits<{
  "input-blur": []
}>();

// minutes since start of day
const model = defineModel<number>();
const id = `input-${crypto.randomUUID()}`;
const el = ref<HTMLInputElement>();

function onChange() {
  model.value = el.value!.valueAsNumber / MS_IN_MINUTE
}

watch(model, v => {
  if (el.value && v)
    el.value.valueAsNumber = v * MS_IN_MINUTE;
});

onMounted(() => {
  if (model.value)
    el.value!.valueAsNumber = model.value * MS_IN_MINUTE;
});
</script>

<template>
  <div>
    <label :for="id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ label }}</label>
    <input type="time" ref="el" @change="onChange" :id="id" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" :required="required" @blur="$emit('input-blur')" />
  </div>
</template>
