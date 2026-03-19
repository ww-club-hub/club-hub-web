<script setup lang="ts">
defineProps<{
  active: boolean,
  done: boolean,
  name: string
}>();
</script>

<template>
  <li class="flex items-start">
    <!-- icon -->
    <svg class="w-6 h-6 me-2 text-green-500 dark:text-green-400 shrink-0 mt-1" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" v-if="done">
      <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 me-2 text-orange-500 dark:text-orange-400 shrink-0 mt-1" v-else-if="active">
      <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm4.28 10.28a.75.75 0 0 0 0-1.06l-3-3a.75.75 0 1 0-1.06 1.06l1.72 1.72H8.25a.75.75 0 0 0 0 1.5h5.69l-1.72 1.72a.75.75 0 1 0 1.06 1.06l3-3Z" clip-rule="evenodd" />
    </svg>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 me-2 text-gray-500 dark:text-gray-400 shrink-0 mt-1" v-else>
      <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm3 10.5a.75.75 0 0 0 0-1.5H9a.75.75 0 0 0 0 1.5h6Z" clip-rule="evenodd" />
    </svg>

    <div class="text-gray-700 dark:text-gray-200">
      <span class="text-lg" :class="{ 'text-gray-900 dark:text-white': active, 'text-gray-500 dark:text-gray-400': !active }">{{ name }}</span>
      <slot v-if="active"></slot>
    </div>
  </li>
</template>
