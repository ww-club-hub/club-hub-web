<script setup lang="ts">
import { ref } from 'vue';
import DateTimeInput from './DateTimeInput.vue';
import FormInput from './FormInput.vue';
import type { ClubMeeting } from '@/schema';
import { Timestamp } from 'firebase/firestore';

const show = defineModel<boolean>("show", {
  default: false
});

const emit = defineEmits<{
  (e: 'create-meeting', meeting: ClubMeeting): void
}>();

const location = ref("");
const slides = ref("");
const description = ref("");
const startTime = ref<Date | undefined>();
const endTime = ref<Date | undefined>();

async function createMeeting() {
  emit("create-meeting", {
    location: location.value,
    slides: slides.value || undefined,
    description: description.value || undefined,
    startTime: Timestamp.fromDate(startTime.value!),
    endTime: Timestamp.fromDate(endTime.value!)
  });
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
            Create meeting
          </h3>
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="show = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <!-- TODO: flex meetings -->
        <!-- TODO: autofill data from general meeting times -->
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b" @submit.prevent="createMeeting">
          <FormInput label="Room location:" type="text" required v-model="location" />
          <FormInput label="Slides URL:" type="url" v-model="slides" />
          <FormInput label="Room location:" type="text" v-model="description" />

          <div class="flex items-center gap-3">
            <DateTimeInput label="Start time:" required v-model="startTime" />
            <DateTimeInput label="End time:" required v-model="endTime" />
          </div>

          <!-- TODO: recurring meetings -->

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
