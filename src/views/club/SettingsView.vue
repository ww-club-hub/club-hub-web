<script setup lang="ts">
import { db } from "@/firebase";
import { ref } from "vue";
import { ClubSignupType, OfficerPermission, type Club, type ClubRole } from "@/schema";
import { useRoute, useRouter } from "vue-router";
import { doc, setDoc } from "firebase/firestore";
import { onMounted } from "vue";
import FormInput from "@/components/FormInput.vue";
import GeneralMeetingTimeSelection from "@/components/GeneralMeetingTimeSelection.vue";
import FormSelect from "@/components/FormSelect.vue";
import { showSuccessToast } from "@/toast";
import { getCurrentInstance } from "vue";

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

const context = getCurrentInstance()?.appContext;

async function onFormSubmit() {
  await setDoc(doc(db, "schools", props.school, "clubs", clubId), club.value, {
    mergeFields: ['name', 'description', 'contact', 'logoUrl', 'signup', 'meetings', 'attendanceRequirements']
  });

  showSuccessToast("Club Settings saved", context, 3000);
}

function addMeetingTime() {
  if (!club.value!.meetings) club.value!.meetings = [];
  club.value!.meetings.push({ type: 'time', day: 1, start: 0, end: 0, room: '' })
}

onMounted(async () => {
  // init club
  club.value = props.club;
  if (!club.value!.meetings) club.value!.meetings = [];
  if (!club.value.logoUrl) club.value.logoUrl = "";
});


</script>

<template>
  <form @submit.prevent="onFormSubmit" class="space-y-4 md:space-y-6" v-if="club">
    <!-- TODO: better typography + form grid layout -->
    <FormInput label="Name:" type="text" required v-model="club.name"/>
    <FormInput label="Description:" type="text" required v-model="club.description" />
    <FormInput label="Club Contact Email:" type="text" required v-model="club.contact.email" />
    <FormInput label="Sponsor:" type="email" required v-model="club.contact.sponsor" />
    <FormInput label="Logo URL:" type="url" v-model="club.logoUrl" />

    <div class="flex flex-col md:flex-row gap-4">
      <div>
        <FormInput
          label="Member Attendance Requirement (%):"
          type="number"
          min="0"
          max="100"
          required
          v-model.number="club.attendanceRequirements.memberPercentage"
          class="mb-3"
        />
        <div class="md:col-span-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
          Percentage of meetings a member must attend to retain membership in the club.
        </div>
      </div>
      <div>
        <FormInput
          label="Officer Attendance Requirement (%):"
          type="number"
          min="0"
          max="100"
          required
          v-model.number="club.attendanceRequirements.officerPercentage"
          class="mb-3"
        />
        <div class="md:col-span-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
          Percentage of meetings a member must attend to be eligible to run for an officer position.
        </div>
      </div>
    </div>

    <div class="flex items-start gap-3">
      <FormSelect
        class="max-w-md grow"
        v-model="club.signup.type"
        label="Signup mode"
        :options="[
          { value: ClubSignupType.Private, label: 'Private' },
          { value: ClubSignupType.Open, label: 'Open to anyone' },
          { value: ClubSignupType.ApplicationRequired, label: 'Application required' }
        ]"
        />
      <FormInput label="Signup Application URL:" type="url" v-model="club.signup.formUrl" v-if="club.signup.type == ClubSignupType.ApplicationRequired" class="grow" />
    </div>

    <h3 class="text-lg font-bold text-black dark:text-white mb-2">Usual meeting times:</h3>
    <p class="text-black dark:text-white">This gives members an idea of when meetings usually occur for this club. You can schedule specific meetings on the meetings page.</p>
    <div class="gap-3" v-if="club.meetings?.length > 0">
      <GeneralMeetingTimeSelection v-for="_, i in club.meetings" :key="i" v-model="club.meetings[i]" />
    </div>
    <p v-else class="italic text-black dark:text-white">No meeting times set...</p>

    <button type="button" class="text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800 me-2" @click="addMeetingTime">Add meeting time +</button>
    <button type="button" class="text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800" @click="club?.meetings?.pop()">Remove</button>
    <!-- TODO: topic list -->

    <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Save</button>
  </form>
</template>
