<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { collection, getDocs, or, query, where } from "firebase/firestore";
import { computed, ref } from "vue";
import { clubMeetingTimesToString, getClubPresidentEmail, type UserClaims } from "@/utils";
import { getCachedProfile } from "@/stores/profiles";
import { type Club } from "@/schema";
import { onMounted } from "vue";
import { onUnmounted } from "vue";

// todo: the pagination here is a buns claude implementation; replace with actual firebase pagination (and possibly real search?)

const claims = (await getIdTokenResult(auth.currentUser!)).claims as UserClaims;
const stuco = claims.role == "owner" || claims.role == "admin";

const clubs = ref<Club[]>([]);
const searchQuery = ref("");
const searchFilter = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;

// ID of the dropdown that is currently shown
const clubDetailsDropdown = ref<string | null>(null);

// fetch president profiles with club
const presidentNames = ref<Record<string, string>>({});

function onDocumentClick() {
  clubDetailsDropdown.value = null;
}

async function onSearch() {
  searchFilter.value = searchQuery.value;
  currentPage.value = 1;
}

function matches(club: Club): boolean {
  const query = searchFilter.value.toLowerCase();
  if (club.name.toLowerCase().includes(query)) return true;
  if (club.description.toLowerCase().includes(query)) return true;
  return false;
}

function getClubStatus(clubId: string): "member" | "officer" | null {
  if (claims.officerOf && clubId in claims.officerOf) return "officer";
  if (claims.memberOf?.includes(clubId)) return "member";
  return null;
}

const filteredClubs = computed(() => {
  return clubs.value.filter(matches);
});

const paginatedClubs = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredClubs.value.slice(start, end);
});

const totalPages = computed(() => {
  return Math.ceil(filteredClubs.value.length / itemsPerPage);
});

const paginationStart = computed(() => {
  return Math.min((currentPage.value - 1) * itemsPerPage + 1, filteredClubs.value.length);
});

const paginationEnd = computed(() => {
  return Math.min(currentPage.value * itemsPerPage, filteredClubs.value.length);
});

function previousPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
}

