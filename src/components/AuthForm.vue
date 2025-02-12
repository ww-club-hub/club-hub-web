<script setup lang="ts">
import { GoogleAuthProvider, OAuthCredential } from 'firebase/auth';
import { ref } from 'vue';
import type { CredentialResponse } from 'vue3-google-signin';

const isDev = import.meta.env.DEV;

const props = defineProps<{
  mode: 'signup' | 'login' | 'reauth'
}>();

const emit = defineEmits<{
  loginCred: [cred: OAuthCredential],
  loginPassword: [email: string, password: string],
  signupPassword: [name: string, email: string, password: string],
  reauthPassword: [password: string],
  authGoogleManual: [],
}>();

const name = ref("");
const email = ref("");
const password = ref("");

const error = defineModel("error");

const buttonText: Record<typeof props["mode"], string> = {
  'signup': "Sign up",
  'login': "Log in",
  'reauth': "Reauthenticate"
};

async function signIn() {
  if (props.mode === "signup") {
    emit("signupPassword", name.value, email.value, password.value);
  } else if (props.mode === "login") {
    emit("loginPassword", email.value, password.value);
  } else if (props.mode === "reauth") {
    emit("reauthPassword", password.value);
  }
}

async function handleGoogleError() {
  error.value = "Failed to sign in with Google";
}

async function handleGoogleSuccess({ credential }: CredentialResponse) {
  error.value = "";
  const googleCredential = GoogleAuthProvider.credential(credential, null);
  emit("loginCred", googleCredential);
}
</script>

<template>
  <form class="space-y-4 md:space-y-6" @submit.prevent="signIn">
    <!-- email/password -->
    <div v-if="mode === 'signup'">
      <label for="input-name" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Name:</label>
      <input type="text" v-model="name" id="input-name" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
    </div>
    
    <div v-if="mode !== 'reauth'">
      <label for="input-email" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Email:</label>
      <input type="email" v-model="email" id="input-email" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
    </div>
    
    <div>
      <label for="input-password" class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">Password:</label>
      <input type="password" v-model="password" id="input-password" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500" required />
    </div>
    
    <p v-if="error" class="mb-2 text-rose-600 dark:text-rose-400 italic">{{ error }}</p>
    
    <button type="submit" class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">{{ buttonText[mode] }}</button>
    
    <div class="mx-auto flex justify-center">
      <!-- google -->
      <GoogleSignInButton
        @success="handleGoogleSuccess"
        @error="handleGoogleError"
      ></GoogleSignInButton>

      <button v-if="isDev" class="bg-black text-white p-3 rounded" @click="emit('authGoogleManual')" type="button">
        DEV: Emulator Google
      </button>
    </div>
  </form>
</template>
