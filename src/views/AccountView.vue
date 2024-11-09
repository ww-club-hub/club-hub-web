<script setup lang="ts">
import { auth } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useRouter } from "vue-router";

const router = useRouter();

let user: User | null = null;

onAuthStateChanged(auth, currentUser => {
  if (currentUser) {
    user = currentUser;
  } else {
    router.push("/login");
  }
});
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-900 grow px-6 py-8 lg:py-0">
    <div class="flex items-center gap-3 pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
      <template v-if="user?.photoURL">
        <img :src="user.photoURL" class="align-self-stretch" />
      </template>
      <h1 class="text-2xl text-black dark:text-white font-semibold">Welcome, {{ user?.displayName }}</h1>
    </div>

    <button type="button" class="bg-red-500 text-white p-3 rounded">
      Delete account
    </button>
  </section>
</template>
