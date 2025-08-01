<script setup lang="ts">
import { type ClubRole, type Club, type ClubMeeting, OfficerPermission, type ClubMeetingAttendance } from '@/schema';
import { collection, query, where, orderBy, limit, and, doc, setDoc, updateDoc, DocumentReference, FieldPath, arrayUnion, arrayRemove, serverTimestamp, Timestamp } from "@firebase/firestore";
import { ref, computed, onMounted } from 'vue';
import { auth, parseError } from "@/firebase";
import MeetingCard from '@/components/MeetingCard.vue';
import CreateMeetingDialog from '@/components/CreateMeetingDialog.vue';
import { type DocWithId, typedGetDocs, generateAttendanceCode } from '@/utils';
import 'v-calendar/style.css';
import { Calendar } from 'v-calendar';
import TakeAttendanceDialog from '@/components/TakeAttendanceDialog.vue';
import { useRoute, useRouter } from 'vue-router';
import type { FirebaseError } from '@firebase/util';
import { useMeetings } from '@/meeting-store';
import api, { isTRPCClientError } from '@/api';

const route = useRoute();

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference
}>();

const canCreateMeeting = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Meetings));

const meetings = useMeetings();

const meetingsCollection = collection(props.clubDoc, "meetings");

// Refs for active and upcoming meetings
const activeMeetings = ref<DocWithId<ClubMeeting>[]>([]);
const upcomingMeetings = ref<DocWithId<ClubMeeting>[]>([]);

const currentAttendanceMeeting = ref<DocWithId<ClubMeeting> | null>(null);

const showModal = ref(false);
const showAttendanceDialog = ref(false);

const attendanceError = ref("");

// TODO: implement better meeting storage - lookup across multiple clubs and better caching

async function createMeeting(meeting: ClubMeeting) {
  if (!auth.currentUser || !canCreateMeeting) return;

  const ref = doc(meetingsCollection);
  await setDoc(ref, {
    ...meeting,
    // set last updated to the server current time
    lastUpdated: serverTimestamp()
  });

  // init attendance
  // TODO: needs to be changes for recurring meetings
  const attendanceRef = doc(props.clubDoc, "meeting_attendance", ref.id);
  const code = generateAttendanceCode();
  const attendanceDoc: ClubMeetingAttendance = {
    code,
    membersPresent: [],
    membersAttending: []
  };
  await setDoc(attendanceRef, attendanceDoc);

  // more "complete" meeting doc for temporarily updating the UI before it's fetched through
  const meetingDoc = {
    ...meeting,
    id: ref.id,
    lastUpdated: Timestamp.now()
  };

  meetings.addMeeting(meetingDoc, props.club.id);

  showModal.value = false;
}

