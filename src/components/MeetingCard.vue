<script setup lang="ts">
import type { Club, ClubMeeting } from '@/schema';

defineProps<{
  meeting: ClubMeeting & { id: string },
  canTakeAttendance?: boolean,
  canManageAttendance?: boolean,
  club: Club
}>();

defineEmits<{
  (e: 'open-attendance-modal'): void,
  (e: 'rsvp', canAttend: boolean): void
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
      <a :href="meeting.slides" class="text-center text-gray-900 bg-white border border-gray-300 focus:outline-hidden hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 block" target="_blank">Slides</a>
    </div>

    <router-link v-if="canManageAttendance" :to="{ name: 'meeting-attendance', params: { clubId: club.id, meetingId: meeting.id } }" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 mb-3 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Manage attendance</router-link>
    <button v-if="canTakeAttendance" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="$emit('open-attendance-modal')">Take attendance</button>
    <div v-else class="mt-3">
      <p class="font-semibold text-md text-gray-900 dark:text-white mb-3">Can you attend this meeting?</p>

      <div class="flex items-center gap-3">
        <!-- TODO: somehow remember choice here (probably localstorage atp) -->
        <button class="text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:outline-hidden focus:ring-emerald-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800 block" @click="$emit('rsvp', true)">Yes</button>
        <button class="text-white bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:outline-hidden focus:ring-rose-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-rose-600 dark:hover:bg-rose-700 dark:focus:ring-rose-800 block" @click="$emit('rsvp', false)">No</button>
      </div>
    </div>
  </div>
</template>
