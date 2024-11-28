<script setup lang="ts">
import { auth } from "../firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const user = ref<User | null>(null);

onAuthStateChanged(auth, currentUser => {
  if (currentUser) {
    user.value = currentUser;
  } else {
    router.push("/login");
  }
});
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-900 grow flex flex-col items-center justify-center px-6 py-8 lg:py-0">
    <a href="#" class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
      <img class="h-8 mr-2" src="/icon.png" alt="logo">
      Club Hub
    </a>
    <div class="w-full bg-white rounded-lg shadow dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
      <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
        <h1 class="text-xl font-bold leading-tight tracking-tight text-gray-900 md:text-2xl dark:text-white">
          Create a School
        </h1>
        <form class="space-y-4 md:space-y-6" action="#">
          
        </form>
      </div>
    </div>
</section>
</template>
