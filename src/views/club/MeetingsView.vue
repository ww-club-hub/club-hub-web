<script setup lang="ts">
import { type ClubRole, type Club, type ClubMeeting, OfficerPermission, type ClubMeetingAttendance } from '@/schema';
import { collection, query, where, orderBy, limit, and, doc, setDoc, updateDoc, DocumentReference, FieldPath, arrayUnion, arrayRemove, serverTimestamp, Timestamp, deleteDoc, writeBatch } from "@firebase/firestore";
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue';
import { auth, parseError, db } from "@/firebase";
import MeetingCard from '@/components/meetings/MeetingCard.vue';
import CreateMeetingDialog from '@/components/meetings/CreateMeetingDialog.vue';
import { type DocWithId, typedGetDocs, generateAttendanceCode } from '@/utils';
import 'v-calendar/style.css';
import { Calendar } from 'v-calendar';
import TakeAttendanceDialog from '@/components/meetings/TakeAttendanceDialog.vue';
import { useRoute } from 'vue-router';
import { useMeetings } from '@/stores/meetings';
import api, { isTRPCClientError } from '@/api';
import { showConfirmDialog } from '@/toast';

const route = useRoute();

const appContext = getCurrentInstance()?.appContext;

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference
}>();

const meetings = useMeetings();

const meetingsCollection = collection(props.clubDoc, "meetings");

const activeMeetings = ref<DocWithId<ClubMeeting>[]>([]);
// Track the currently displayed month on calendar
const currentCalendarMonth = ref(new Date(new Date().getFullYear(), new Date().getMonth()));
// Fetch meetings that are active (within 30min past/future), order by startTime ascending
const nowMillis = new Date().getTime();
const THIRTY_MIN_MS = 30 * 60 * 1000;
const thirtyMinAgo = new Date(nowMillis - THIRTY_MIN_MS);
const thirtyMinFromNow = new Date(nowMillis + THIRTY_MIN_MS);

// Upcoming meetings: from calendar store, in the currently selected month and in the future (not active)
const upcomingMeetings = computed(() => {
  const monthStart = new Date(currentCalendarMonth.value.getFullYear(), currentCalendarMonth.value.getMonth());
  const monthEnd = new Date(currentCalendarMonth.value.getFullYear(), currentCalendarMonth.value.getMonth() + 1);
  
  return meetings.meetingsForClub(props.club.id).filter(m => {
    const start = m.startTime.toMillis();
    // Meeting must be in the selected month AND in the future (not active)
    return (
      start >= monthStart.getTime() &&
      start < monthEnd.getTime() &&
      start > nowMillis + THIRTY_MIN_MS
    );
  });
});

// Past meetings: from calendar store, in the currently selected month and ended more than 30 minutes ago
const pastMeetings = computed(() => {
  const monthStart = new Date(currentCalendarMonth.value.getFullYear(), currentCalendarMonth.value.getMonth());
  const monthEnd = new Date(currentCalendarMonth.value.getFullYear(), currentCalendarMonth.value.getMonth() + 1);
  
  return meetings.meetingsForClub(props.club.id).filter(m => {
    const start = m.startTime.toMillis();
    const end = m.endTime.toMillis();
    // Meeting must be in the selected month AND in the past
    return (
      start >= monthStart.getTime() &&
      start < monthEnd.getTime() &&
      end < nowMillis - THIRTY_MIN_MS
    );
  }).sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
});

// Display name for current month
const currentMonthDisplay = computed(() => {
  return currentCalendarMonth.value.toLocaleString('default', { month: 'long', year: 'numeric' });
});

// Check if user can manage meetings (officer with Meetings permission or stuco)
const canManageMeetings = computed(() => {
  return (props.role.officer & (1 << OfficerPermission.Meetings)) > 0 || props.role.stuco;
});

const currentAttendanceMeeting = ref<DocWithId<ClubMeeting> | null>(null);

