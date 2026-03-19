<script setup lang="ts" generic="TItem extends PropertyKey">
defineProps<{
  label: string,
  options: { value: TItem, label: string, disabled?: boolean }[],
  required?: boolean,
  id?: string
}>();

const model = defineModel<TItem>();
const id = `_${crypto.randomUUID()}`
</script>

<template>
  <div>
    <label :for="id" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ label }}</label>
    <select
      :id="id"
      v-model="model"
      :required="required"
      class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500"
    >
      <!-- default option -->
      <option disabled selected value="">Choose an option</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
