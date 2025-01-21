<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref } from "vue";
import { OfficerPermission, type Club, type UserClaims } from "@/utils";
import { useRoute, useRouter } from "vue-router";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { onMounted } from "vue";

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
    <div class="max-w-screen-2xl mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">Club Settings: {{ club?.name }}</h1>
      </div>

      <form @submit.prevent="onFormSubmit" class="space-y-4 md:space-y-6" v-if="club">
        <!-- TODO: better typography + form grid layout -->
        <FormInput label="Name:" type="text" required v-model="club.name"/>
        <FormInput label="Description:" type="text" required v-model="club.description" />
        <FormInput label="Club Contact Email:" type="text" v-model="club.contact.email" />
        <FormInput label="Sponsor:" type="text" required v-model="club.contact.sponsor" />
        <FormInput label="Logo URL:" type="url" v-model="club.logoUrl" />

        <!-- TODO: meeting time/place selection -->
        <!-- TODO: topic list -->

        <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Save</button>
      </form>
    </div>
  </section>
</template>
