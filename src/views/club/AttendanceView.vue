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

</template>
