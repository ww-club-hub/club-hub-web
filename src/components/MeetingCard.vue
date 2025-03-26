<script setup lang="ts">
import type { Club, ClubMeeting } from '@/schema';

 defineProps<{
   meeting: ClubMeeting & { id: string },
   showAttendance?: boolean,
   club: Club
 }>();
</script>

<template>
  <div
    class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex justify-between flex-col">
    <div>
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ meeting.startTime.toDate().toLocaleDateString() }}</h3>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ meeting.description }}</p>

      <p class="mb-3 font-sm text-gray-500">{{ meeting.startTime.toDate().toLocaleTimeString() }} - {{ meeting.endTime.toDate().toLocaleTimeString() }}</p>
    </div>
    <div v-if="meeting.slides" class="mb-3">
      <a :href="meeting.slides" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" target="_blank">Slides</a>
    </div>

    <router-link v-if="showAttendance" :to="{ name: 'meeting-attendance', params: { clubId: club.id, meetingId: meeting.id } }" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Take attendance</router-link>
  </div>
</template>
