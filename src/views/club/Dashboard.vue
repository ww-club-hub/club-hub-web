<script setup lang="ts">
import type { Club, ClubRole, ClubUpdate } from '@/schema';
import { useRoute } from 'vue-router';

const route = useRoute();
const clubId = route.params.clubId as string;

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

// TODO: actually implement updates
const updates: ClubUpdate[] = [{
  creator: "example@example.com",
  title: "Example update",
  description: "Hi",
  links: {
    "https://club-hub.org": "More info"
  },
  timestamp: new Date()
}];

const meetings: unknown[] = [];
</script>

<template>
  <div class="md:grid grid-cols-3 gap-4">
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Officer updates:</h2>
      <div v-if="updates.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <div v-for="update, i in updates" :key="i" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
          <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ update.title }}</h3>
          <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ update.description }}</p>

          <div class="mb-3 flex gap-2 flex-wrap">
            <a v-for="text, link, i in update.links" :key="i" :href="link" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" target="_blank">{{ text }}</a>
          </div>

          <!-- date -->
          <p class="text-sm uppercase font-normal text-gray-600 dark:text-gray-500">{{ update.timestamp.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) }}</p>
        </div>
      </div>
      <p v-else class="italic text-black dark:text-white">No updates yet...</p>
    </div>
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Upcoming meetings:</h2>

      <div v-if="meetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <div v-for="meeting, i in meetings" :key="i" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
        </div>
      </div>
      <p v-else class="italic text-black dark:text-white">No upcoming meetings...</p>
    </div>
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Help:</h2>

      <p class="mb-2"><router-link :to="{ name: 'club-dashboard', params: { clubId  } }" class="text-sky-500 hover:underline hover:text-sky-600 dark:hover:text-sky-400">Officer Info</router-link></p>
      <p class="mb-2 text-black dark:text-white">Contact: <a :href="`mailto:${club.contact.email}`" class="text-sky-500 hover:underline hover:text-sky-600 dark:hover:text-sky-400">{{ club.contact.email }}</a></p>
      <p class="mb-2 text-black dark:text-white">Sponsor: <a :href="`mailto:${club.contact.sponsor}`" class="text-sky-500 hover:underline hover:text-sky-600 dark:hover:text-sky-400">{{ club.contact.sponsor }}</a></p>
    </div>
  </div>
</template>
