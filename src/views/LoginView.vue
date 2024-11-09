<script setup lang="ts">
import { auth } from "../firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "vue-router";

const router = useRouter();

onAuthStateChanged(auth, currentUser => {
   if (currentUser) {
       router.push("/account");
   }                   
});                      

const provider = new GoogleAuthProvider();

async function signInWithGoogle() {
  // TODO: surface errors to user
  await signInWithPopup(auth, provider);
}
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
          Sign in to your account
        </h1>
        <form class="space-y-4 md:space-y-6" action="#">
          <button type="button" class="text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center me-2 mb-2 dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800 inline-flex items-center gap-1 group mx-auto" @click="signInWithGoogle">
            <svg class="w-4 h-4 me-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24">
              <path xmlns="http://www.w3.org/2000/svg" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" class="group-hover:fill-white" fill="#4285F4"/>
              <path xmlns="http://www.w3.org/2000/svg" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" class="group-hover:fill-white" />
              <path xmlns="http://www.w3.org/2000/svg" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" class="group-hover:fill-white" fill="#FBBC05"/>
              <path xmlns="http://www.w3.org/2000/svg" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"  class="group-hover:fill-white" fill="#EA4335"/>
              <path xmlns="http://www.w3.org/2000/svg" d="M1 1h22v22H1z" fill="none"/>
            </svg>
            Sign in with Google
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
