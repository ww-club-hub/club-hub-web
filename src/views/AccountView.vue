<script setup lang="ts">
import { auth } from "../firebase";
import { onAuthStateChanged, type User, deleteUser } from "firebase/auth";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const user = ref<User | null>(null);

onAuthStateChanged(auth, currentUser => {
  if (currentUser) {
    user.value = currentUser;
    console.log(user);
  } else {
    router.push("/login");
  }
});

async function deleteAccount() {
  // TODO: Re-authenticate
  if (user.value)
    await deleteUser(user.value);
}
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-900 grow">
    <div class="max-w-screen-2xl mx-auto p-4">
      <div class="flex items-center gap-3 pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <template v-if="user?.photoURL">
          <img :src="user.photoURL" class="align-self-stretch" />
        </template>
        <h1 class="text-2xl text-black dark:text-white font-semibold">Welcome, {{ user?.displayName }}</h1>
      </div>

      <p class="text-black dark:text-white mb-2"><strong class="font-bold">Email: </strong> {{ user?.email }}</p>
      
      <p class="text-black dark:text-white mb-3"><strong class="font-bold">Account created: </strong> {{ new Date(Date.parse(user?.metadata.creationTime!)).toLocaleString() }}</p>
      
      <button type="button" class="focus:outline-none text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" @click="deleteAccount">Delete account</button>
    </div>
  </section>
</template>
