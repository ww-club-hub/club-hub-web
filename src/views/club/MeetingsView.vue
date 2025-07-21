<script setup lang="ts">
import { type ClubRole, type Club, type ClubMeeting, OfficerPermission, type ClubMeetingAttendance } from '@/schema';
import { collection, query, where, orderBy, limit, and, doc, setDoc, updateDoc, DocumentReference, FieldPath, arrayUnion, arrayRemove } from "@firebase/firestore";
import { ref, computed, onMounted } from 'vue';
import { auth, db, parseError } from "@/firebase";
import MeetingCard from '@/components/MeetingCard.vue';
import CreateMeetingDialog from '@/components/CreateMeetingDialog.vue';
import { type DocWithId, typedGetDocs, generateAttendanceCode } from '@/utils';
import 'v-calendar/style.css';
import VCalendar from 'v-calendar';
import TakeAttendanceDialog from '@/components/TakeAttendanceDialog.vue';
import { useRoute, useRouter } from 'vue-router';
import type { FirebaseError } from '@firebase/util';

const router = useRouter();
const route = useRoute();

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference
}>();

const canCreateMeeting = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Meetings));

const upcomingMeetings = ref<DocWithId<ClubMeeting>[]>([]);
const monthMeetings = ref<DocWithId<ClubMeeting>[]>([]);
const meetingsCollection = collection(props.clubDoc, "meetings");

const currentAttendanceMeeting = ref<DocWithId<ClubMeeting> | null>(null);

const showModal = ref(false);
const showAttendanceDialog = ref(false);

const attendanceError = ref("");

const currentMeetings = computed(() => monthMeetings.value.filter(m => m.startTime.toMillis() <= Date.now() && m.endTime.toMillis() >= Date.now()));

async function createMeeting(meeting: ClubMeeting) {
  if (!auth.currentUser || !canCreateMeeting) return;

  const ref = doc(meetingsCollection);
  await setDoc(ref, meeting);
  const attendanceRef = doc(props.clubDoc, "meeting_attendance", ref.id);

  const code = generateAttendanceCode();
  const attendanceDoc: ClubMeetingAttendance = {
    code,
    membersPresent: {},
    membersAttending: []
  };
  await setDoc(attendanceRef, attendanceDoc);

  await refreshMeetings();

  showModal.value = false;
}

async function takeAttendance(code: string) {
  if (!currentAttendanceMeeting.value || !auth.currentUser) return;
  try {
    attendanceError.value = "";

    await updateDoc(doc(props.clubDoc, "meeting_attendance", currentAttendanceMeeting.value!.id), new FieldPath("membersPresent", auth.currentUser.email!), code);

    showAttendanceDialog.value = false;
    currentAttendanceMeeting.value = null;
  } catch (err) {
    if ((err as FirebaseError).code === "permission-denied") {
      attendanceError.value = "Incorrect code";
    } else {
      attendanceError.value = parseError(err as Error);
    }
  }
}

async function refreshMeetings() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth());
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1);

  upcomingMeetings.value = await typedGetDocs(
    query(
      meetingsCollection,
      where("startTime", ">=", now),
      orderBy("startTime", "asc"),
      limit(5)
    )
  );

  monthMeetings.value = await typedGetDocs(
    query(
      meetingsCollection,
      and(
        where("startTime", ">=", monthStart),
        where("endTime", "<", monthEnd),
      ),
      orderBy("startTime", "asc"),
      limit(5)
    )
  );
}

async function handleMeetingAttendance(meeting: DocWithId<ClubMeeting>) {
  // open the attendance modal
  showAttendanceDialog.value = true;
  currentAttendanceMeeting.value = meeting;
}

async function handleRsvp(meeting: DocWithId<ClubMeeting>, canAttend: boolean) {
  if (!auth.currentUser) return;

  await updateDoc(doc(props.clubDoc, "meeting_attendance", meeting.id), {
    membersAttending: canAttend ? arrayUnion(auth.currentUser.email!) : arrayRemove(auth.currentUser.email!)
  });
}

await refreshMeetings();

if (route.query.meetingId) {
  const meeting = currentMeetings.value.find(el => el.id === route.query.meetingId);
  if (meeting) {
    showAttendanceDialog.value = true;
    currentAttendanceMeeting.value = meeting;
  }
}
</script>

<template>
  <button v-if="canCreateMeeting" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Create meeting</button>

  <div class="md:grid grid-cols-3 gap-4">
    <!-- TODO: fix calendar view  -->
    <VCalendar/>

    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Upcoming meetings:</h2>
      <div v-if="upcomingMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <MeetingCard
          v-for="meeting in upcomingMeetings" :key="meeting.id" :meeting="meeting"
          :can-take-attendance="false"
          :can-manage-attendance="(props.role.officer & (1 << OfficerPermission.Meetings)) > 0"
          :club="club"
          @rsvp="canAttend => handleRsvp(meeting, canAttend)"
        />
      </div>
      <p v-else class="italic text-black dark:text-white">No meetings yet...</p>
    </div>

    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Active meetings:</h2>
      <div v-if="currentMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <MeetingCard
          v-for="meeting in currentMeetings" :key="meeting.id" :meeting="meeting" :club="club"
          :can-take-attendance="true"
          :can-manage-attendance="(props.role.officer & (1 << OfficerPermission.Meetings)) > 0"
          @open-attendance-modal="handleMeetingAttendance(meeting)"
          />
      </div>
      <p v-else class="italic text-black dark:text-white">There are no meetings right now...</p>
    </div>
  </div>

  <CreateMeetingDialog v-model:show="showModal" :club="club" @create-meeting="createMeeting" />
  <TakeAttendanceDialog v-model:show="showAttendanceDialog" :error="attendanceError" @enter-code="takeAttendance" :meeting="currentAttendanceMeeting" />
</template>
