<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref } from "vue";
import type { UserClaims } from "@/utils";
import { ClubSignupType, OfficerPermission, type Club } from "@/schema";
import { useRoute, useRouter } from "vue-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onMounted } from "vue";
import FormInput from "@/components/FormInput.vue";
import MeetingScheduleSelection from "@/components/MeetingScheduleSelection.vue";

const router = useRouter();
const route = useRoute();

const clubId = route.params.clubId as string;

const claims = (await getIdTokenResult(auth.currentUser!)).claims as UserClaims;
const stuco = claims.role == "owner" || claims.role == "admin";
const officer = clubId in claims.officerOf && (claims.officerOf[clubId] & OfficerPermission.ClubDetails);

if (!stuco && !officer)
  router.push({ name: "club-list" });

const club = ref<Club | null>(null);

async function onFormSubmit() {
  await setDoc(doc(db, "schools", claims.school, "clubs", clubId), club.value);

  router.push({ name: "club-list" });
}

onMounted(async () => {
  // fetch club
  const clubDoc = await getDoc(doc(db, "schools", claims.school, "clubs", clubId));
  club.value = clubDoc.data() as Club;
});

</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">Club Settings: {{ club?.name }}</h1>
      </div>

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
        <!-- TODO: meeting time/place selection -->
        <MeetingScheduleSelection v-model="club.meetings" />
        <!-- TODO: topic list -->

        <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Save</button>
      </form>
    </div>
  </section>
</template>
