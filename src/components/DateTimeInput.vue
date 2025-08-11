<script setup lang="ts">
import { computed } from 'vue';

defineProps<{
  label: string,
  required?: boolean
}>();

const model = defineModel<Date>();
const id = `input-${crypto.randomUUID()}`;

const dateInputString = computed({
  get: () => {
    if (!model.value) return undefined;

    // subtract timezone offset because the datetime picker operates in UTC
    const adjustedDate = new Date(model.value.getTime() - model.value.getTimezoneOffset() * 60 * 1000);

    return adjustedDate.toISOString();
  },
  set: (value: string) => {
    const adjustedDate = new Date(Date.parse(value));
    // add back the timezone offset
    adjustedDate.setMinutes(adjustedDate.getMinutes() + adjustedDate.getTimezoneOffset());

    model.value = adjustedDate;
  }
});
</script>

<template>
  <div>
    <label :for="id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ label }}</label>
    <input type="datetime-local" v-model="dateInputString" :id="id" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" :required="required" />
  </div>
</template>
