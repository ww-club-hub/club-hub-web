<script setup lang="ts">
import type { RouterLink } from 'vue-router';

</script>

<template>
  <main>
    <!-- Page 1 -->
    <section
      class="text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-col h-[calc(100vh-4rem)]">

      <p class="pt-12 pb-6 font-bold text-4xl">Welcome to your clubs.</p>
      <div class="flex items-center gap-3">
        <RouterLink to="/login"
          class="text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800">
          Log in</RouterLink>

        <RouterLink to="/clubs"
          class="text-gray-900 bg-white border border-gray-300 focus:outline-hidden hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
          Explore clubs</RouterLink>
      </div>

      <img src="@/assets/landing/dashboard-preview.png" alt="Dashboard Preview" class="m-8 w-5/6 md:w-3/4 lg:w-7/12" />

    </section>

    <!-- Page 2 -->
    <section
      class="text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 flex items-center justify-center flex-col h-[calc(100vh-4rem)]">

      <div class="flex items-center gap-3 mx-16">

        <div>

          <p class="pt-12 pb-6 font-bold text-4xl">
            Club Management
            <br />made simple.
          </p>

          <p class="mb-4">Club Hub aims to simplify the administrative tasks involved with managing clubs at schools, for both club officers and school administrators. It also makes it easier for students to find and manage their own clubs.</p>

          <div class="flex items-center gap-3 md:mb-16">
            <RouterLink to="/login"
              class="text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800">
              Log in</RouterLink>

            <RouterLink to="/explore"
              class="text-gray-900 bg-white border border-gray-300 focus:outline-hidden hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700">
              Explore clubs</RouterLink>
          </div>

        </div>

        <img src="@/assets/landing/dashboard-preview.png" alt="Dashboard Preview"
          class="hidden w-full md:block md:w-auto w-5/6 md:w-3/5 lg:w-7/12" />
      </div>

      <img src="@/assets/landing/dashboard-preview.png" alt="Dashboard Preview"
          class="block w-full md:hidden mt-8 md:w-auto w-4/5 mb-16" />

    </section>
  </main>
</template>
