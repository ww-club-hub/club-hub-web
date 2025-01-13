<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref } from "vue";
import { type Club, type UserClaims } from "@/utils";
import { useRouter } from "vue-router";
import { addDoc, collection } from "firebase/firestore";

const claims = (await getIdTokenResult(auth.currentUser!)).claims as UserClaims;
const stuco = claims.role == "owner" || claims.role == "admin";

const router = useRouter();

// only stuco can create clubs directly
if (!stuco) {
  router.push({ name: "club-list" });
}

const name = ref("");
const description = ref("");
// email - we will fetch their name
const president = ref("");
const contactEmail = ref("");
const sponsor = ref("");

async function onFormSubmit() {
  // TODO: fetch president name
  const club: Partial<Club> = {
    name: name.value,
    description: description.value,
    officers: {
      [president.value]: {
        name: "me",
        role: "President"
      }
    },
    contact: {
      email: contactEmail.value,
      sponsor: sponsor.value
    }
  };

  await addDoc(collection(db, "schools", claims.school, "clubs"), club);

  router.push({ name: "club-list" });
}
</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-screen-2xl mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">Create a Club</h1>
      </div>

      <form @submit.prevent="onFormSubmit" class="space-y-4 md:space-y-6">
        <div>
          <label for="input-name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name:</label>
          <input type="text" v-model="name" id="input-name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
        </div>

        <div>
          <label for="input-description" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Description:</label>
          <input type="text" v-model="description" id="input-description" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
        </div>

        <div>
          <label for="input-president" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">President's Student Email:</label>
          <input type="email" v-model="president" id="input-president" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
        </div>

        <div>
          <label for="input-sponsor" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Sponsor:</label>
          <input type="text" v-model="sponsor" id="input-sponsor" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
        </div>

        <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Create</button>
      </form>
    </div>
  </section>
</template>
