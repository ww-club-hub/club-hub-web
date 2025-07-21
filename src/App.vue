<script setup lang="ts">
import { RouterView } from 'vue-router';
import Navbar from "./components/Navbar.vue";
import Footer from "./components/Footer.vue";
import Loader from './components/Loader.vue';
</script>

<template>
  <Navbar />

  <RouterView v-slot="{ Component }">
    <template v-if="Component">
      <!-- <Transition mode="out-in" name="fade"> -->
        <Suspense>
          <component :is="Component"></component>

          <!-- TODO: fancy loading screen -->
          <template #fallback>
            <Loader/>
          </template>
        </Suspense>
      <!--  </Transition> -->
    </template>
  </RouterView>

  <Footer />
  <div id="toast-container" class="fixed bottom-3 right-3 z-50"></div>
</template>
