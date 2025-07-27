<script setup lang="ts">
import { ref, watch } from 'vue';
import FormInput from './FormInput.vue';
import TimeInput from './TimeInput.vue';
import type { ClubMeeting, ClubMeetingTime } from '@/schema';
import { Timestamp } from 'firebase/firestore';
import { dateToISODateString, formatMeetingTime, getNextDayOfWeekDate } from "@/utils";
import FormSelect from './FormSelect.vue';

const meeting = defineModel<ClubMeeting>({ required: true });

// General club meeting selection
const props = defineProps<{
  meetingTimeSelections: ClubMeetingTime[]
}>();

// Date input (ISO string)
const date = ref<string>();
// Start/end time in minutes since midnight
const startMinutes = ref<number>(0);
const endMinutes = ref<number>(0);

// Initialize local refs from meeting value
watch(
  () => meeting.value,
  (val) => {
    if (val?.startTime) {
      const startTime = val.startTime.toDate();
      date.value = dateToISODateString(startTime);
      startMinutes.value = startTime.getHours() * 60 + startTime.getMinutes();
    } else {
      date.value = undefined;
      startMinutes.value = 0;
    }
    if (val?.endTime) {
      const endTime = val.endTime.toDate();
      endMinutes.value = endTime.getHours() * 60 + endTime.getMinutes();
    } else {
      endMinutes.value = 0;
    }
  },
  { immediate: true }
);

// Autofill
const autofillIndex = ref<number | undefined>();
watch(autofillIndex, idx => {
  if (idx !== undefined && props.meetingTimeSelections[idx]) {
    const autofill = props.meetingTimeSelections[idx];
    if (autofill.type === 'time') {
      // time sessions - set start, end, and room// Autofill date to nearest day of week in the future (including current day)

      date.value = dateToISODateString(getNextDayOfWeekDate(autofill.day));

      meeting.value.location = autofill.room;
      startMinutes.value = autofill.start;
      endMinutes.value = autofill.end;
      meeting.value.description = '';
    } else if (autofill.type === 'flex') {
      // flex sessions - can only set room
      meeting.value.location = `Flex: ${autofill.session}`;
      meeting.value.description = '';
      startMinutes.value = 0;
      endMinutes.value = 0;
    }
  }
});

// Sync local date/time refs to meeting.value
watch([date, startMinutes, endMinutes], () => {
  if (date.value && startMinutes.value !== null && endMinutes.value !== null) {
    const [year, month, day] = date.value.split('-').map(Number);
    const startTime = new Date(year, month - 1, day, Math.floor(startMinutes.value / 60), startMinutes.value % 60);
    const endTime = new Date(year, month - 1, day, Math.floor(endMinutes.value / 60), endMinutes.value % 60);

    meeting.value.startTime = Timestamp.fromDate(startTime);
    meeting.value.endTime = Timestamp.fromDate(endTime);
  }
});
</script>

<template>
  <div class="flex flex-col gap-3 mb-3">
    <div class="flex flex-row gap-3 items-end">
      <!-- autofil data from club settings -->
      <div class="flex flex-col flex-1">
        <FormSelect
          v-model="autofillIndex" label="Autofill from usual meeting time:"
          :options="meetingTimeSelections?.map((item, i) => ({
            value: i,
            label: formatMeetingTime(item)
          })) ?? [{ label: 'No meeting times configured', disabled: true }]" />
      </div>
      <FormInput
        label="Date"
        type="date"
        v-model="date"
        required
        class="mb-0 w-full flex-1"
        :min="dateToISODateString(new Date())"
      />
    </div>
    <!-- start/end time -->
    <div class="flex flex-row gap-3">
      <TimeInput label="Start time" v-model="startMinutes" required class="flex-1" />
      <TimeInput label="End time" v-model="endMinutes" required class="flex-1" />
    </div>
    <FormInput label="Location" placeholder="Room number or Flex session" type="text" v-model="meeting.location" required/>
    <FormInput label="Description" type="text" v-model="meeting.description" />
    <FormInput label="Slides link (optional)" type="text" v-model="meeting.slides" />
  </div>
</template>
