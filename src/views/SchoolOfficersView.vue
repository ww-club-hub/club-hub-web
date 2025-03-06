<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useRouter } from "vue-router";
import { api, isTRPCClientError } from "@/api";
import FormInput from "@/components/FormInput.vue";
import { ref } from "vue";
import { onMounted } from "vue";

const { claims } = await getIdTokenResult(auth.currentUser!);
const isOwner = claims.role === "owner";
const stuco = isOwner || claims.role === "admin";

const owner = ref<{ email: string; displayName: string; photoUrl: string } | null>(null);
const admins = ref<{ email: string; displayName: string; photoUrl: string }[]>([]);

const router = useRouter();

onMounted(async () => {
  if (!stuco) {
    router.push({ name: 'school-detail' });
  }
  
  const school = await getDoc(doc(db, "schools", claims.school as string));
  
  // TODO: batch profile requests
  owner.value = {
    ...await api.user.profile.query({ email: school.get("owner") }),
    email: school.get("owner")
  };
  admins.value = await Promise.all(school.get("admins").map(async (email: string) => ({
    email,
    ...await api.user.profile.query({ email })
  })));
});

const adminEmail = ref("");
const errorMessage = ref("");

async function addAdmin() {
  if (!adminEmail.value) return;
  
  if (owner.value?.email === adminEmail.value || admins.value.some(v => v.email === adminEmail.value)) {
    errorMessage.value = "This user is already an admin of this school";
    return;
  }
  
  try {
    const newAdmin = await api.user.profile.query({ email: adminEmail.value });
    await api.school.admin.add.query({ adminEmail: adminEmail.value });

    admins.value.push({
      email: adminEmail.value,
      displayName: newAdmin.displayName,
      photoUrl: newAdmin.photoUrl
    });

    adminEmail.value = "";
    
    errorMessage.value = "";
  } catch (e) {
    if (isTRPCClientError(e)) {
      if (e.data?.code === "NOT_FOUND") {
        errorMessage.value = "A user with this email address does not exist";
      } else {
        errorMessage.value = e.message;
      }
    }
  }
}

async function removeAdmin(i: number) {
  if (i < 0 || i >= admins.value.length) return;

  await api
}
</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">School Admins:</h1>
      </div>

      <!-- owner -->
      <h2 class="text-lg text-black dark:text-white font-semibold mb-2">Owner:</h2>

      <div class="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-sm grow flex items-center gap-3 mb-3" v-if="owner">
        <img :src="owner.photoUrl ?? '/icons/icon.svg'" alt="user photo" class="w-6 h-6" />
        <div class="flex flex-col gap-1">
          <span class="text-black dark:text-white">{{ owner.displayName }}</span>
          <span class="font-sm text-gray-700 dark:text-gray-300">{{ owner.email }}</span>
        </div>
      </div>

      <h2 class="text-lg text-black dark:text-white font-semibold mb-2">Admins:</h2>

      <div class="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-sm grow flex items-center gap-3 mb-2" v-for="admin, i in admins" :key="admin.email">
        <img :src="admin.photoUrl ?? '/icons/icon.svg'" alt="user photo" class="w-6 h-6" />
        <div class="flex flex-col gap-1">
          <span class="text-black dark:text-white">{{ admin.displayName }}</span>
          <span class="font-sm text-gray-700 dark:text-gray-300">{{ admin.email }}</span>

          <button type="button" @click="removeAdmin(i)" v-if="owner">
            <span class="sr-only">Remove admin</span>
          </button>
          
          <button type="button" @click="promoteAdmin(i)" v-if="owner">
            <span class="sr-only">Make owner</span>
          </button>
        </div>
      </div>

      <form @submit.prevent="addAdmin" class="flex items-end gap-3 max-w-screen-sm" v-if="owner">
        <FormInput type="email" v-model="adminEmail" label="New admin email" class="grow" label-style="placeholder" required />
        
        <button type="submit" class="flex items-center justify-center text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-4 py-3 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800">
          <svg class="h-3.5 w-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path clip-rule="evenodd" fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
          </svg>
          Add new admin
        </button>
      </form>

      <p class="text-red-500 mt-2" v-if="errorMessage">{{ errorMessage }}</p>
    </div>

    <button type="button" class="focus:outline-hidden text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-5 py-2.5 me-2 mb-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900" @click="showModal = true">Delete school</button>
  </section>
</template>
