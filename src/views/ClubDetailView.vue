<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { days, type UserClaims, minutesToTimeString, getClubPresidentEmail } from "@/utils";
import { ClubSignupType, type Club } from "@/schema";
import { useRoute } from "vue-router";
import { doc, getDoc } from "firebase/firestore";
import { ref, computed } from "vue";
import { api, isTRPCClientError } from "@/api";

const route = useRoute();

const clubId = route.params.clubId as string;

const claims = ref((await getIdTokenResult(auth.currentUser!)).claims as UserClaims);
const stucoOrOfficer = computed(() => claims.value.role == "owner" || claims.value.role == "admin" || (claims.value.officerOf && clubId in claims.value.officerOf));
const member = computed(() => claims.value.memberOf?.includes(clubId) ?? false);

const club = (await getDoc(doc(db, "schools", claims.value.school, "clubs", clubId))).data() as Club;

const errorMessage = ref("");

async function join() {
  // add self to club
  try {
    await api.club.members.mutate({ clubId });
    // refresh id token
    claims.value = (await getIdTokenResult(auth.currentUser!, true)).claims as UserClaims;
    
  } catch (err) {
    if (isTRPCClientError(err)) {
      errorMessage.value = err.message;
    }
  }
}

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

        <div class="gap-3 flex flex-wrap">
          
          <div class="p-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
            <!-- meeting times -->
            <h2 class="text-xl text-black dark:text-white font-semibold mb-2">Meeting times:</h2>
            
            <div v-if="club.meetings?.length > 0" class="divide-y text-gray-900 dark:text-white dark:divide-gray-700">
              <div v-for="meetingTime in club.meetings" class="not-last:pb-3 not-first:pt-3">
                <p v-if="meetingTime.type === 'flex'">
                  <strong>Flex:</strong> {{ meetingTime.session }}
                </p>
                <p v-else>
                  <strong>{{ days[meetingTime.day] }}:</strong> {{ minutesToTimeString(meetingTime.start) }} - {{ minutesToTimeString(meetingTime.end) }} in {{ meetingTime.room }}
                </p>
              </div>
            </div>
          </div>
          
          <div class="p-3 rounded-sm border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
            <h2 class="text-xl text-black dark:text-white font-semibold mb-2">Contact info:</h2>
            
            <dl class="max-w-md text-gray-900 divide-y divide-gray-200 dark:text-white dark:divide-gray-700">
              <div class="flex flex-col pb-3">
                <dt class="mb-1 text-gray-500 md:text-lg dark:text-gray-400">Officers:</dt>
                <dd class="text-lg font-semibold">{{ club.contact.email ?? "N/A" }}</dd>
              </div>
              <div class="flex flex-col py-3">
                <dt class="mb-1 text-gray-500 md:text-lg dark:text-gray-400">President:</dt>
                <dd class="text-lg font-semibold">{{ getClubPresidentEmail(club.officers) }}</dd>
              </div>
              <div class="flex flex-col pt-3">
                <dt class="mb-1 text-gray-500 md:text-lg dark:text-gray-400">Sponsor:</dt>
                <dd class="text-lg font-semibold">{{ club.contact.sponsor }}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
      <!-- join sidebar -->
      <div class="m-3 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 ms-auto rounded-sm p-3 min-w-xs">
        <template v-if="stucoOrOfficer">
          <h2 class="text-xl font-bold text-gray-90 dark:text-white mb-3">Manage this club:</h2>
          <router-link :to="{ name: 'club-settings', params: { clubId } }" class="w-full text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center mb-4 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800 block">Club Settings</router-link>
          <router-link :to="{ name: 'club-dashboard', params: { clubId } }" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Go to Dashboard</router-link>
        </template>
        <template v-else-if="member">
          <h2 class="text-xl font-bold text-gray-90 dark:text-white mb-3">Access this club:</h2>
          <router-link :to="{ name: 'club-dashboard', params: { clubId } }" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Go to Dashboard</router-link>
        </template>
        <template v-else>
          <h2 class="text-xl font-bold text-gray-90 dark:text-white mb-3">Join this club:</h2>
          <button type="button" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="join" v-if="club.signup.type === ClubSignupType.Open">Join</button>
          <a class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" :href="club.signup.formUrl" v-else-if="club.signup.type === ClubSignupType.ApplicationRequired" target="_blank">Apply to Join</a>

          <!-- error message -->
          <p v-if="errorMessage" class="mb-2 text-rose-600 dark:text-rose-400 italic">{{ errorMessage }}</p>
        </template>
      </div>
    </div>
  </section>
</template>
