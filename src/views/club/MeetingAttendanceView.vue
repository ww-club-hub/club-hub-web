<script setup lang="ts">
import { db } from '@/firebase';
import type { Club, ClubMeetingAttendance, ClubMeeting, ClubRole } from '@/schema';
import { typedGetDoc, type DocWithId, generateAttendanceCode } from '@/utils';
import { DocumentReference, doc, setDoc, updateDoc, type DocumentData } from 'firebase/firestore';
import type { Ref } from 'vue';
import { onMounted } from 'vue';
import { ref } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const meetingId = route.params.meetingId as string;

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference<DocumentData, DocumentData>
}>();

const docRef = doc(props.clubDoc, "meeting_attendance", meetingId);
const meetingAttendance: Ref<DocWithId<ClubMeetingAttendance> | null> = ref(null);
const meeting: Ref<DocWithId<ClubMeeting | null>> = ref(null);

async function regenCode() {
  const code = generateAttendanceCode();
  meetingAttendance.value.code = code;
  await updateDoc(docRef, { code });
}

// TODO: this should be init when meetings are created
async function initAttendance() {
  const code = generateAttendanceCode();
  const doc: ClubMeetingAttendance = {
    code,
    membersPresent: {},
    membersAttending: []
  };
  const result = await setDoc(docRef, doc);

  meetingAttendance.value = {
    ...doc,
    id: docRef.id
  };
}

onMounted(async () => {
  meeting.value = await typedGetDoc<ClubMeeting>(doc(props.clubDoc, "meetings", meetingId));
  meetingAttendance.value = await typedGetDoc<ClubMeetingAttendance>(docRef);
});
</script>

<template>
  <h1 class="text-4xl text-gray-700 dark:text-gray-300 mb-3 font-bold">Attendance:</h1>

  <div v-if="meetingAttendance">
    <div class="rounded-lg p-3 shadow-md dark:bg-gray-800 bg-gray-100 text-gray-800 dark:text-gray-200">
        <p class="text-2xl text-center py-3">{{ meeting.startTime.toDate().toLocaleTimeString() }} - {{ meeting.endTime.toDate().toLocaleTimeString() }}</p>
        <p class="text-xl text-center italic py-1">Attendance code:</p>
        <p class="text-6xl font-extrabold text-center py-6 flex items-center justify-center gap-3">
            {{ meetingAttendance.code }}
            <button type="button" title="Regenerate code"
                @click="regenCode"
                class="text-orange-700 border border-orange-700 hover:bg-orange-700 hover:text-white focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-full text-sm p-2.5 text-center inline-flex items-center dark:border-orange-500 dark:text-orange-500 dark:hover:text-white dark:focus:ring-orange-800 dark:hover:bg-orange-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                <span class="sr-only">Regenerate code</span>
            </button>
        </p>
    </div>

  </div>
  <div v-else>
    <div class="flex items-center p-4 mb-4 text-sm text-yellow-800 border border-yellow-300 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300 dark:border-yellow-800" role="alert">
      <svg class="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
      </svg>
      <span class="sr-only">Info</span>
      <div>
        <span class="font-medium">Warning:</span> Meeting attendance has not yet been initialized.
      </div>
    </div>
    <button type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="initAttendance()">Initialize attendance</button>
  </div>
</template>
