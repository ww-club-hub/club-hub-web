<script setup lang="ts">
import { OfficerPermission, type Club, type ClubRole, type ClubUpdate } from '@/schema';
import { onMounted } from 'vue';
import { ref } from 'vue';
import { collection, doc, orderBy, setDoc, Timestamp, query, type DocumentReference, deleteDoc } from "@firebase/firestore";
import { db, auth } from "@/firebase";
import FormInput from '@/components/form/FormInput.vue';
import { computed } from 'vue';
import { typedGetDocs, type DocWithId } from '@/utils';

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference
}>();

const canCreateUpdate = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Messages));

const updates = ref<DocWithId<ClubUpdate>[]>([]);

const updateTitle = ref("");
const updateDescription = ref("");
const updateLinks = ref<[string, string][]>([]);

const messagesCollection = collection(props.clubDoc, "messages");

onMounted(async () => {
  updates.value = await typedGetDocs(query(messagesCollection, orderBy("timestamp", "desc")));
})

const showModal = ref(false);

async function createUpdate() {
  
  if (!auth.currentUser) return;
  const update: ClubUpdate = {
    title: updateTitle.value,
    description: updateDescription.value,
    links: Object.fromEntries(updateLinks.value),
    creator: auth.currentUser.email!,
    timestamp: Timestamp.now()
  };

  const ref = doc(messagesCollection);
  await setDoc(ref, update);
  updates.value.unshift({
    id: ref.id,
    ...update
  });

  showModal.value = false;
}

async function deleteUpdate(id: string) {
  const ref = doc(messagesCollection, id);
  await deleteDoc(ref);
  updates.value = updates.value.filter(m => m.id != id);
}
</script>

<template>
  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
    Updates:
  </h2>
  <button v-if="canCreateUpdate" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Create update</button>
  
  <div v-if="updates.length > 0" class="flex gap-3 flex-row flex-wrap">
    <div v-for="update in updates" :key="update.id" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex flex-col relative">
      <!-- Delete button in upper right -->
      <button
        v-if="canCreateUpdate"
        type="button"
        class="absolute top-3 right-3 text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 transition-colors"
        @click="deleteUpdate(update.id)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
          <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
        </svg>
      </button>
      
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ update.title }}</h3>
      <p class="mb-3 font-normal text-gray-700 dark:text-gray-400">{{ update.description }}</p>
      
      <div class="mb-3 flex gap-2 flex-wrap">
        <a v-for="text, link, i in update.links" :key="i" :href="link" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" target="_blank">{{ text }}</a>
      </div>
      
      <!-- date -->
      <p class="text-sm uppercase font-normal text-gray-600 dark:text-gray-500 mt-auto">{{ update.timestamp.toDate().toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" }) }}</p>
    </div>
  </div>
  <p v-else class="italic text-black dark:text-white">No updates yet...</p>

  <dialog :open="showModal" tabindex="-1" aria-hidden="true" class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-300/75 dark:bg-gray-900/75">
    <div class="relative p-4 w-full max-w-2xl max-h-full left-1/2 top-1/2 -translate-1/2">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg dark:bg-gray-700 shadow-lg">
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
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b" @submit.prevent="createUpdate">
          <FormInput label="Title:" type="text" required v-model="updateTitle" />
          <FormInput label="Description:" type="text" required v-model="updateDescription" />

          <div class="mb-3 flex items-center justify-between">
            <h3 class="text-black dark:text-white font-bold text-lg">Links:</h3>


            <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="updateLinks.push(['', ''])">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              
              <span class="sr-only">Add link</span>
            </button>
          </div>

          <div class="divide-y divide-gray-300 dark:divide-gray-700">
            <div v-for="link, i in updateLinks" :key="i" class="flex gap-3 pb-3 mt-3 items-center">
              <FormInput label="Link title" type="text" required v-model="link[1]" />
              <FormInput label="Link URL" type="url" required v-model="link[0]" />

              <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="updateLinks.splice(i, 1)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
              
                <span class="sr-only">Remove link</span>
              </button>
            </div>
          </div>

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>
</template>