onMounted(async () => {
  const col = collection(db, "schools", claims.school, "clubs");
  const clubsQuery = stuco ? col : query(col, where("signup.type", "!=", 0));
  const docs = await getDocs(clubsQuery)
  clubs.value = docs.docs.map(s => ({
    id: s.id,
    ...s.data()
  } as Club));

  // Fetch all president names upfront
  for (const club of clubs.value) {
    try {
      const email = getClubPresidentEmail(club.officers);
      const profile = await getCachedProfile(email);
      presidentNames.value[club.id] = profile.displayName || email;
    } catch {
      presidentNames.value[club.id] = "Unknown";
    }
  }

  document.addEventListener("click", onDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener("click", onDocumentClick);
});
</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">Clubs at your school</h1>
      </div>

      <div class="bg-white dark:bg-gray-800 relative shadow-md sm:rounded-lg">
        <div class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
          <div class="w-full md:w-1/2">
            <form class="flex items-center" @submit.prevent="onSearch">
              <label for="club-search" class="sr-only">Search</label>
              <div class="relative w-full">
                <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <svg aria-hidden="true" class="w-5 h-5 text-gray-500 dark:text-gray-400" fill="currentColor"
                    viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clip-rule="evenodd" />
                  </svg>
                </div>
                <input type="text" id="club-search" v-model="searchQuery"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full pl-10 p-2 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500"
                  placeholder="Search">
              </div>
            </form>
          </div>
          <div
            class="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 shrink-0">
            <!-- TODO: show club application form if not admin -->
            <router-link to="/clubs/create"
              class="flex items-center justify-center text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800"
              v-if="stuco">
              <svg class="h-3.5 w-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true">
                <path clip-rule="evenodd" fill-rule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
              </svg>
              Create club
            </router-link>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
            <thead class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400">
              <tr>
                <th scope="col" class="px-4 py-3">Name</th>
                <th scope="col" class="px-4 py-3">Description</th>
                <th scope="col" class="px-4 py-3">President</th>
                <th scope="col" class="px-4 py-3">Meeting Time</th>
                <th scope="col" class="px-4 py-3">
                  <span class="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr class="border-b dark:border-gray-700"
                v-for="club in paginatedClubs"
                :key="club.id">
                <th scope="row" class="px-4 py-3 font-medium text-gray-900 whitespace-nowrap dark:text-white flex items-center gap-2">
                  <span>{{ club.name }}</span>
                  <span v-if="getClubStatus(club.id) === 'officer'" class="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-1 py-0.5 rounded inline-flex gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                      <path fill-rule="evenodd" d="M9.664 1.319a.75.75 0 0 1 .672 0 41.059 41.059 0 0 1 8.198 5.424.75.75 0 0 1-.254 1.285 31.372 31.372 0 0 0-7.86 3.83.75.75 0 0 1-.84 0 31.508 31.508 0 0 0-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 0 1 3.305-2.033.75.75 0 0 0-.714-1.319 37 37 0 0 0-3.446 2.12A2.216 2.216 0 0 0 6 9.393v.38a31.293 31.293 0 0 0-4.28-1.746.75.75 0 0 1-.254-1.285 41.059 41.059 0 0 1 8.198-5.424ZM6 11.459a29.848 29.848 0 0 0-2.455-1.158 41.029 41.029 0 0 0-.39 3.114.75.75 0 0 0 .419.74c.528.256 1.046.53 1.554.82-.21.324-.455.63-.739.914a.75.75 0 1 0 1.06 1.06c.37-.369.69-.77.96-1.193a26.61 26.61 0 0 1 3.095 2.348.75.75 0 0 0 .992 0 26.547 26.547 0 0 1 5.93-3.95.75.75 0 0 0 .42-.739 41.053 41.053 0 0 0-.39-3.114 29.925 29.925 0 0 0-5.199 2.801 2.25 2.25 0 0 1-2.514 0c-.41-.275-.826-.541-1.25-.797a6.985 6.985 0 0 1-1.084 3.45 26.503 26.503 0 0 0-1.281-.78A5.487 5.487 0 0 0 6 12v-.54Z" clip-rule="evenodd" />
                    </svg>
                    Officer
                  </span>
                  <span v-else-if="getClubStatus(club.id) === 'member'" class="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-1 py-0.5 rounded inline-flex gap-2 items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                      <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
                    </svg>
                    Member
                  </span>
                </th>
                <td class="px-4 py-3">{{ club.description }}</td>
                <td class="px-4 py-3">
                  {{ presidentNames[club.id] || "Unknown" }}
                </td>
                <td class="px-4 py-3">{{ clubMeetingTimesToString(club.meetings) }}</td>
                <td class="px-4 py-3 flex items-center justify-end">
                  <router-link
                    class="w-auto me-12 inline-flex items-center p-0.5 text-sm justify-center text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg  px-4 py-2 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800"
                    :to="`/clubs/${club.id}`" v-if="stuco || claims.memberOf?.includes(club.id) || (club.id in (claims.officerOf ?? {}))">
                    View Dashboard
                  </router-link>
                  <router-link
                    class="w-auto me-12 inline-flex items-center p-0.5 text-sm justify-center text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg  px-4 py-2 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800"
                    :to="`/clubs/${club.id}/info`" v-else>
                    Details
                  </router-link>

                  <div class="absolute">

                    <button
                      class="inline-flex items-center p-0.5 text-sm font-medium text-center text-gray-500 hover:text-gray-800 rounded-lg focus:outline-hidden dark:text-gray-400 dark:hover:text-gray-100"
                      type="button"
                      @click.stop="clubDetailsDropdown === club.id ? clubDetailsDropdown = null : clubDetailsDropdown = club.id">
                      <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>

                    <div :hidden="clubDetailsDropdown !== club.id"
                      class="z-40 w-44 bg-white rounded-sm divide-y divide-gray-100 shadow-sm dark:bg-gray-700 dark:divide-gray-600 absolute right-0 top-9"
                      @click.stop>
                      <ul class="py-1 text-sm text-gray-700 dark:text-gray-200">
                        <li>
                          <router-link :to="`/clubs/${club.id}/info`"
                            class="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Details</router-link>
                        </li>
                        <li v-if="stuco || auth.currentUser!.email! in club.officers">
                          <router-link :to="`/clubs/${club.id}/edit`"
                            class="block py-2 px-4 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white">Edit</router-link>
                        </li>
                      </ul>

                      <div class="py-1" v-if="stuco">
                        <a href="#"
                          class="block py-2 px-4 text-sm text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-200 dark:hover:text-white">Delete</a>
                      </div>
                    </div>

                  </div>

                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <!-- pagination -->
        <nav class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4"
          aria-label="Table navigation">
          <span class="text-sm font-normal text-gray-500 dark:text-gray-400">
            Showing
            <span class="font-semibold text-gray-900 dark:text-white">{{ paginationStart }}-{{ paginationEnd }}</span>
            of
            <span class="font-semibold text-gray-900 dark:text-white">{{ filteredClubs.length }}</span>
          </span>
          <ul class="inline-flex items-stretch -space-x-px">
            <li>
              <button @click="previousPage" :disabled="currentPage === 1"
                class="flex items-center justify-center h-full py-1.5 px-3 ml-0 text-gray-500 bg-white rounded-l-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="sr-only">Previous</span>
                <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd"
                    d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
                    clip-rule="evenodd" />
                </svg>
              </button>
            </li>
            <li v-for="page in totalPages" :key="page">
              <button @click="goToPage(page)"
                :class="[
                  'flex items-center justify-center text-sm py-2 px-3 leading-tight border',
                  currentPage === page
                    ? 'z-10 text-orange-600 bg-orange-50 border-orange-300 hover:bg-orange-100 dark:border-gray-700 dark:bg-gray-700 dark:text-white'
                    : 'text-gray-500 bg-white border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
                ]">
                {{ page }}
              </button>
            </li>
            <li>
              <button @click="nextPage" :disabled="currentPage === totalPages"
                class="flex items-center justify-center h-full py-1.5 px-3 leading-tight text-gray-500 bg-white rounded-r-lg border border-gray-300 hover:bg-gray-100 hover:text-gray-700 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed">
                <span class="sr-only">Next</span>
                <svg class="w-5 h-5" aria-hidden="true" fill="currentColor" viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg">
                  <path fill-rule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clip-rule="evenodd" />
                </svg>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  </section>
</template>
