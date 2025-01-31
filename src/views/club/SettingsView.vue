<script setup lang="ts">
import { db } from "@/firebase";
import { ref } from "vue";
import { ClubSignupType, OfficerPermission, type Club, type ClubRole } from "@/schema";
import { useRoute, useRouter } from "vue-router";
import { doc, setDoc } from "firebase/firestore";
import { onMounted } from "vue";
import FormInput from "@/components/FormInput.vue";
import TimeInput from "@/components/TimeInput.vue";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

const router = useRouter();
const route = useRoute();

const clubId = route.params.clubId as string;

// must be officer/stuco for editing settings
if (!(props.role.stuco || (props.role.officer & OfficerPermission.ClubDetails)))
  router.push({ name: "club-list" });

const club = ref<Club | null>(null);

async function onFormSubmit() {
  await setDoc(doc(db, "schools", props.school, "clubs", clubId), club.value);

  router.push({ name: "club-list" });
}

function addMeetingTime() {
  if (!club.value!.meetings) club.value!.meetings = [];
  club.value!.meetings.push({ type: 'time', day: 1, start: 0, end: 0, room: '' })
}

onMounted(async () => {
  // init club
  club.value = props.club;
});

</script>

<template>
  <form @submit.prevent="onFormSubmit" class="space-y-4 md:space-y-6" v-if="club">
    <!-- TODO: better typography + form grid layout -->
    <FormInput label="Name:" type="text" required v-model="club.name"/>
    <FormInput label="Description:" type="text" required v-model="club.description" />
    <FormInput label="Club Contact Email:" type="text" required v-model="club.contact.email" />
    <FormInput label="Sponsor:" type="text" required v-model="club.contact.sponsor" />
    <FormInput label="Logo URL:" type="url" v-model="club.logoUrl" />
    
    <div class="flex items-start gap-3">
      <div class="max-w-md grow">
        <label for="signup-modes" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Signup mode</label>
        <select required id="signup-modes" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" v-model="club.signup.type">
          <option selected>Choose a signup type</option>
          <option :value="ClubSignupType.Private">Private</option>
          <option :value="ClubSignupType.Open">Open to anyone</option>
          <option :value="ClubSignupType.ApplicationRequired">Application required</option>
        </select>
      </div>
      
      <FormInput label="Signup Application URL:" type="url" v-model="club.signup.formUrl" v-if="club.signup.type == ClubSignupType.ApplicationRequired" class="grow" />
    </div>
    
    <h3 class="text-lg font-bold text-black dark:text-white">Meeting times:</h3>
    <div class="lg:columns-2 gap-3" v-if="club.meetings?.length > 0">
      <div v-for="meeting, i in club.meetings" :key="i" class="flex items-start gap-3 break-inside-avoid-column mb-3">
        <div>
          <label :for='`meeting-type-${i}`' class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Type:</label>
          <select required :id='`meeting-type-${i}`' class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500 min-w-24" v-model="meeting.type">
            <option value="time">Time</option>
            <option value="flex">Flex</option>
          </select>
        </div>
        <template v-if="meeting.type == 'time'">
          <div>
            <label :for='`meeting-day-${i}`' class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Day:</label>
            <select required :id='`meeting-day-${i}`' class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" v-model.number="meeting.day">
              <option value="0">Sunday</option>
              <option value="1">Monday</option>
              <option value="2">Tuesday</option>
              <option value="3">Wednesday</option>
              <option value="4">Thursday</option>
              <option value="5">Friday</option>
              <option value="6">Saturday</option>
            </select>
          </div>
          <TimeInput label="Start time" v-model="meeting.start" required />
          <TimeInput label="End time" v-model="meeting.end" required />
          <FormInput label="Room number" type="text" v-model="meeting.room" required />
        </template>
        <template v-else>
          <FormInput label="Session name" type="text" v-model="meeting.session" required />
        </template>
      </div>
    </div>
    <p v-else class="italic text-black dark:text-white">No meeting times set...</p>
    
    <button type="button" class="text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800 me-2" @click="addMeetingTime">Add meeting time +</button>
    <button type="button" class="text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800" @click="club?.meetings?.pop()">Remove</button>
    <!-- TODO: topic list -->
    
    <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Save</button>
  </form>
</template>
