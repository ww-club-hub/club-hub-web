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

const meetingId = route.query.meetingId as string;

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference<DocumentData, DocumentData>
}>();

const docRef = doc(props.clubDoc, "meeting_attendance", meetingId);
const meeting: Ref<DocWithId<ClubMeeting | null>> = ref(null);

onMounted(async () => {
  meeting.value = await typedGetDoc<ClubMeeting>(doc(props.clubDoc, "meetings", meetingId));
});
</script>

<template>
    <div class="rounded-lg p-3 shadow-md dark:bg-gray-800 bg-gray-100 text-gray-800 dark:text-gray-200">
        <p class="text-2xl text-center py-3">{{ meeting.startTime.toDate().toLocaleTimeString() }} - {{ meeting.endTime.toDate().toLocaleTimeString() }}</p>
        <p class="text-xl text-center italic py-1">Enter attendance code:</p>

    </div>
</template>
