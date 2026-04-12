<script setup lang="ts" generic="TItem extends string | number">
// multiselect input with integer keys

defineProps<{
  label: string,
  options: { value: TItem, label: string }[],
  disabled?: boolean
}>();

const model = defineModel<Set<TItem>>({ default: [] });
const id = `multi-select-${crypto.randomUUID()}`;
</script>

<template>
  <div>
    <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">{{ label }}</label>
    <div class="space-y-2">
      <div 
        v-for="option in options" 
        :key="option.value"
        class="flex items-center"
      >
        <input 
          :id="`${id}-${option.value}`"
          type="checkbox"
          v-model="model"
          :disabled="disabled"
          :value="option.value"
          class="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <label 
          :for="`${id}-${option.value}`"
          :class="[
            'ms-2 text-sm font-medium',
            disabled 
              ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
              : 'text-gray-900 dark:text-gray-300 cursor-pointer'
          ]"
        >
          {{ option.label }}
        </label>
      </div>
    </div>
  </div>
</template>
