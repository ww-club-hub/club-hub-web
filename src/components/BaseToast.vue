<template>
  <div :class="isHidden ? 'opacity-0' : 'opacity-100'" class="mt-3 transition-opacity flex items-center w-screen max-w-xs p-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800" role="alert">
    <div class="inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg" :class="colorVariants[iconColor]">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" v-if="iconColor === 'green'">
        <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" v-else-if="iconColor === 'red'">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4" v-else>
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
      </svg>

      <span class="sr-only">{{ iconSrText }}</span>
    </div>
    <div class="ml-3 text-sm font-medium">{{ text }}</div>
    <button type="button" class="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" aria-label="close" @click="closeEarly()">
      <span class="sr-only">Close</span>
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 stroke-2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>
<script setup lang="ts">
const colorVariants = {
  "green": "text-green-500 bg-green-100 dark:bg-green-800 dark:text-green-200",
  "red": "text-red-500 bg-red-100 dark:bg-red-800 dark:text-red-200",
  "yellow": "text-yellow-500 bg-yellow-100 dark:bg-yellow-800 dark:text-yellow-200",
};

defineProps<{
  iconColor: "green" | "red" | "yellow";
  iconSrText: string;
  text: string;
  isHidden: boolean;
  closeEarly(): void;
}>();
</script>
