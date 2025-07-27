<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { Club, ClubMeeting } from '@/schema';
import { computed } from 'vue';

const props = defineProps<{
  meeting: ClubMeeting & { id: string },
  activeMeeting?: boolean,
  canManageAttendance?: boolean,
  canRsvp?: boolean,
  club: Club
}>();

defineEmits<{
  (e: 'open-attendance-modal'): void,
  (e: 'rsvp', canAttend: boolean): void
}>();

const LOCALSTORAGE_KEY = 'meeting-rsvp';
const rsvpChoice = ref<null | boolean>(null);
const meetingId = computed(() => props.meeting.id);


function loadRsvp() {
  try {
    const data = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '{}');
    const id = meetingId.value;
    if (id in data) {
      rsvpChoice.value = data[id];
    }
  } catch {
    // ignore
  }
}

function saveRsvp(choice: boolean) {
  let data: Record<string, boolean> = {};
  try {
    data = JSON.parse(localStorage.getItem(LOCALSTORAGE_KEY) || '{}');
  } catch {
    // ignore
  }
  const id = meetingId.value;
  data[id] = choice;
  localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(data));
  rsvpChoice.value = choice;
}

onMounted(loadRsvp);
</script>

<template>
  <div
    class="py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex justify-between items-start gap-3" :class="activeMeeting ? 'flex-row' : 'flex-col max-w-sm'">
    <div>
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ meeting.startTime.toDate().toLocaleDateString() }}</h3>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ meeting.description }}</p>

      <p class="font-sm text-gray-500">{{ meeting.startTime.toDate().toLocaleTimeString(undefined, { timeStyle: 'short' }) }} - {{ meeting.endTime.toDate().toLocaleTimeString(undefined, { timeStyle: 'short' }) }}</p>
    </div>

    <div v-if="meeting.slides">
      <a :href="meeting.slides" class="text-center text-gray-900 bg-white border border-gray-300 focus:outline-hidden hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 block" target="_blank">Slides</a>
    </div>

    <!-- attendance links -->
    <router-link
      v-if="canManageAttendance"
      :to="{ name: 'meeting-attendance', params: { clubId: club.id, meetingId: meeting.id } }"
      class="text-gray-900 bg-white border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium text-sm px-5 py-2.5 text-center dark:bg-gray-800 dark:text-white dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:border-gray-600 dark:focus:ring-gray-700 block"
      :class="{ 'ms-auto rounded-full': activeMeeting, 'rounded-lg': !activeMeeting }"
    >Manage attendance</router-link>
    <button
      v-if="activeMeeting"
      type="button"
      class="text-white bg-gradient-to-r from-orange-400 via-orange-500 to-orange-600 hover:bg-gradient-to-br focus:ring-4 focus:outline-none focus:ring-orange-300 dark:focus:ring-orange-800 shadow-lg shadow-orange-500/50 dark:shadow-lg dark:shadow-orange-800/80 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 block"
      @click="$emit('open-attendance-modal')"
    >
      Take attendance
    </button>

    <!-- only for non-active meetings -->
    <div v-if="canRsvp">
      <p class="font-semibold text-md text-gray-900 dark:text-white mb-3">Can you attend this meeting?</p>

      <div class="flex items-center gap-3">
        <!-- RVSP buttons -->
        <button
          :class="[
            'text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:outline-hidden focus:ring-emerald-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800 block',
            rsvpChoice !== null && rsvpChoice !== true ? 'opacity-50' : ''
          ]"
          @click="() => { saveRsvp(true); $emit('rsvp', true); }"
        >Yes</button>
        <button
          :class="[
            'text-white bg-rose-600 hover:bg-rose-700 focus:ring-4 focus:outline-hidden focus:ring-rose-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-rose-600 dark:hover:bg-rose-700 dark:focus:ring-rose-800 block',
            rsvpChoice !== null && rsvpChoice !== false ? 'opacity-50' : ''
          ]"
          @click="() => { saveRsvp(false); $emit('rsvp', false); }"
        >No</button>
      </div>
    </div>
  </div>
</template>
