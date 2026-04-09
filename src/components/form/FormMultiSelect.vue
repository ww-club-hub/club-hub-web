<script setup lang="ts">
// multiselect input with integer keys

defineProps<{
  label: string,
  options: { value: number, label: string }[],
  disabled?: boolean
}>();

const model = defineModel<number[]>({ default: [] });
const id = `multi-select-${crypto.randomUUID()}`;

function toggleOption(value: number) {
  const index = model.value.indexOf(value);
  if (index === -1) {
    model.value.push(value);
  } else {
    model.value.splice(index, 1);
  }
}

function isChecked(value: number): boolean {
  return model.value.includes(value);
}
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
          :checked="isChecked(option.value)"
          :disabled="disabled"
          @change="toggleOption(option.value)"
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
