<script setup lang="ts">
import type { ClubMeetingTime } from '@/schema';

defineModel<ClubMeetingTime[]>({ default: [] });
</script>

<template>
  <table class="overflow-hidden relative rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 w-full border-separate border-spacing-0">
    <thead class="text-sm text-gray-800 uppercase bg-gray-50 dark:bg-gray-950 dark:text-gray-300">
      <tr>
        <th class="px-6 py-3">Sunday</th>
        <th class="px-6 py-3">Monday</th>
        <th class="px-6 py-3">Tuesday</th>
        <th class="px-6 py-3">Wednesday</th>
        <th class="px-6 py-3">Thursday</th>
        <th class="px-6 py-3">Friday</th>
        <th class="px-6 py-3">Saturday</th>
        <th class="px-6 py-3">Flex</th>
      </tr>
    </thead>
    <tbody>
      <tr class="not-last:border-b dark:border-gray-700 border-gray-200">
        <th>hi</th>
      </tr>
      <tr class="not-last:border-b dark:border-gray-700 border-gray-200">
        <th>hi</th>
      </tr>
    </tbody>
  </table>
</template>
