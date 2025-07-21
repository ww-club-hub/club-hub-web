<script setup lang="ts">
import Collapse from '@/components/Collapse.vue';
import { computedAsync } from "@vueuse/core";
import { computed, ref, type Ref } from 'vue';
import { useRoute } from 'vue-router';
import { DocumentReference, doc, setDoc, updateDoc, type DocumentData } from 'firebase/firestore';
import type { Club, ClubMeetingAttendance, ClubMeeting, ClubRole } from '@/schema';
import { typedGetDoc, type DocWithId, generateAttendanceCode } from '@/utils';
import { getCachedProfile } from '@/profiles';

const route = useRoute();

const meetingId = route.params.meetingId as string;

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference<DocumentData, DocumentData>
}>();

const docRef = doc(props.clubDoc, "meeting_attendance", meetingId);
const meetingAttendance: Ref<DocWithId<ClubMeetingAttendance> | null> = ref(await typedGetDoc<ClubMeetingAttendance>(docRef));
const meeting: Ref<DocWithId<ClubMeeting> | null> = ref(await typedGetDoc<ClubMeeting>(doc(props.clubDoc, "meetings", meetingId)));

enum MeetingStatus {
  Past = 0,
  Active = 1,
  Future = 2
}

// meetings are active within 30 minutes of the start or end
const meetingStatus = computed(() => {
  if (!meeting.value) return null;
  const now = new Date();
  const start = meeting.value.startTime.toDate();
  const end = meeting.value.endTime.toDate();
  const thirtyMinutes = 30 * 60 * 1000;

  if (now.getTime() < start.getTime() - thirtyMinutes) {
    return MeetingStatus.Future;
  } else if (
    now.getTime() >= start.getTime() - thirtyMinutes &&
    now.getTime() <= end.getTime() + thirtyMinutes
  ) {
    return MeetingStatus.Active;
  } else {
    return MeetingStatus.Past;
  }
});

// fetch all profiles
const membersAttending = computedAsync(async () => {
  if (!meetingAttendance.value || !meetingAttendance.value.membersAttending) return [];
  const profiles = await Promise.all(
    meetingAttendance.value.membersAttending.map(async (email) => {
      const profile = await getCachedProfile(email);
      return { email, profile };
    })
  );
  return profiles;
}, []);

const membersPresent = computedAsync(async () => {
  if (!meetingAttendance.value || !meetingAttendance.value.membersPresent) return [];
  const emails = Object.keys(meetingAttendance.value.membersPresent);
  const profiles = await Promise.all(
    emails.map(async (email) => {
      const profile = await getCachedProfile(email);
      return { email, profile };
    })
  );
  return profiles;
}, []);

async function regenCode() {
  if (!meetingAttendance.value) return;
  const code = generateAttendanceCode();
  meetingAttendance.value.code = code;
  await updateDoc(docRef, { code });
}

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
</script>

<template>
  <h1 class="text-4xl text-gray-700 dark:text-gray-300 mb-3 font-bold">Meeting Attendance:</h1>

  <div v-if="meetingAttendance && meeting">
    <div class="flex gap-3 mb-6 items-start">
      <div class="flex-1">
        <div v-if="meetingStatus === MeetingStatus.Active" class="flex items-center p-5 mb-4 text-emerald-800 border border-emerald-300 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 dark:text-emerald-400 dark:border-emerald-800" role="alert">
          <svg class="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
          </svg>
          <span class="sr-only">Info</span>
          <div>
            <span class="font-medium">This meeting has started!</span>
            Members: Enter the code to the right to be counted present
          </div>
        </div>
        <div v-else class="flex items-center p-5 mb-4 text-amber-800 border border-amber-300 rounded-lg bg-amber-50 dark:bg-amber-900/25 dark:text-amber-400 dark:border-amber-800" role="alert">
          <svg class="shrink-0 inline w-4 h-4 me-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z"/>
          </svg>
          <span class="sr-only">Info</span>
          <div>
            <span class="font-medium">This meeting has {{ meetingStatus === MeetingStatus.Past ? "ended" : "not started"}}.</span>
            Officers: You can view members who {{ meetingStatus === MeetingStatus.Future ? "will probably be attending" : "were present" }} below.
          </div>
        </div>

        <!-- header - date, time -->
        <div class="p-6 rounded-lg shadow bg-gray-100 dark:bg-gray-800">

          <h2 class="text-3xl font-bold text-gray-800 dark:text-gray-100 text-center">
            {{ meeting.startTime.toDate().toLocaleDateString(undefined, { dateStyle: "medium" }) }}
            <span class="block text-xl font-normal mt-1">
              {{ meeting.startTime.toDate().toLocaleTimeString(undefined, { timeStyle: "short" }) }}
              &ndash;
              {{ meeting.endTime.toDate().toLocaleTimeString(undefined, { timeStyle: "short" }) }}
            </span>
          </h2>
          <p v-if="meeting.description" class="text-lg text-gray-600 dark:text-gray-300 text-center italic mt-2">
            {{ meeting.description }}
          </p>
        </div>
      </div>

      <!-- attendance code - expanded when meeting is active -->
      <Collapse label="Attendance Code" :default-active="meetingStatus === MeetingStatus.Active" class="flex-1">
        <div class="rounded-lg p-3 shadow-md dark:bg-gray-800 bg-gray-100 text-gray-800 dark:text-gray-200 mb-6">
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
      </Collapse>
    </div>

    <!--  list of members present and members attending -->
    <div class="flex gap-3 mb-3 items-start">
      <Collapse label="Expected attendance" class="flex-1" :default-active="meetingStatus === MeetingStatus.Future">
        <div class="space-y-3 divide-gray-500">
          <div v-if="meetingAttendance.membersAttending.length === 0" class="text-gray-500 italic">
            No expected attendees.
          </div>
          <div v-else>
            <ul class="divide-y divide-gray-200 dark:divide-gray-700">
              <li v-for="user in membersAttending" :key="user.email" class="pb-3 sm:pb-4 mb-3">
                <div class="flex items-center space-x-4 rtl:space-x-reverse">
                  <div class="shrink-0">
                    <img
                      :src="user.profile.photoUrl" alt="Profile"
                      class="w-8 h-8 rounded-full object-cover"
                    >
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                      {{ user.profile.displayName || user.email }}
                    </p>
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </Collapse>

      <Collapse label="Members present" class="flex-1" :default-active="meetingStatus === MeetingStatus.Past">
        <div class="space-y-3 divide-gray-500">
          <div v-if="membersPresent.length === 0" class="text-gray-500 italic">
            No members present
          </div>
          <div v-else>
            <ul class="divide-y divide-gray-200 dark:divide-gray-700">
              <li v-for="user in membersPresent" :key="user.email" class="pb-3 sm:pb-4 mb-3">
                <div class="flex items-center space-x-4 rtl:space-x-reverse">
                  <div class="shrink-0">
                    <img
                      :src="user.profile.photoUrl" alt="Profile"
                      class="w-8 h-8 rounded-full object-cover"
                    >
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate dark:text-white">
                      {{ user.profile.displayName || user.email }}
                    </p>
                    <p class="text-sm text-gray-500 truncate dark:text-gray-400">
                      {{ user.email }}
                    </p>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </Collapse>
    </div>
  </div>
  <div v-else>
    <!-- uninitialized state - should never happen -->
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
