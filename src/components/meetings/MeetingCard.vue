<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import type { Club, ClubMeeting } from '@/schema';
import { computed } from 'vue';

const props = defineProps<{
  meeting: ClubMeeting & { id: string },
  activeMeeting?: boolean,
  isPast?: boolean,
  canManageAttendance?: boolean,
  attendanceTaken?: boolean,
  canRsvp?: boolean,
  canDelete?: boolean,
  attendanceStatus?: boolean | null,
  club: Club
}>();

defineEmits<{
  (e: 'open-attendance-modal'): void,
  (e: 'rsvp', canAttend: boolean): void,
  (e: 'delete'): void
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
    class="py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex justify-between items-start gap-3 relative" :class="activeMeeting ? 'flex-row' : 'flex-col max-w-sm'">
    <!-- Delete button in upper right -->
    <button
      v-if="canDelete"
      type="button"
      class="absolute top-3 right-3 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
      @click="$emit('delete')"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
        <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
      </svg>
    </button>

    <div>
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ meeting.startTime.toDate().toLocaleDateString() }}</h3>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ meeting.description }}</p>

      <p class="font-sm text-gray-500">{{ meeting.startTime.toDate().toLocaleTimeString(undefined, { timeStyle: 'short' }) }} - {{ meeting.endTime.toDate().toLocaleTimeString(undefined, { timeStyle: 'short' }) }}</p>
      
      <!-- Attendance status pill - only for past meetings -->
      <div v-if="isPast && attendanceStatus !== undefined" class="mt-3">
        <span 
          :class="[
            'inline-block px-3 py-1 text-sm font-semibold rounded-full',
            attendanceStatus === true 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : attendanceStatus === false 
              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          ]"
        >
          {{ attendanceStatus === true ? 'Marked Present' : attendanceStatus === false ? 'Not Present' : 'No Record' }}
        </span>
      </div>
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
      v-if="activeMeeting" type="button" :disabled="attendanceTaken"
      class="text-white bg-linear-to-r from-orange-400 via-orange-500 to-orange-600 shadow-lg shadow-orange-500/50 dark:shadow-lg dark:shadow-orange-800/80 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2 mb-2 block"
      :class="{
        'hover:bg-linear-to-br focus:ring-4 focus:outline-none focus:ring-orange-300 dark:focus:ring-orange-800': !attendanceTaken
      }"
      @click="$emit('open-attendance-modal')"
    >
      {{ attendanceTaken ? 'Attendance Taken' : 'Take attendance' }}
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
