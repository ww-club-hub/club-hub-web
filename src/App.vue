<script setup lang="ts">
import { RouterView } from 'vue-router';
import Navbar from "./components/Navbar.vue";

</script>

<template>
  <Navbar />
  
  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <Transition mode="out-in" name="fade">
        <Suspense>
          <component :is="Component"></component>

          <!-- TODO: fancy loading screen -->
          <template #fallback>
            Loading...
          </template>
        </Suspense>
      </Transition>
    </template>
  </RouterView>

  <div class="mt-3 py-3 mx-auto text-gray-600 dark:text-gray-300">
    Copyright &copy; 2025 Club Hub
    <router-link to="/privacy" class="text-blue-500 hover:underline ms-2">Privacy</router-link>
  </div>
</template>
