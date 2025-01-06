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
</template>
