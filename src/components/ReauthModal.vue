<script setup lang="ts">
import { EmailAuthProvider, OAuthCredential, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { ref } from 'vue';
import { auth } from "@/firebase";
import type { FirebaseError } from "firebase/app";

const showModal = ref(false);
const errorMessage = ref("");

const emit = defineEmits<{
  reauthSuccess: [],
}>();

async function reauthCred(cred: OAuthCredential) {
  if (!auth.currentUser) return;
  try {
    await reauthenticateWithCredential(auth.currentUser, cred);
    
    emit("reauthSuccess");
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
    emit("reauthSuccess");
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
          <!-- TODO: only show auth methods that apply to this user (will require changing AuthForm -->
          <AuthForm mode="reauth" @login-cred="reauthCred" @reauth-password="reauthPassword" :error="errorMessage" />
        </div>
      </div>
    </div>
  </dialog>
</template>
