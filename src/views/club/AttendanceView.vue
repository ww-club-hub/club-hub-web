<script setup lang="ts">
import { db } from '@/firebase';
import type { Club, ClubMeetingAttendance, ClubMeeting, ClubRole } from '@/schema';
import { typedGetDoc, type DocWithId } from '@/utils';
import { DocumentReference, doc, setDoc, updateDoc, type DocumentData } from 'firebase/firestore';
import { onMounted } from 'vue';

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference
}>();

onMounted(async () => {
  
});
</script>

<template>
  <h1 class="text-4xl text-gray-700 dark:text-gray-300 mb-3 font-bold">Attendance Statistics:</h1>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">

<section>
  <!-- Messages --> 
 <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mt-3">
      <div class="flex justify-between items-center mb-4">
        <h1 class="text-xl font-semibold text-gray-700 dark:text-white">Members:</h1>
      </div>

    <!--  Messages from club officers: placeholders -->
      <div class="space-y-4">
        <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          <h3 class="text-xl font-bold text-green-600 dark:text-green-300">73%</h3>
          <h3 class="text-xl font-semibold text-gray-700 dark:text-white">Meetings attendance (2/7 meetings)</h3>
        </div>
        <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow">
          <h3 class="text-xl font-semibold text-gray-700 dark:text-white">Eligibility:</h3>
          <h3 class="text-xl font-bold text-green-600 dark:text-green-300">Member: Yes</h3>
          <h3 class="text-xl font-bold text-red-600 dark:text-red-300">Officer: No</h3>
        </div>
      </div>
  </div>

  <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow mt-15">
          <h2 class="text-xl font-semibold text-gray-700 dark:text-white">Officers:</h2>
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg col-span-3 grid grid-cols-2 grid-rows-2 gap-6">

          <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">Meeting 4/9/2025:</h3>
            <h3 class="text-xl font-bold text-green-600 dark:text-green-300">73%</h3>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">of members attended (3/4 members)</h3>
          </div>
          <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">Meeting 4/9/2025:</h3>
            <h3 class="text-xl font-bold text-red-600 dark:text-red-300">57%</h3>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">of members attended (3/4 members)</h3>
          </div>
          <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">Meeting 4/9/2025:</h3>
            <h3 class="text-xl font-bold text-red-600 dark:text-red-300">23%</h3>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">of members attended (3/4 members)</h3>
          </div>
          <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow">
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">Meeting 4/9/2025:</h3>
            <h3 class="text-xl font-bold text-green-600 dark:text-green-300">73%</h3>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">of members attended (3/4 members)</h3>
          </div>
        </div>
        </div>
</section>
</div>
</template>
