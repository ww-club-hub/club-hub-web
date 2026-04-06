<template>
  <div class="md:grid grid-cols-3 gap-4">
    <!-- Left Section: Email Groups -->
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Email groups:</h2>
      <!-- Placeholder for future content -->
      <p class="italic text-black dark:text-white">No email groups yet...</p>
    </div>

    <!-- Middle Section: Automatic Reminders -->
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Automatic reminders:</h2>
      <!-- Placeholder for future content -->
      <p class="italic text-black dark:text-white">No reminders configured...</p>
    </div>

    <!-- Right Section: Other Tools -->
    <div>
      <h2 class="text-lg tracking-tight uppercase font-semibold text-gray-800 dark:text-gray-100 mb-2">Other tools:</h2>
      <button
        class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block mb-2"
        
      >
        Send custom email
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { db } from '@/firebase';
import { type ClubPrivate, OfficerPermission, type Club, type ClubEmailList, type ClubRole } from '@/schema';
import { typedGetDoc, typedGetDocs, type DocWithId } from '@/utils';
import { collection, type DocumentReference } from 'firebase/firestore';
import { computed, ref } from 'vue';

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubDoc: DocumentReference,
  clubPrivateDoc: DocumentReference
}>();

const canModifyEmails = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Messages));

const emailListsCollection = collection(props.clubDoc, "emails");
const emailLists = ref<DocWithId<ClubEmailList>[]>(await typedGetDocs(emailListsCollection));
const clubPrivate = await typedGetDoc<ClubPrivate>(props.clubPrivateDoc);
</script>
