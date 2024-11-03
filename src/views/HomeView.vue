<script setup lang="ts">
import type { RouterLink } from 'vue-router';

</script>

<template>
  <main>
    <section class="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-col">
      <p class="pt-12 pb-6 font-bold text-4xl">Welcome to your clubs.</p>
      <div class="flex items-center gap-3">
        <RouterLink to="/login" class="text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-none dark:focus:ring-orange-800">Log in</RouterLink>

        <RouterLink to="/explore" class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">Explore clubs</RouterLink>
      </div>
    </section>
  </main>
</template>