async function takeAttendance(code: string) {
  if (!currentAttendanceMeeting.value || !auth.currentUser) return;
  try {
    attendanceError.value = "";

    await api.club.attendance.take.mutate({
      clubId: props.club.id,
      code,
      meetingId: currentAttendanceMeeting.value!.id
    });

    showAttendanceDialog.value = false;
    currentAttendanceMeeting.value = null;
  } catch (err) {
    if (isTRPCClientError(err) && err.data?.code === "UNAUTHORIZED") {
      attendanceError.value = "Incorrect code";
    } else {
      attendanceError.value = parseError(err as Error);
    }
  }
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

/*
 * Get the dot color for the given meeting
*/
function getMeetingAttendanceColor(meetingId: string) {
  const attendancestatus = meetings.meetingAttendance.get(meetingId);
  if (attendancestatus === null) return "gray";
  if (attendancestatus) return "green";
  return "red";
}

// Initial meeting dialog open by query param
if (route.query.meetingId) {
  const meeting = activeMeetings.value.find(el => el.id === route.query.meetingId);
  if (meeting) {
    showAttendanceDialog.value = true;
    currentAttendanceMeeting.value = meeting;
  }
}

onMounted(async () => {
  const now = new Date();

  // load current month meetings for calendar
  await meetings.loadSection([props.club.id, new Date(now.getFullYear(), now.getMonth())]);

  // Fetch meetings whose endTime is >= 30 minutes ago, order by startTime ascending, limit 6
  const nowMillis = now.getTime();
  const THIRTY_MIN_MS = 30 * 60 * 1000;
  const thirtyMinAgo = new Date(nowMillis - THIRTY_MIN_MS);

  const fetchedMeetings = await typedGetDocs<ClubMeeting>(
    query(
      meetingsCollection,
      where("endTime", ">=", thirtyMinAgo),
      orderBy("startTime", "asc"),
      limit(6)
    )
  );

  // Active meetings: ended up to 30min ago, start up to 30min from now, or ongoing
  activeMeetings.value = fetchedMeetings.filter(m => {
    const start = m.startTime.toMillis();
    const end = m.endTime.toMillis();
    return (
      end >= nowMillis - THIRTY_MIN_MS &&
      start <= nowMillis + THIRTY_MIN_MS
    );
  });

  // Upcoming meetings: future meetings in the same month that are not active
  upcomingMeetings.value = fetchedMeetings.filter(m => {
    const start = m.startTime.toMillis();
    // Not in activeMeetings and in the future
    return (
      start > nowMillis + THIRTY_MIN_MS
    );
  });
});
</script>

<template>
  <button v-if="canCreateMeeting" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Create meeting</button>

  <div v-if="activeMeetings.length > 0" class="mb-3">
    <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Active meetings:</h2>
    <div class="flex gap-3 flex-row flex-wrap md:flex-col">
      <MeetingCard
        v-for="meeting in activeMeetings" :key="meeting.id" :meeting="meeting"
        :active-meeting="true"
        :can-rsvp="false"
        :can-manage-attendance="(props.role.officer & (1 << OfficerPermission.Meetings)) > 0"
        :club="club"
        @open-attendance-modal="handleMeetingAttendance(meeting)"
      />
    </div>
  </div>

  <div class="md:grid grid-cols-3 gap-4 items-start">
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Upcoming meetings:</h2>
      <div v-if="upcomingMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <MeetingCard
          v-for="meeting in upcomingMeetings" :key="meeting.id" :meeting="meeting"
          :can-take-attendance="false"
          :can-rsvp="true"
          :can-manage-attendance="(props.role.officer & (1 << OfficerPermission.Meetings)) > 0"
          :club="club"
          @rsvp="canAttend => handleRsvp(meeting, canAttend)"
        />
      </div>
      <p v-else class="italic text-black dark:text-white">No meetings coming up...</p>
    </div>

    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">All meetings:</h2>

      <div class="bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 inline-block p-3">
        <!-- Month view of meetings for the current month using VCalendar -->
        <Calendar
          :attributes="meetings.meetingsForClub(club.id).map(meeting => ({
            key: meeting.id,
            dates: [meeting.startTime.toDate()],
            highlight: { fillMode: 'light' },
            popover: {
              label: `${meeting.startTime.toDate().toLocaleString(undefined, { timeStyle: 'short' })} - ${meeting.endTime.toDate().toLocaleString(undefined, { timeStyle: 'short' })}\n${meeting.description ?? ''} ${meeting.location}`,
              visibility: 'hover'
            },
            dot: {
              color: getMeetingAttendanceColor(meeting.id)
            },
            customData: meeting,
          }))"
          is-dark="system"
          transparent borderless
          :show-title="true"
          :show-arrows="true"
          :pan="false"
          title-position="left"
          trim-weeks
          color="orange"
          @did-move="pages => meetings.loadSection([club.id, new Date(pages[0].year, pages[0].month)])"
            />
      </div>
    </div>
  </div>

  <CreateMeetingDialog v-model:show="showModal" :club="club" @create-meeting="createMeeting" />
  <TakeAttendanceDialog v-model:show="showAttendanceDialog" :error="attendanceError" @enter-code="takeAttendance" :meeting="currentAttendanceMeeting" />
</template>

<style>
.vc-day-popover-row-label {
  white-space: pre-line;
}
</style>
