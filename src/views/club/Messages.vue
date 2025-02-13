<script setup lang="ts">
import type { Club, ClubRole, ClubUpdate } from '@/schema';
import { onMounted } from 'vue';
import { ref } from 'vue';
import { getDocs, collection, doc, setDoc } from "@firebase/firestore";
import { db, auth } from "@/firebase";
import FormInput from '@/components/FormInput.vue';

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

const updates = ref<(ClubUpdate & { id: string })[]>([]);

const updateTitle = ref("");
const updateDescription = ref("");
const updateLinks = ref<[string, string][]>([]);

const messagesCollection = collection(db, "schools", props.school, "clubs", props.club.id, "messages");

onMounted(async () => {
  const docs = await getDocs(messagesCollection);
  updates.value = docs.docs.map(el => ({
      id: el.id,
      ...el.data()
  } as ClubUpdate & { id: string }));
})

const showModal = ref(false);

async function createUpdate() {
  
  if (!auth.currentUser) return;
  const update: ClubUpdate = {
    title: updateTitle.value,
    description: updateDescription.value,
    links: Object.fromEntries(updateLinks.value),
    creator: auth.currentUser.email!,
    timestamp: new Date()
  };

  const ref = doc(messagesCollection);
  await setDoc(ref, update);
  updates.value.push({
    id: ref.id,
    ...update
  });

  showModal.value = false;
}
</script>

<template>
  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
    Updates:
  </h2>
  <button type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Create update</button>
  
  <div v-if="updates.length > 0" class="flex gap-3 flex-row flex-wrap md:block md:columns-3">
    <div v-for="update, i in updates" :key="i" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700">
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ update.title }}</h3>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ update.description }}</p>
      
      <div class="mb-3 flex gap-2 flex-wrap">
        <a v-for="text, link, i in update.links" :key="i" :href="link" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" target="_blank">{{ text }}</a>
      </div>
      
      <!-- date -->
      <p class="text-sm uppercase font-normal text-gray-600 dark:text-gray-500">{{ update.timestamp.toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) }}</p>
    </div>
  </div>
  <p v-else class="italic text-black dark:text-white">No updates yet...</p>

  <dialog :open="showModal" tabindex="-1" aria-hidden="true" class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-300/50 dark:bg-gray-700/50">
    <div class="relative p-4 w-full max-w-2xl max-h-full left-1/2 top-1/2 -translate-1/2">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg shadow-sm dark:bg-gray-700">
        <!-- Modal header -->
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Create update
          </h3>
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="showModal = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800" @submit.prevent="createUpdate">
          <FormInput label="Title" type="text" required v-model="updateTitle" />
          <FormInput label="Description" type="text" required v-model="updateDescription" />

          <div class="divide-y divide-gray-300 dark:divide-gray-700">
            <div v-for="link in updateLinks" class="flex gap-3 pb-3 mt-3">
              <FormInput label="Link title" type="text" required v-model="link[1]" />
              <FormInput label="Link URL" type="url" required v-model="link[0]" />
            </div>
          </div>

          <button type="button" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="updateLinks.push(['', ''])">Add link</button>

          <button type="button" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="updateLinks.pop()">Remove link</button>

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