const showModal = ref(false);
const showAttendanceDialog = ref(false);
const attendanceDialogLoading = ref(false);

const attendanceError = ref("");
const attendanceCode = ref("");

// TODO: implement better meeting storage - lookup across multiple clubs and better caching

async function createMeeting(meeting: ClubMeeting) {
  if (!canManageMeetings.value) return;

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
  activeMeetings.value.push(meetingDoc);

  showModal.value = false;
}

async function takeAttendance(code: string) {
  if (!currentAttendanceMeeting.value || !auth.currentUser) return;
  
  attendanceDialogLoading.value = true;
  try {
    attendanceError.value = "";

    await api.club.attendance.take.mutate({
      clubId: props.club.id,
      code,
      meetingId: currentAttendanceMeeting.value!.id
    });

    // mark present
    await meetings.setAttendance(currentAttendanceMeeting.value!.id, true);

    // Clear form on success
    attendanceCode.value = "";
    showAttendanceDialog.value = false;
    currentAttendanceMeeting.value = null;
  } catch (err) {
    if (isTRPCClientError(err) && err.data?.code === "UNAUTHORIZED") {
      attendanceError.value = "Incorrect code";
    } else {
      attendanceError.value = parseError(err as Error);
      console.error(err);
    }
  } finally {
    attendanceDialogLoading.value = false;
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

async function handleDeleteMeeting(meeting: DocWithId<ClubMeeting>) {
  if (!canManageMeetings.value) return;

  const confirmed = await showConfirmDialog(
    {
      title: "Delete Meeting",
      message: `Are you sure you want to delete this meeting? This will also delete all attendance records.`,
      confirmText: "Delete",
      cancelText: "Cancel"
    },
    appContext
  );

  if (!confirmed) return;

  try {
    // Delete both meeting and meeting_attendance in a transaction
    const batch = writeBatch(db);
    batch.delete(doc(meetingsCollection, meeting.id));
    batch.delete(doc(props.clubDoc, "meeting_attendance", meeting.id));
    await batch.commit();
    
    // Remove from store
    meetings.removeMeeting(meeting.id, props.club.id);
  } catch (err) {
    console.error("Error deleting meeting:", err);
  }
}

/*
 * Get the dot color for the given meeting
*/
function getMeetingAttendanceColor(meetingId: string) {
  const attendanceStatus = meetings.meetingAttendance.get(meetingId);
  if (attendanceStatus) return "green";
  else if (attendanceStatus == false) return "red";
  return "gray";
}

async function refreshActiveMeetings() {
  // Fetch only active/current meetings (within 30 min past/future)
  const activeMeetingsQuery = await typedGetDocs<ClubMeeting>(
    query(
      meetingsCollection,
      where("endTime", ">=", thirtyMinAgo),
      where("startTime", "<=", thirtyMinFromNow),
      orderBy("startTime", "asc")
    )
  );
  activeMeetings.value = activeMeetingsQuery;

  // Sync store
  for (const meeting of activeMeetings.value) {
    await meetings.addMeeting(meeting, props.club.id);
  }
}

// Helper to find a meeting by ID from either source
function findMeetingById(meetingId: string): DocWithId<ClubMeeting> | null {
  // Try fetchedMeetings first (local active meetings)
  const fromFetched = fetchedMeetings.value.find(m => m.id === meetingId);
  if (fromFetched) return fromFetched;
  
  // Fallback to store (calendar meetings)
  const fromStore = meetings.meetingsForClub(props.club.id).find(m => m.id === meetingId);
  if (fromStore) return fromStore;
  
  return null;
}

// Initial meeting dialog open by query param (check on mount)
onMounted(async () => {
  // First, handle initial route query if present
  const meetingIdFromRoute = route.query.meetingId as string | undefined;
  
  // load current month meetings for calendar
  await meetings.loadSection([props.club.id, new Date(new Date().getFullYear(), new Date().getMonth())]);

  // Fetch active/recent meetings
  await refreshActiveMeetings();
  
  // Now try to open dialog for route query
  if (meetingIdFromRoute) {
    // Wait a tick for reactivity
    await new Promise(resolve => setTimeout(resolve, 0));
    const meeting = findMeetingById(meetingIdFromRoute);
    if (meeting) {
      showAttendanceDialog.value = true;
      currentAttendanceMeeting.value = meeting;
    }
  }

  // Watch for changes to meetingAttendance map to trigger reactivity in calendar dots
  watch(
    () => Array.from(meetings.meetingAttendance.entries()),
    () => {
      // Force reactivity by triggering a re-render of the calendar
      // This ensures attendance dots update when status changes
    }
  );
});
</script>

<template>
  <button v-if="canManageMeetings" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Create meeting</button>

  <div v-if="activeMeetings.length > 0" class="mb-3">
    <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Active meetings:</h2>
    <div class="flex gap-3 flex-row flex-wrap md:flex-col">
      <MeetingCard
        v-for="meeting in activeMeetings" :key="meeting.id" :meeting="meeting"
        :active-meeting="true"
        :can-rsvp="false"
        :attendance-taken="meetings.meetingAttendance.get(meeting.id)"
        :can-manage-attendance="canManageMeetings"
        :club="club"
        @open-attendance-modal="handleMeetingAttendance(meeting)"
      />
    </div>
  </div>

  <div class="md:grid grid-cols-3 gap-4 items-start">
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">
        Upcoming in {{ currentMonthDisplay }}:
      </h2>
      <div v-if="upcomingMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <MeetingCard
          v-for="meeting in upcomingMeetings" :key="meeting.id" :meeting="meeting"
          :can-take-attendance="false"
          :can-rsvp="true"
          :can-delete="canManageMeetings"
          :can-manage-attendance="canManageMeetings"
          :club="club"
          @rsvp="canAttend => handleRsvp(meeting, canAttend)"
          @delete="handleDeleteMeeting(meeting)"
        />
      </div>
      <p v-else class="italic text-gray-500 dark:text-gray-400">No upcoming meetings in {{ currentMonthDisplay }}...</p>
    </div>

    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Calendar:</h2>

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
          @did-move="async pages => {
            const newMonth = pages[0].monthComps.firstDayOfMonth;
            await meetings.loadSection([club.id, newMonth]);
            currentCalendarMonth = newMonth;
          }"
            />
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span class="inline-block w-2 h-2 rounded-full bg-green-500 me-1"></span> Attended
        <span class="inline-block w-2 h-2 rounded-full bg-red-500 me-1 ms-2"></span> Missed
        <span class="inline-block w-2 h-2 rounded-full bg-gray-400 me-1 ms-2"></span> No data
      </p>
    </div>

    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">
        Past in {{ currentMonthDisplay }}:
      </h2>
      <div v-if="pastMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col max-h-screen overflow-y-auto">
        <MeetingCard
          v-for="meeting in pastMeetings" :key="meeting.id" :meeting="meeting"
          is-past
          :can-delete="canManageMeetings"
          :can-manage-attendance="canManageMeetings"
          :attendance-status="meetings.meetingAttendance.get(meeting.id)"
          :club="club"
          @delete="handleDeleteMeeting(meeting)"
        />
      </div>
      <p v-else class="italic text-gray-500 dark:text-gray-400">No past meetings in {{ currentMonthDisplay }}...</p>
    </div>
  </div>

  <CreateMeetingDialog v-model:show="showModal" :club="club" @create-meeting="createMeeting" />
  <TakeAttendanceDialog v-model:show="showAttendanceDialog" :error="attendanceError" @enter-code="takeAttendance" :meeting="currentAttendanceMeeting" :loading="attendanceDialogLoading" />
</template>

<style>
.vc-day-popover-row-label {
  white-space: pre-line;
}
</style>
