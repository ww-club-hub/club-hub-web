<script setup lang="ts">
import { type ClubRole, type Club, type ClubMeeting, OfficerPermission } from '@/schema';
import { collection, query, where, orderBy, limit, and, doc, setDoc } from "@firebase/firestore";
import { ref, computed, onMounted } from 'vue';
import { auth, db } from "@/firebase";
import MeetingCard from '@/components/MeetingCard.vue';
import CreateMeetingDialog from '@/components/CreateMeetingDialog.vue';
import { type DocWithId, typedGetDocs } from '@/utils';
import 'v-calendar/style.css';
import VCalendar from 'v-calendar';

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

const canCreateMeeting = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Meetings));

const upcomingMeetings = ref<DocWithId<ClubMeeting>[]>([]);
const monthMeetings = ref<DocWithId<ClubMeeting>[]>([]);
const meetingsCollection = collection(db, "schools", props.school, "clubs", props.club.id, "meetings");

const showModal = ref(false);

const currentMeetings = computed(() => monthMeetings.value.filter(m => m.startTime.toMillis() <= Date.now() && m.endTime.toMillis() >= Date.now()));

async function createMeeting(meeting: ClubMeeting) {
  if (!auth.currentUser || !canCreateMeeting) return;

  const ref = doc(meetingsCollection);
  await setDoc(ref, meeting);
  await refreshMeetings();

  showModal.value = false;
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

onMounted(async () => {
    await refreshMeetings();
});
</script>

<template>
  <button v-if="canCreateMeeting" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Create meeting</button>
  
  <div class="md:grid grid-cols-3 gap-4">
    <!-- TODO: fix calendar view  -->
    <VCalendar/>
    
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Upcoming meetings:</h2>
      <div v-if="upcomingMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <MeetingCard v-for="meeting in upcomingMeetings" :key="meeting.id" :meeting="meeting" :club="club" />
      </div>
      <p v-else class="italic text-black dark:text-white">No meetings yet...</p>
    </div>
    
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Current meetings:</h2>
      <div v-if="currentMeetings.length > 0" class="flex gap-3 flex-row flex-wrap md:flex-col">
        <MeetingCard v-for="meeting in currentMeetings" :key="meeting.id" :meeting="meeting" show-attendance :club="club" />
      </div>
      <p v-else class="italic text-black dark:text-white">There are no meetings right now...</p>
    </div>
  </div>

  <CreateMeetingDialog v-model:show="showModal" @create-meeting="createMeeting" />
</template>
