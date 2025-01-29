<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { type UserClaims } from "@/utils";
import { type Club } from "@/schema";
import { useRoute, useRouter } from "vue-router";
import { doc, getDoc } from "firebase/firestore";

const route = useRoute();

const clubId = route.params.clubId as string;

const claims = (await getIdTokenResult(auth.currentUser!, false)).claims as UserClaims;
const stuco = claims.role == "owner" || claims.role == "admin";
const officer = (claims.officerOf && clubId in claims.officerOf);
const member = claims.memberOf?.includes(clubId);

const club = (await getDoc(doc(db, "schools", claims.school, "clubs", clubId))).data() as Club;

</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4 flex flex-row gap-3">
      <div>
        <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700 flex items-center gap-3">
          <img class="w-8 h-8" alt="Club icon" :src="club.logoUrl" />
          <h1 class="text-2xl text-black dark:text-white font-bold mb-2">{{ club.name }}</h1>
        </div>
        <p class="text-gray-700 dark:text-gray-200 mb-4 text-lg">{{ club.description }}</p>

        <!-- meeting times -->
        <h2 class="text-xl text-black dark:text-white font-semibold mb-2">Meeting times:</h2>
      </div>
      <!-- join sidebar -->
      <div class="m-3 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 ms-auto rounded-sm p-3">
        <template v-if="stuco || officer">
          <router-link :to="{ name: 'club-settings', params: { clubId } }" v-if="officer" class="w-full text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-2 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800">Club Settings</router-link>
          <router-link :to="{ name: 'club-dashboard', params: { clubId } }" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Go to Dashboard</router-link>
        </template>
      </div>
    </div>
  </section>
</template>
