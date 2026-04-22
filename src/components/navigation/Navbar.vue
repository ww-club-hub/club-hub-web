<script setup lang="ts">
import NavbarLink from "./NavbarLink.vue";
import { auth } from "@/firebase";
import { signOut } from "firebase/auth";
import { ref, onMounted, onUnmounted, computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/stores/auth";
import { getClaims, type UserClaims } from "@/utils";

const authStore = useAuthStore();
const navbarExpanded = ref(false);
const route = useRoute();
const accountMenuExpanded = ref(false);

const showPersonalEmailBanner = computed(() => {
  return authStore.user && !authStore.claims?.personalEmail;
});

async function logOut() {
  await signOut(auth);
}

function hideMenus() {
  accountMenuExpanded.value = false;
  navbarExpanded.value = false;
}

onMounted(async () => {
  document.body.addEventListener("click", hideMenus);
});

onUnmounted(() => {
  document.body.removeEventListener("click", hideMenus);
});
</script>

<template>
  <nav class="bg-white border-gray-200 dark:bg-gray-900 border-b dark:border-gray-700">
    <div class="max-w-screen-2xl flex flex-wrap items-center mx-auto p-4 relative" @click.stop>
      <router-link to="/" class="flex items-center space-x-3 rtl:space-x-reverse">
        <img src="/icons/icon.svg" class="h-8" alt="Club Hub Logo" />
        <span class="self-center text-2xl font-semibold whitespace-nowrap dark:text-white">Club Hub</span>
      </router-link>
      <button data-collapse-toggle="navbar-default" type="button"
        class="inline-flex items-center p-2 w-10 h-10 justify-center text-sm text-gray-500 rounded-lg md:hidden hover:bg-gray-100 focus:outline-hidden focus:ring-2 focus:ring-gray-200 dark:text-gray-400 dark:hover:bg-gray-700 dark:focus:ring-gray-600 ms-auto"
        aria-controls="navbar-default" aria-expanded="false" @click="navbarExpanded = !navbarExpanded">
        <span class="sr-only">Open main menu</span>
        <svg class="w-5 h-5" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 17 14">
          <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M1 1h15M1 7h15M1 13h15" />
        </svg>
      </button>
      <button type="button" class="flex text-sm md:order-2 ms-3 md:ms-6 bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600" id="user-menu-button" aria-expanded="false" v-if="!!authStore.user" @click="accountMenuExpanded = !accountMenuExpanded">
        <span class="sr-only">Open user menu</span>
        <img class="w-8 h-8 rounded-full" :src="authStore.user?.photoURL ?? '/icons/icon.svg'" alt="user photo">
      </button>
      <div :class="{ 'hidden': !navbarExpanded }" class="md:ms-auto me-0 w-full md:block md:w-auto" id="navbar-default">
        <ul
          class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
          <NavbarLink url="/" name="Home" :active="route.name === 'home'" />
          <NavbarLink url="/clubs/" name="Explore Clubs" :active="route.name === 'club-list'" />
          <NavbarLink url="/dashboard/" name="Dashboard" v-if="authStore.user" :active="route.name === 'dash'" />
          <NavbarLink url="/login/" name="Log In" v-if="!authStore.user" :active="route.name === 'login'" />
        </ul>
      </div>
      <div :class="{ 'hidden': !accountMenuExpanded }" class="z-50 my-4 w-56 text-base list-none bg-white rounded-sm divide-y divide-gray-100 shadow-sm dark:bg-gray-700 dark:divide-gray-600 absolute right-0 top-12" v-if="authStore.user">
        <div class="py-3 px-4">
          <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ authStore.user.displayName  }}</span>
          <span class="block text-sm text-gray-500 truncate dark:text-gray-400">{{ authStore.user.email }}</span>
        </div>
        <ul class="py-1 text-gray-500 dark:text-gray-400" aria-labelledby="dropdown">
          <li>
            <router-link to="/school" class="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-white">Your School</router-link>
          </li>
          <li>
            <router-link to="/dashboard" class="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-white">Dashboard</router-link>
          </li>
          <li>
            <router-link to="/account" class="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:text-gray-400 dark:hover:text-white">Account settings</router-link>
          </li>
        </ul>
        <ul class="py-1 text-gray-500 dark:text-gray-400" aria-labelledby="dropdown">
          <li>
            <button type="button" class="block py-2 px-4 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white w-full" @click="logOut()">Sign out</button>
          </li>
        </ul>
      </div>
    </div>
    <!-- Personal Email Prompt Banner -->
    <div v-if="showPersonalEmailBanner" class="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
      <div class="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 text-amber-800 dark:text-amber-300">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
            <path d="M3.505 2.365A41.369 41.369 0 0 1 9 2c1.863 0 3.697.124 5.495.365 1.247.167 2.18 1.108 2.435 2.268a4.45 4.45 0 0 0-.577-.069 43.141 43.141 0 0 0-4.706 0C9.229 4.696 7.5 6.727 7.5 8.998v2.24c0 1.413.67 2.735 1.76 3.562l-2.98 2.98A.75.75 0 0 1 5 17.25v-3.443c-.501-.048-1-.106-1.495-.172C2.033 13.438 1 12.162 1 10.72V5.28c0-1.441 1.033-2.717 2.505-2.914Z" />
            <path d="M14 6c-.762 0-1.52.02-2.271.062C10.157 6.148 9 7.472 9 8.998v2.24c0 1.519 1.147 2.839 2.71 2.935.214.013.428.024.642.034.2.009.385.09.518.224l2.35 2.35a.75.75 0 0 0 1.28-.531v-2.07c1.453-.195 2.5-1.463 2.5-2.915V8.998c0-1.526-1.157-2.85-2.729-2.936A41.645 41.645 0 0 0 14 6Z" />
          </svg>

          <p class="text-sm">
            Please add your personal email to your account for better communication with clubs.
          </p>
        </div>
        <router-link to="/account" class="shrink-0 inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700 rounded-md">
          Add Email
        </router-link>
      </div>
    </div>
  </nav>
</template>
