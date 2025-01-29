<script setup lang="ts">
defineProps<{
  active: boolean,
  name: string,
  url: string
}>();

const activeClasses = "block py-2 px-3 text-white bg-orange-700 rounded-sm md:bg-transparent md:text-orange-700 md:p-0 dark:text-white md:dark:text-orange-500 font-semibold";
const inactiveClasses = "block py-2 px-3 text-gray-900 rounded-sm hover:bg-gray-100 md:hover:bg-transparent md:border-0 md:hover:text-orange-700 md:p-0 dark:text-white md:dark:hover:text-orange-500 dark:hover:bg-gray-700 dark:hover:text-white md:dark:hover:bg-transparent";
</script>

<template>
  <li>
    <RouterLink :to="url" :class="active ? activeClasses : inactiveClasses"
       :aria-current="active ? 'page' : null">
      {{ name }}
    </RouterLink>
  </li>
</template>
