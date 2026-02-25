<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink } from 'vue-router';
import { auth, db } from '@/firebase';
import type { Club, ClubMeeting, ClubUpdate } from '@/schema';
import { type DocWithId, getClaims, typedGetDocs, typedGetDoc } from '@/utils';
import { collection, doc, limit, orderBy, query, where } from 'firebase/firestore';

type UpdateItem = {
  update: DocWithId<ClubUpdate>,
  club: DocWithId<Club>
}

const myClubs = ref<{ club: DocWithId<Club>, activeMeeting: DocWithId<ClubMeeting> | null }[]>([]);
const messages = ref<UpdateItem[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const hiddenMessages = ref<string[]>([])

onMounted(async () => {
  try {
    // get all messaged
    const claims = await getClaims(auth);
    if (!claims) {
      error.value = "Unable to load user claims";
      loading.value = false;
      return;
    }

    const clubs = new Set<string>();
    claims.memberOf?.forEach(c => clubs.add(c));
    if (claims.officerOf) Object.keys(claims.officerOf).forEach(c => clubs.add(c));
    const clubsList = [...clubs];

    const theTime = Date.now();
    const THIRTY_MIN_MS = 30 * 60 * 1000;

    myClubs.value = await Promise.all(clubsList.map(async club => {
      const clubRef = doc(db, "schools", claims.school, "clubs", club);
      const meetingsCollection = collection(clubRef, "meetings");
      //const meetingsCollection = collection(db, "schools", claims.school, "clubs", club, "meetings");

      const activeMeetings = await typedGetDocs<ClubMeeting>(
        query(
          meetingsCollection,
          where("endTime", ">=", theTime - THIRTY_MIN_MS),
          where("startTime", "<=", theTime + THIRTY_MIN_MS),
          orderBy("startTime", "asc"),
          limit(1)
        )
      );

      console.log(activeMeetings);

      let activeMeeting = null;
      if (activeMeetings.length > 0) {
        activeMeeting = activeMeetings[0];
      }
      const clubDoc = await typedGetDoc<Club>(clubRef);
      return {
        club: clubDoc!,
        activeMeeting
      };
    }));

    messages.value = (await Promise.all(clubsList.map(async club => {
      // get most recent message
      const docs = await typedGetDocs<ClubUpdate>(
        query(
          collection(db, "schools", claims.school, "clubs", club, "messages"),
          orderBy("timestamp", "desc"),
          limit(1)
        )
      );

      return docs.map(u => ({
        update: u,
        club: myClubs.value.find(c => c.club.id == club)!.club
      }));
    }))).flat();

    loading.value = false;
  } catch (e) {
    //console.error("Error loading dashboard:", e);
    error.value = "Failed to load dashboard data";
    throw e;
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
    <div class="max-w-7xl mx-auto">
      <!-- Loading State -->
      <div v-if="loading" class="flex items-center justify-center min-h-100">
        <div class="text-center">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex items-center justify-center min-h-100">
        <div class="text-center">
          <p class="text-red-600 dark:text-red-400">{{ error }}</p>
        </div>
      </div>

      <!-- Dashboard Content -->
      <section v-else class="grid grid-cols-5 md:grid-cols-2 lg:grid-cols-5 gap-y-6">
        <!-- Messages -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-2 space-x-2">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-700 dark:text-white">Recent Messages</h2>
              <a href="#" class="text-blue-500 dark:text-blue-300">All Messages</a>
            </div>

          <!--  Messages from club officers: placeholders -->
            <div class="space-y-4">
              <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow" v-for="message in messages.filter((m) => !hiddenMessages.includes(m.update.id))">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="flex items-center">
                      <img v-if="message.club.logoUrl" :src="message.club.logoUrl" alt="Club icon" class="w-10 h-10 rounded-full mr-4">
                      <div>
                        <!-- TODO: resolve emails to name -->
                        <h3 class="text-lg font-semibold text-gray-700 dark:text-white">{{ message.club.name }}: {{ message.update.creator }}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ message.update.timestamp.toDate().toLocaleString() }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button class="rounded-full text-gray-700 dark:text-white hover:bg-gray-500 p-3" @click="hiddenMessages.push(message.update.id)">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 dark:text-gray-300 mt-2">{{ message.update.description }}</p>
              </div>
            </div>
        </div>

        <!--  My Clubs -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-3">
          <h2 class="text-xl font-semibold text-gray-700 dark:text-white mb-4">My Clubs</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RouterLink
              :to="{ name: 'club-dashboard', params: { clubId: club.id } }"
              v-for="{ club } in myClubs"
              :key="club.id"
              class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow hover:shadow-lg transition-shadow duration-200 flex items-center gap-4 group"
            >
              <img
                v-if="club.logoUrl"
                :src="club.logoUrl"
                :alt="club.name + ' logo'"
                class="w-16 h-16 rounded-full object-cover shrink-0"
              >
              <div v-else class="w-16 h-16 rounded-full pg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0">
                <span class="text-white text-2xl font-bold">{{ club.name.charAt(0).toUpperCase() }}</span>
              </div>
              <div class="flex-1 min-w-0">
                <h3 class="text-xl font-semibold text-gray-700 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                  {{ club.name }}
                </h3>
                <p class="text-sm text-gray-500 dark:text-gray-400 truncate">{{ club.description }}</p>
              </div>
            </RouterLink>

            <div v-if="myClubs.length === 0" class="col-span-full text-center py-8">
              <p class="text-gray-500 dark:text-gray-400 mb-4">You haven't joined any clubs yet.</p>
              <RouterLink
                :to="{ name: 'club-list' }"
                class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg transition-colors"
              >
                Browse Clubs
              </RouterLink>
            </div>
          </div>
        </div>

      </section>
    </div>
  </div>
</template>
