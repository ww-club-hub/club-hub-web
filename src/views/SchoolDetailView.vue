<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db, tryGetDocFromCache } from "../firebase";
import { doc } from "firebase/firestore";

const { claims } = await getIdTokenResult(auth.currentUser!);
const school = await tryGetDocFromCache(doc(db, "schools", claims.school as string));
</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">{{ school.get("name") }}</h1>
        <p class="text-lg">
          <a class="text-gray-800 dark:text-gray-200 hover:underline flex items-center gap-2" target="_blank" :href="school.get('website')">
            {{ school.get("website") }}
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          </a>
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <!-- admins -->
        <div class="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-sm grow">
          <h2 class="text-xl text-black dark:text-white font-bold mb-3">
            Your admins:
          </h2>

          <p class="text-gray-800 dark:text-gray-200 mb-1">{{ school.get('owner') }}</p>
          <p class="text-gray-800 dark:text-gray-200 mb-1" v-for="admin in school.get('admin')">{{ admin }}</p>
        </div>
        <!-- members -->
        <div class="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-sm grow">
          <h2 class="text-xl text-black dark:text-white font-bold mb-3">
            Members:
          </h2>
          <p class="text-gray-800 dark:text-gray-200 mb-1" v-for="member in school.get('members')">{{ member }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
