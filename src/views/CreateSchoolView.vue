<script setup lang="ts">
import { auth } from "../firebase";
import { onAuthStateChanged, type User, getIdToken, getIdTokenResult } from "firebase/auth";
import { computed } from "vue";
import { ref } from "vue";
import { useRouter } from "vue-router";

const user = ref<User | null>(null);
const schoolName = ref("");
const website = ref("");
const domainRestriction = ref(false);
const domains = ref<string[]>([]);
const errorMessage = ref("");

const router = useRouter();

const userEmailDomain = computed(() => {
  if (user.value?.email) {
    return user.value.email.split("@")[1];
  } else {
    return null;
  }
});

function addDomain() {
  domains.value.push("");
}

function removeDomain(i: number) {
  domains.value.splice(i, 1);
}

/**
 * Validate + create school
 */
async function onFormSubmit() {
  if (!user.value) return;
  
  const idToken = await getIdToken(user.value);
  
  // remove duplicates
  const dr = domainRestriction.value ? [
    ...new Set([...domains.value, userEmailDomain.value])
  ] : undefined;
  const body = {
    name: schoolName.value,
    website: website.value,
    domainRestriction : dr
  };
  // create school
  const res = await fetch("/api/school/create", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    }
  }).then(r => r.json()) as { error?: string; schoolId?: string };

  // propagate error message
  if (res.error) {
    errorMessage.value = res.error;
  } else {
    errorMessage.value = "";

    // refresh user token
    await getIdToken(user.value, true);
    router.push({ name: "onboard" });
  }
}

onAuthStateChanged(auth, async currentUser => {
  if (currentUser) {
    user.value = currentUser;
    const idToken = await getIdTokenResult(currentUser);
    // if they are already a part of a school, go back to onboarding
    if (idToken.claims.school) router.push({ name: "onboard" });
  }
});
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-900 grow flex flex-col items-center justify-center px-6 py-8 lg:py-0">
    <h1 class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
      Create a school:
    </h1>
    <div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
      <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
        <form class="space-y-4 md:space-y-6" @submit.prevent="onFormSubmit">
          <!-- school name -->
          <div>
            <label for="input-name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">School name:</label>
            <input type="text" id="input-name" v-model="schoolName" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required placeholder="Example High School" />
          </div>
          <!-- website URL -->
          <div>
            <label for="input-website" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Website:</label>
            <input type="url" id="input-website" v-model="website" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required placeholder="https://example.org" />
          </div>
          <!-- domain restriction -->
          <div class="flex">
            <div class="flex items-center h-5">
              <input id="check-domain-restriction" type="checkbox" v-model="domainRestriction" class="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
            </div>
            <div class="ms-2 text-sm">
              <label for="check-domain-restriction" class="font-medium text-gray-900 dark:text-gray-300">User email domain restriction</label>
              <p class="text-xs font-normal text-gray-500 dark:text-gray-300">Restrict user signups to emails from these domains</p>
            </div>
          </div>

          <div v-if="domainRestriction">
            <!-- header + add button -->
            <div class="flex items-center mb-3 justify-between">
              <p class="font-semibold text-gray-900 dark:text-white">Allowed domains:</p>
              <button @click="addDomain" type="button" class="text-gray-600 dark:text-gray-300 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" title="Add domain">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>

                <span class="sr-only">Add domain</span>
              </button>
            </div>

            <!-- the user's own domain cannot be removed -->
            <div class="flex items-center mb-2">
              <input type="text" :value="userEmailDomain" class="bg-gray-100 border border-gray-300 text-gray-900 text-sm rounded-lg block w-full p-2.5 cursor-not-allowed dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400 me-10" readonly disabled title="You cannot remove your own email domain" />
            </div>

            <!-- domain list -->
            <div class="flex items-center mb-2" v-for="_, i in domains">
              <input type="text" v-model="domains[i]" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required placeholder="student.example.org" />

              <button @click="removeDomain(i)" type="button" class="text-gray-600 dark:text-gray-300 bg-transparent hover:bg-rose-200 hover:text-rose-900 rounded-lg text-sm w-8 h-8 ms-3 inline-flex justify-center items-center dark:hover:bg-rose-600/50 dark:hover:text-rose-100" title="Remove this domain">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                  <path fill-rule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clip-rule="evenodd" />
                </svg>

                <span class="sr-only">Remove this domain</span>
              </button>
            </div>
          </div>

          <p v-if="errorMessage" class="mb-2 text-rose-600 dark:text-rose-400 italic">{{ errorMessage }}</p>

          <button type="submit" class="focus:outline-none text-white bg-emerald-700 hover:bg-emerald-800 focus:ring-4 focus:ring-emerald-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800">Create</button>
        </form>
      </div>
    </div>
</section>
</template>
