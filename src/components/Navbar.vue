<script setup lang="ts">
import NavbarLink from "./NavbarLink.vue";
import { auth } from "../firebase";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { ref, onMounted, onUnmounted } from "vue";
import { useRoute } from "vue-router";

const currentUser = ref<User | null>(null);
const navbarExpanded = ref(false);
const route = useRoute();
const accountMenuExpanded = ref(false);

onAuthStateChanged(auth, user => {
  currentUser.value = user;
});

async function logOut() {
  await signOut(auth);
}

function hideMenus() {
  accountMenuExpanded.value = false;
  navbarExpanded.value = false;
}

onMounted(() => {
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
      <button type="button" class="flex text-sm md:order-2 ms-3 md:ms-6 bg-gray-800 rounded-full focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600" id="user-menu-button" aria-expanded="false" v-if="!!currentUser" @click="accountMenuExpanded = !accountMenuExpanded">
        <span class="sr-only">Open user menu</span>
        <img class="w-8 h-8 rounded-full" :src="currentUser?.photoURL ?? '/icons/icon.svg'" alt="user photo">
      </button>
      <div :class="{ 'hidden': !navbarExpanded }" class="md:ms-auto me-0 w-full md:block md:w-auto" id="navbar-default">
        <ul
          class="font-medium flex flex-col p-4 md:p-0 mt-4 border border-gray-100 rounded-lg bg-gray-50 md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-white dark:bg-gray-800 md:dark:bg-gray-900 dark:border-gray-700">
          <NavbarLink url="/" name="Home" :active="route.name === 'home'" />
          <NavbarLink url="/clubs/" name="Explore Clubs" :active="route.name === 'club-list'" />
          <NavbarLink url="/dashboard/" name="Dashboard" v-if="currentUser" :active="route.name === 'dash'" />
          <NavbarLink url="/login/" name="Log In" v-if="!currentUser" :active="route.name === 'login'" />
        </ul>
      </div>
      <div :class="{ 'hidden': !accountMenuExpanded }" class="z-50 my-4 w-56 text-base list-none bg-white rounded-sm divide-y divide-gray-100 shadow-sm dark:bg-gray-700 dark:divide-gray-600 absolute right-0 top-12" v-if="currentUser">
        <div class="py-3 px-4">
          <span class="block text-sm font-semibold text-gray-900 dark:text-white">{{ currentUser.displayName  }}</span>
          <span class="block text-sm text-gray-500 truncate dark:text-gray-400">{{ currentUser.email }}</span>
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
  </nav>
</template>
