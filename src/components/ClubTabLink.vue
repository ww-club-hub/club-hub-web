<script setup lang="ts">
import type { RouteLocationAsRelativeGeneric } from 'vue-router';
import type { RouteLocationAsPathGeneric } from 'vue-router';

defineProps<{
  active: boolean,
  name: string,
  to: RouteLocationAsPathGeneric | RouteLocationAsRelativeGeneric
}>();

const inactiveClass = "inline-flex items-center justify-center p-4 border-b-2 border-transparent rounded-t-lg hover:text-gray-600 hover:border-gray-300 dark:hover:text-gray-300 group gap-2";
const activeClass = "inline-flex items-center justify-center p-4 text-orange-600 border-b-2 border-orange-600 rounded-t-lg active dark:text-orange-500 dark:border-orange-500 group gap-2"
</script>

<template>
  <li class="me-2">
    <router-link :to="to" :class="active ? activeClass : inactiveClass">
      <!-- icon -->
      <slot />
      {{ name }}
    </router-link>
  </li>
</template>
