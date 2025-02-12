<script setup lang="ts">
import { ref } from "vue";
import { auth } from "../firebase";
import { signInWithCredential, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, OAuthCredential } from "firebase/auth";
import type { FirebaseError } from "firebase/app";
import AuthForm from "@/components/AuthForm.vue";

const createAccount = ref(false);
const errorMessage = ref("");

async function loginPassword(email: string, password: string) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    errorMessage.value = "";
  } catch (e) {
    if ((e as FirebaseError).code === "auth/user-not-found") {
      errorMessage.value = "A user with that email address does not exist";
    } else if ((e as FirebaseError).code === "auth/wrong-password") {
      errorMessage.value = "Invalid password";
    } else {
      errorMessage.value = (e as Error).message;
    }
  }
}

async function signupPassword(name: string, email: string, password: string) {
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    // set display name
    await updateProfile(user, {
      displayName: name
    });
    errorMessage.value = "";
  } catch (e) {
    if ((e as FirebaseError).code === "auth/email-already-in-use") {
      errorMessage.value = "That email is already in use";
    } else if ((e as FirebaseError).code === "auth/weak-password") {
      errorMessage.value = "Password should be at least 6 characters";
    } else {
      errorMessage.value = (e as Error).message;
    }
  }
}

async function loginCred(cred: OAuthCredential) {
  try {
      await signInWithCredential(auth, cred);
  } catch (e) {
    errorMessage.value = (e as Error).message;
  }
}
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-900 grow flex flex-col items-center justify-center px-6 py-8 lg:py-4">
    <h1 class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
      {{ createAccount ? "Create account" : "Sign in to your account" }}:
    </h1>
    <div class="w-full bg-white rounded-lg shadow-sm dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
      <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
        <AuthForm v-model:error="errorMessage" :mode="createAccount ? 'signup' : 'login'" @login-cred="loginCred" @login-password="loginPassword" @signup-password="signupPassword" />

        <!-- create account/login switch prompt -->
        <p class="text-sm font-light text-gray-500 dark:text-gray-400 mt-3" v-if="createAccount">
          Already have an account? <button class="font-medium text-orange-600 hover:underline dark:text-orange-500" type="button" @click="createAccount = false">Log in</button>
        </p>
        <p class="text-sm font-light text-gray-500 dark:text-gray-400 mt-3" v-else>
          Don’t have an account yet? <button class="font-medium text-orange-600 hover:underline dark:text-orange-500" type="button" @click="createAccount = true">Sign up</button>
        </p>
      </div>
    </div>
  </section>
</template>
