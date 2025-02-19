<script setup lang="ts">
import { onMounted } from 'vue';
import { watch } from 'vue';
import { ref } from 'vue';

defineProps<{
  label: string,
  required?: boolean
}>();

const model = defineModel<Date>();
const id = `input-${crypto.randomUUID()}`;
const el = ref<HTMLInputElement>();

function onChange() {
  const date = el.value!.valueAsDate!;
  date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
  model.value = date;
}

watch(model, v => {
  if (el.value && v) {
    const iso = new Date(v.getTime());
    iso.setMinutes(iso.getMinutes() - iso.getTimezoneOffset());
    el.value.value = iso.toISOString().slice(0, 16);
  }
});

onMounted(() => {
  if (model.value) {
    const iso = new Date(model.value.getTime());
    iso.setMinutes(iso.getMinutes() - iso.getTimezoneOffset());
    el.value!.value = iso.toISOString().slice(0, 16);
  }
});
</script>

<template>
  <div>
    <label :for="id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ label }}</label>
    <input type="datetime-local" ref="el" @change="onChange" :id="id" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" :required="required" />
  </div>
</template>
