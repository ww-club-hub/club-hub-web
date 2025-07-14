<script setup lang="ts">
import type { ClubMeetingTime } from '@/schema';
import { watch } from 'vue';
import FormInput from './FormInput.vue';
import TimeInput from './TimeInput.vue';

const meeting = defineModel<ClubMeetingTime>({ required: true });

const id = crypto.randomUUID();

// initialize end time to start time + 1 hour
function initializeEndTime() {
  if (meeting.value.type === "time") {
    if (!meeting.value.end && meeting.value.start) {
      // measured in minutes
      meeting.value.end = meeting.value.start + 60;
    }
  }
}
</script>

<template>
  <div class="flex items-start gap-3 break-inside-avoid-column mb-3">
    <div>
      <label :for='`meeting-type-${id}`' class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Type:</label>
      <select required :id='`meeting-type-${id}`' class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500 min-w-24" v-model="meeting.type">
        <option value="time">Time</option>
        <option value="flex">Flex</option>
      </select>
    </div>
    <template v-if="meeting.type == 'time'">
      <div>
        <label :for='`meeting-day-${id}`' class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Day:</label>
        <select required :id='`meeting-day-${id}`' class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" v-model.number="meeting.day">
          <option value="0">Sunday</option>
          <option value="1">Monday</option>
          <option value="2">Tuesday</option>
          <option value="3">Wednesday</option>
          <option value="4">Thursday</option>
          <option value="5">Friday</option>
          <option value="6">Saturday</option>
        </select>
      </div>
      <TimeInput label="Start time" v-model="meeting.start" @input-blur="initializeEndTime" required />
      <TimeInput label="End time" v-model="meeting.end" required />
      <FormInput label="Room number" type="text" v-model="meeting.room" required />
    </template>
    <template v-else>
      <FormInput label="Session name" type="text" v-model="meeting.session" required />
    </template>
  </div>
</template>
