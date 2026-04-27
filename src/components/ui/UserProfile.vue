<script setup lang="ts">
import { getCachedProfile } from '@/stores/profiles';

const { email } = defineProps<{ email: string; }>();
const profile = await getCachedProfile(email);
</script>

<template>
  <div>
    <p class="font-semibold text-gray-900 dark:text-white">{{ profile.displayName }}</p>
    <p class="text-xs text-gray-600 dark:text-gray-400">{{ email }}</p>
  </div>
</template>
