<script setup lang="ts">
import { ref } from 'vue';
import FormInput from './FormInput.vue';
import type { ClubMeeting } from '@/schema';

defineProps<{
  meeting: ClubMeeting | null,
  error: string
}>();

const show = defineModel<boolean>({
  default: false
});

const emit = defineEmits<{
  (e: 'enter-code', code: string): void
}>();

const code = ref("");

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
            Take attendance
          </h3>
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="show = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b" @submit.prevent="tryCode">
          <p v-if="meeting" class="text-gray-700 dark:text-gray-200">
            <span class="font-bold">Meeting details: </span>

            {{ meeting.startTime.toDate().toLocaleTimeString() }} - {{ meeting.endTime.toDate().toLocaleTimeString() }}
          </p>

          <FormInput label="Attendance code:" type="text" required v-model="code" />

          <p v-if="error" class="text-red-500 mb-3">{{ error }}</p>

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
