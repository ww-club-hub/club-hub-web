<script setup lang="ts">
import { ref } from "vue";
import { auth } from "../firebase";
import { EmailAuthProvider, OAuthCredential, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import AuthForm from "@/components/AuthForm.vue";
import type { FirebaseError } from "firebase/app";

const showModal = ref(false);
const errorMessage = ref("");

async function deleteAccount() {
  if (auth.currentUser)
    await deleteUser(auth.currentUser);
}

async function reauthCred(cred: OAuthCredential) {
  if (!auth.currentUser) return;
  try {
    await reauthenticateWithCredential(auth.currentUser, cred);
    
    await deleteAccount();
  } catch (e) {
    if ((e as FirebaseError).code === "auth/wrong-password") {
      errorMessage.value = "Invalid password";
    } else {
      errorMessage.value = (e as Error).message;
    }
  }
}

async function reauthPassword(password: string) {
  if (!auth.currentUser) return;
  const cred = EmailAuthProvider.credential(auth.currentUser.email!, password);
  try {
    await reauthenticateWithCredential(auth.currentUser, cred);
    errorMessage.value = "";
    await deleteAccount();
  } catch (e) {
    if ((e as FirebaseError).code === "auth/wrong-password") {
      errorMessage.value = "Invalid password";
    } else {
      errorMessage.value = (e as Error).message;
    }
  }
 
}
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-800 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
      <div class="flex items-center gap-3 pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <template v-if="auth.currentUser?.photoURL">
          <img :src="auth.currentUser.photoURL" class="align-self-stretch" />
        </template>
        <h1 class="text-2xl text-black dark:text-white font-semibold">Welcome, {{ auth.currentUser?.displayName }}</h1>
      </div>

      <p class="text-black dark:text-white mb-2"><strong class="font-bold">Email: </strong> {{ auth.currentUser?.email }}</p>
      
      <p class="text-black dark:text-white mb-3"><strong class="font-bold">Account created: </strong> {{ new Date(Date.parse(auth.currentUser?.metadata.creationTime!)).toLocaleString() }}</p>
      
      <button type="button" class="focus:outline-hidden text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" @click="showModal = true">Delete account</button>
    </div>
  </section>

  <!-- reauth modal -->
  <dialog :open="showModal" tabindex="-1" aria-hidden="true" class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-300/50 dark:bg-gray-700/50">
    <div class="relative p-4 w-full max-w-2xl max-h-full left-1/2 top-1/2 -translate-1/2">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
        <!-- Modal header -->
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Reauthenticate in order to delete your account
          </h3>
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="showModal = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <div class="p-4 md:p-5 space-y-4">
          <AuthForm mode="reauth" @login-cred="reauthCred" @reauth-password="reauthPassword" :error="errorMessage" />
        </div>
      </div>
    </div>
  </dialog>
</template>
