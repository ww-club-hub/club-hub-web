<script setup lang="ts">
import { db } from "@/firebase";
import { ref } from "vue";
import { ClubSignupType, OfficerPermission, type Club, type ClubRole } from "@/schema";
import { useRoute, useRouter } from "vue-router";
import { doc, setDoc, type DocumentReference } from "firebase/firestore";
import { onMounted } from "vue";
import FormInput from "@/components/form/FormInput.vue";
import GeneralMeetingTimeSelection from "@/components/meetings/GeneralMeetingTimeSelection.vue";
import FormSelect from "@/components/form/FormSelect.vue";
import { showSuccessToast } from "@/toast";
import { getCurrentInstance } from "vue";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference
}>();

const router = useRouter();
const route = useRoute();

const clubId = route.params.clubId as string;

// must be officer/stuco for editing settings
if (!(props.role.stuco || (props.role.officer & OfficerPermission.ClubDetails)))
  router.push({ name: "club-list" });

const club = ref<Club | null>(null);
const isSaving = ref(false);

const context = getCurrentInstance()?.appContext;

async function onFormSubmit() {
  try {
    isSaving.value = true;
    await setDoc(props.clubDoc, club.value, {
      mergeFields: ['name', 'description', 'contact', 'logoUrl', 'signup', 'meetings', 'attendanceRequirements']
    });

    showSuccessToast("Club Settings saved", context, 3000);
  } finally {
    isSaving.value = false;
  }
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
  <form @submit.prevent="onFormSubmit" v-if="club" class="max-w-(--breakpoint-2xl) mx-auto p-4">
    <!-- Top Section Grid -->
    <div class="grid lg:grid-cols-2 gap-8 mb-8">
      <!-- Basic Info Section -->
      <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Basic Information</h2>
        <div class="space-y-4">
          <FormInput label="Club Name" type="text" required v-model="club.name" />
          <FormInput label="Description" type="text" required v-model="club.description" />
          
          <!-- Logo URL with inline preview -->
          <div class="flex gap-3 items-center">
            <FormInput label="Logo URL" type="url" v-model="club.logoUrl" class="grow"/>
            <div v-if="club.logoUrl" class="shrink-0 pt-8">
              <img 
                :src="club.logoUrl" 
                alt="club logo preview" 
                class="h-6 w-6 object-contain rounded border border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Contact Section -->
      <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Contact Information</h2>
        <div class="space-y-4">
          <FormInput label="Club Contact Email" type="email" required v-model="club.contact.email" />
          <FormInput label="Sponsor Email" type="email" required v-model="club.contact.sponsor" />
        </div>
      </div>
    </div>

    <!-- Bottom Section Grid -->
    <div class="grid lg:grid-cols-2 gap-8 mb-8">
      <!-- Signup Settings Section -->
      <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Signup Settings</h2>
        <div class="space-y-4">
          <FormSelect
            v-model="club.signup.type"
            label="Signup Mode"
            :options="[
              { value: ClubSignupType.Private, label: 'Private' },
              { value: ClubSignupType.Open, label: 'Open to anyone' },
              { value: ClubSignupType.ApplicationRequired, label: 'Application required' }
            ]"
          />
          
          <!-- Status Message for each mode -->
          <div v-if="club.signup.type === ClubSignupType.Private" class="p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-900 dark:text-rose-100 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z" clip-rule="evenodd" />
            </svg>
            <span>This club is <span class="font-semibold">private</span>: only invited members can join.</span>
          </div>
          <div v-else-if="club.signup.type === ClubSignupType.Open" class="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg text-green-900 dark:text-green-100 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clip-rule="evenodd" />
            </svg>
            <span>This club has <span class="font-semibold">open signup</span>: any student from this school can join.</span>
          </div>
          <div v-else class="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-yellow-900 dark:text-yellow-100 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
              <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0 1 18 9.375v9.375a3 3 0 0 0 3-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 0 0-.673-.05A3 3 0 0 0 15 1.5h-1.5a3 3 0 0 0-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6ZM13.5 3A1.5 1.5 0 0 0 12 4.5h4.5A1.5 1.5 0 0 0 15 3h-1.5Z" clip-rule="evenodd" />
              <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 0 1 3 20.625V9.375ZM6 12a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V12Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 15a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V15Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75ZM6 18a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75H6.75a.75.75 0 0 1-.75-.75V18Zm2.25 0a.75.75 0 0 1 .75-.75h3.75a.75.75 0 0 1 0 1.5H9a.75.75 0 0 1-.75-.75Z" clip-rule="evenodd" />
            </svg>
            <span>This club requires an <span class="font-semibold">application</span>: applicants must complete the form to join.</span>
          </div>

          <!-- Application URL (only for Application Required mode) -->
          <FormInput
            v-if="club.signup.type === ClubSignupType.ApplicationRequired"
            label="Application Form URL"
            type="url"
            placeholder="https://forms.google.com/..."
            required
            v-model="club.signup.formUrl"
          />
        </div>
      </div>

      <!-- Attendance Requirements Section -->
      <div class="p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Attendance Requirements</h2>
        <div class="space-y-4">
          <div>
            <FormInput
              label="Member Attendance Requirement (%)"
              type="number"
              min="0"
              max="100"
              required
              v-model.number="club.attendanceRequirements.memberPercentage"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Percentage of meetings a member must attend to retain membership.
            </p>
          </div>
          <div>
            <FormInput
              label="Officer Attendance Requirement (%)"
              type="number"
              min="0"
              max="100"
              required
              v-model.number="club.attendanceRequirements.officerPercentage"
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Percentage of meetings required to be eligible for an officer position.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Meeting Times Section - Full Width -->
    <div class="mb-8 p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white mb-4">Usual Meeting Times</h2>
      <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This gives members an idea of when meetings usually occur. You can schedule specific meetings on the Meetings page.
      </p>
      
      <div v-if="club.meetings?.length > 0" class="space-y-3 mb-4">
        <div v-for="(_, i) in club.meetings" :key="i" class="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
          <div class="flex items-start justify-between gap-3">
            <div class="grow">
              <GeneralMeetingTimeSelection v-model="club.meetings[i]" />
            </div>
            <button
              type="button"
              @click="club.meetings?.splice(i, 1)"
              class="text-red-700 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 focus:outline-none ml-2"
              title="Remove meeting time"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                <path fill-rule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25Zm-1.72 6.97a.75.75 0 1 0-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 1 0 1.06 1.06L12 13.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L13.06 12l1.72-1.72a.75.75 0 1 0-1.06-1.06L12 10.94l-1.72-1.72Z" clip-rule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div v-else class="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-center">
        <p class="text-sm text-gray-500 dark:text-gray-400">No meeting times set yet.</p>
      </div>

      <button
        type="button"
        @click="addMeetingTime"
        class="mt-4 text-sm font-medium text-orange-700 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
      >
        + Add Meeting Time
      </button>
    </div>

    <!-- Save Button - Visually Distinct -->
    <div class="flex gap-3">
      <ButtonLoader
        type="submit"
        :loading="isSaving"
        class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-semibold rounded-lg text-base px-6 py-3 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
      >
        Save Changes
      </ButtonLoader>
    </div>
  </form>
</template>
