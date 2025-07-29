<script setup lang="ts">
import {  getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { ref } from "vue";
import { type UserClaims } from "@/utils";
import { ClubSignupType, OfficerPermission, type Club } from "@/schema";
import { useRouter } from "vue-router";
import { addDoc, collection } from "firebase/firestore";
import { api, isTRPCClientError } from "@/api";
import FormInput from "@/components/FormInput.vue";
import { getCachedProfile } from "@/profiles";

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
//const contactEmail = ref("");
const sponsor = ref("");
const errorMessage = ref("");

async function onFormSubmit() {
  errorMessage.value = "";

  try {
    // fetch president name
    const { displayName } = await getCachedProfile(president.value)
    const officers = {
      [president.value]: {
        name: displayName as string,
        role: "President",
        permissions: OfficerPermission.All
      }
    };
    const club: Partial<Club> = {
      name: name.value,
      description: description.value,
      contact: {
        sponsor: sponsor.value
      },
      signup: {
        type: ClubSignupType.Private
      },
      // the officer is initially a member
      numMembers: 1
    };

    const doc = await addDoc(collection(db, "schools", claims.school, "clubs"), club);

    // update officers and members (batch operation)
    await Promise.all([
      api.club.members.mutate({ clubId: doc.id, memberEmail: president.value }),
      api.club.officers.mutate({ clubId: doc.id, officers })
    ]);

    router.push({ name: "club-list" });
  } catch (err) {
    if (isTRPCClientError(err)) {
      if (err.data?.code === "NOT_FOUND")
        errorMessage.value = `The president email ${president.value} is not associated with any ClubHub account.`;

      // else, generic error
      else errorMessage.value = err.message;
    }
  }
}
</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">Create a Club</h1>
      </div>

      <form @submit.prevent="onFormSubmit" class="space-y-4 md:space-y-6">
        <FormInput label="Name:" type="text" required v-model="name" />
        <FormInput label="Description:" type="text" required v-model="description" />
        <FormInput label="President's Student Email:" type="email" required v-model="president" />
        <FormInput label="Sponsor:" type="email" required v-model="sponsor" />

        <p v-if="errorMessage" class="mb-2 text-rose-600 dark:text-rose-400 italic">{{ errorMessage }}</p>

        <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Create</button>
      </form>
    </div>
  </section>
</template>
