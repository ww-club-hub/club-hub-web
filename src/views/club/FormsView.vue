<script setup lang="ts">
import { OfficerPermission, type Club, type ClubForm, type ClubRole, type ClubUpdate } from '@/schema';
import { onMounted, ref, computed, type Ref, watch } from 'vue';
import { collection } from "@firebase/firestore";
import { db, auth } from "@/firebase";
import FormInput from '@/components/FormInput.vue';
import { typedGetDocs, type DocWithId, injectScript } from '@/utils';
import "@googleworkspace/drive-picker-element";
import { FORMS_CLIENT_ID, API_KEY, DRIVE_APP_ID } from "@/google-drive";

const FORM_MIME_TYPE = "application/vnd.google-apps.form";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

const canCreateUpdate = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Forms));

const formsCollection = collection(db, "schools", props.school, "clubs", props.club.id, "forms");

const forms: Ref<(DocWithId<ClubForm>)[]> = ref([]);

let googleAuthClient: google.accounts.oauth2.CodeClient | null = null;

onMounted(async () => {
  if (!window.google?.accounts?.oauth2)
    await injectScript("https://accounts.google.com/gsi/client");

  googleAuthClient = google.accounts.oauth2.initCodeClient({
    client_id: FORMS_CLIENT_ID,
    ux_mode: "popup",
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: response => {
      console.log(response.code);
    },
    error_callback: e => {
      errorMessage.value = e.message;
    },
    login_hint: auth.currentUser?.email ?? undefined
  });

  forms.value = await typedGetDocs(formsCollection);
})

const showModal = ref(false);
const showPicker = ref(false);
const errorMessage = ref("");

watch(showModal, v => {
  if (!v) showPicker.value = false;
});

async function handleFilePicked(event: CustomEvent<google.picker.ResponseObject>) {
  //showModal.value = false;
  errorMessage.value = "";

  if (event.detail.action === "picked" && event.detail.docs) {
    const form = event.detail.docs.find(d => d.mimeType === FORM_MIME_TYPE);
    if (!form) return;

    console.log(form);
  }
}

async function handlePickerError(event: CustomEvent<unknown>) {
  errorMessage.value = String(event.detail);
}
</script>

<template>
  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
    Forms:
  </h2>
  <button v-if="canCreateUpdate" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="showModal = true">Add form</button>

  <div v-if="forms.length > 0" class="flex gap-3 flex-row flex-wrap">
    <div v-for="form in forms" :key="form.id" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex flex-col">
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ form.description }}</h3>
    </div>
  </div>
  <p v-else class="italic text-black dark:text-white">No forms configured yet...</p>

  <drive-picker
    :client-id="FORMS_CLIENT_ID"
    :app-id="DRIVE_APP_ID"
    :developer-key="API_KEY"
    @picker:picked="handleFilePicked"
    @picker:canceled="showModal = false"
    @picker:error="handlePickerError"
    v-if="showPicker"
  >
    <drive-picker-docs-view mime-types="application/vnd.google-apps.form"></drive-picker-docs-view>
  </drive-picker>

  <dialog :open="showModal" tabindex="-1" aria-hidden="true" class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 justify-center items-center w-full md:inset-0 h-[calc(100%-1rem)] max-h-full bg-gray-300/75 dark:bg-gray-900/75">
    <div class="relative p-4 w-full max-w-2xl max-h-full left-1/2 top-1/2 -translate-1/2">
      <!-- Modal content -->
      <div class="relative bg-white rounded-lg dark:bg-gray-700 shadow-lg">
        <!-- Modal header -->
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
            Set up a Google Form
          </h3>
          <button type="button" class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white" @click="showModal = false">
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <!-- Modal body -->
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b">
          <button
            type="button" @click="googleAuthClient?.requestCode()"
            class="text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:outline-hidden focus:ring-emerald-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800 block"
          >
            Authorize Google Account
          </button>

          <button
            type="button" @click="showPicker = true"
            class="text-white bg-emerald-600 hover:bg-emerald-700 focus:ring-4 focus:outline-hidden focus:ring-emerald-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-emerald-600 dark:hover:bg-emerald-700 dark:focus:ring-emerald-800 block"
          >Select form</button>

          <p v-if="errorMessage" class="mb-3 text-rose-500 italic">{{ errorMessage }}</p>

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>

</template>
