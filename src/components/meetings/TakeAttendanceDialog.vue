<script setup lang="ts">
import { ref } from 'vue';
import FormInput from '../form/FormInput.vue';
import type { ClubMeeting } from '@/schema';
import type { Timestamp } from 'firebase/firestore';

defineProps<{
  meeting: ClubMeeting | null,
  error: string,
  loading?: boolean
}>();

const show = defineModel<boolean>("show", {
  default: false
});

const emit = defineEmits<{
  (e: 'enter-code', code: string): void
}>();

const code = ref("");

function formatCode() {
  code.value = code.value.toUpperCase().trim();
}

const formatDate = (date: Timestamp) => date.toDate().toLocaleString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const formatTime = (date: Timestamp) => date.toDate().toLocaleString(undefined, { timeStyle: "short" });

async function tryCode() {
  emit("enter-code", code.value);
}
</script>

<template>
  <dialog :open="show" tabindex="-1" aria-hidden="true" class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-300/75 dark:bg-gray-900/75">
    <div class="relative p-4 w-full max-w-2xl max-h-full left-1/2 top-1/2 -translate-1/2">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg dark:bg-gray-700 shadow-lg">
        <!-- Modal header -->
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Take Attendance
          </h3>
          <button type="button" :disabled="loading" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" @click="show = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <form class="p-4 md:p-5 space-y-5 dark:bg-gray-800 rounded-b" @submit.prevent="tryCode">
          <!-- Meeting details -->
          <div v-if="meeting" class="bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-3 font-medium">Meeting Details</p>
            <div class="space-y-2">
              <div class="flex justify-between items-start">
                <span class="text-gray-700 dark:text-gray-300">Date:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ formatDate(meeting.startTime) }}</span>
              </div>
              <div class="flex justify-between items-start">
                <span class="text-gray-700 dark:text-gray-300">Time:</span>
                <span class="font-semibold text-gray-900 dark:text-white">
                  {{ formatTime(meeting.startTime) }} 
                  – 
                  {{ formatTime(meeting.endTime) }}
                </span>
              </div>
              <div v-if="meeting.location" class="flex justify-between items-start">
                <span class="text-gray-700 dark:text-gray-300">Location:</span>
                <span class="font-semibold text-gray-900 dark:text-white">{{ meeting.location }}</span>
              </div>
            </div>
          </div>

          <!-- Code input -->
          <div>
            <FormInput label="Attendance Code:" type="text" required v-model="code" @input-change="formatCode" :disabled="loading" placeholder="Enter code here" />
          </div>

          <!-- Error message -->
          <p v-if="error" class="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded-lg text-sm">{{ error }}</p>

          <!-- Submit button -->
          <button :disabled="loading" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span v-if="loading" class="inline-flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </span>
            <span v-else>Submit Attendance Code</span>
          </button>
        </form>
      </div>
    </div>
  </dialog>
</template>
