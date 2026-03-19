<script setup lang="ts">
import { OfficerPermission, type Club, type ClubForm, type ClubRole } from '@/schema';
import { ref, computed, watch } from 'vue';
import { doc, collection, Timestamp, setDoc } from "@firebase/firestore";
import { db, auth, GCP_PROJECT_ID } from "@/firebase";
import { typedGetDocs, type DocWithId } from '@/utils';
import "@googleworkspace/drive-picker-element";
import { FORMS_CLIENT_ID, API_KEY, DRIVE_APP_ID } from "@/google-drive";
import ButtonLoader from '@/components/ui/ButtonLoader.vue';
import DateTimeInput from '@/components/form/DateTimeInput.vue';
import { useGoogleAccountStore } from "@/stores/googleAccount";
import GoogleAuthorizationDialog from "@/components/auth/GoogleAuthorizationDialog.vue";

const FORM_MIME_TYPE = "application/vnd.google-apps.form";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

const scopes = ["openid", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/drive.file"];
const googleAccountStore = useGoogleAccountStore(props.club.id);

const canManageForms = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Forms));
const formsCollection = collection(db, "schools", props.school, "clubs", props.club.id, "forms");
const forms = ref<DocWithId<ClubForm>[]>(await typedGetDocs<ClubForm>(formsCollection));

const showModal = ref(false);
const showPicker = ref(false);
const errorMessage = ref("");
const pickedForm = ref<google.picker.DocumentObject | null>(null);
const dueDate = ref<Date | undefined>();
const loading = ref({
  addForm: false,
  authGoogle: false,
  revokeGoogle: false,
  pickForm: false
});

const showGoogleAuthDialog = ref(false);
const pendingFormAction = ref<null | (() => void)>(null);

watch(showModal, v => {
  if (!v) {
    showPicker.value = false;
    loading.value = {
      addForm: false,
      authGoogle: false,
      revokeGoogle: false,
      pickForm: false
    };
    pickedForm.value = null;
  }
});

async function handleFilePicked(event: CustomEvent<google.picker.ResponseObject>) {
  errorMessage.value = "";

  if (event.detail.action === "picked" && event.detail.docs) {
    const form = event.detail.docs.find(d => d.mimeType === FORM_MIME_TYPE);
    if (!form || form.mimeType !== FORM_MIME_TYPE) return;

    pickedForm.value = form;
  }

  closeFilePicker();
}

async function handlePickerError(event: CustomEvent<unknown>) {
  closeFilePicker();

  // Picker error
  errorMessage.value = `File picker error: ${String(event.detail)}`;
}

async function handleCreateFormClick() {
  loading.value.addForm = true;
  try {
    const needsAuth = await googleAccountStore.needsGoogleAuthorization(scopes);
    if (needsAuth) {
      showGoogleAuthDialog.value = true;
      pendingFormAction.value = () => {
        showModal.value = true;
      };
    } else {
      showModal.value = true;
    }
  } catch (e: any) {
    errorMessage.value = e?.message || "Failed to check Google authorization.";
  } finally {
    loading.value.addForm = false;
  }
  loading.value.addForm = false;
  errorMessage.value = "";
}

function onGoogleAuthAuthorized() {
  showGoogleAuthDialog.value = false;
  if (pendingFormAction.value) {
    pendingFormAction.value();
    pendingFormAction.value = null;
  }
}

function onGoogleAuthClosed() {
  showGoogleAuthDialog.value = false;
  pendingFormAction.value = null;
}
/**
 * show the Google Docs file picker
 */
function openFilePicker() {
  showPicker.value = true;
  loading.value.pickForm = true;
}

function closeFilePicker() {
  showPicker.value = false;
  loading.value.pickForm = false;
}

async function onAddFormSubmit() {
  if (!pickedForm.value || !googleAccountStore.accessToken.value || !auth.currentUser) {
    showModal.value = false;
    return;
  }

  // TODO: right now, it still works if two different users attempt to add the same form
  // disallow this

  // everything needed to identify this doc from just the watch id and form id
  const watchId = `${props.school}-${props.club.id}`;

  // delete existing watches (response doesn't matter)
  await fetch(`https://forms.googleapis.com/v1/forms/${pickedForm.value.id}/watches/${watchId}`, {
    headers: {
      Authorization: `Bearer ${googleAccountStore.accessToken.value}`
    },
    method: "DELETE"
  })

  // create new watch
  const response = await fetch(`https://forms.googleapis.com/v1/forms/${pickedForm.value.id}/watches`, {
    body: JSON.stringify({
      watch: {
        target: {
          topic: {
            topicName: `projects/${GCP_PROJECT_ID}/topics/FormResponses`
          }
        },
        // watch for responses
        eventType: "RESPONSES"
      },
      watchId
    }),
    headers: {
      Authorization: `Bearer ${googleAccountStore.accessToken}`
    },
    method: "POST"
  }).then(r => r.json()) as {
    error: { message: string; }
  } | {
    expireTime: string;
  };

  if ("error" in response) {
    // could be because of a weird preexisting watch
    errorMessage.value = `Could not connect form: ${response.error.message}`;
    return;
  }

  // update firebase
  const form: ClubForm = {
    formId: pickedForm.value.id,
    url: pickedForm.value.url!,
    name: pickedForm.value.name!,
    officerId: auth.currentUser.uid,
    watchExpiry: Timestamp.fromDate(new Date(Date.parse(response.expireTime))),
    dueDate: Timestamp.fromDate(dueDate.value!)
  };

  const formDoc = doc(formsCollection, pickedForm.value.id);
  await setDoc(formDoc, form);

  // remove any existing forms that have this id
  forms.value = forms.value.filter(f => f.formId !== form.formId);

  forms.value.push({
    ...form,
    id: formDoc.id
  });

  showModal.value = false;
}
</script>

<template>
  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
    Forms:
  </h2>
  <ButtonLoader :loading="loading.addForm" v-if="canManageForms" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 inline-flex items-center gap-3" @click="handleCreateFormClick">Add form</ButtonLoader>

  <div v-if="forms.length > 0" class="flex gap-3 flex-row flex-wrap">
    <div v-for="form in forms" :key="form.id" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex flex-col">
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ form.name }}</h3>
    </div>
  </div>
  <p v-else class="italic text-black dark:text-white">No forms configured yet...</p>

  <!-- this should never have to authorize itself -->
  <drive-picker
    v-if="showPicker && googleAccountStore.accessToken"
    :client-id="FORMS_CLIENT_ID"
    :app-id="DRIVE_APP_ID"
    :oauth-token="googleAccountStore.accessToken"
    :developer-key="API_KEY"
    @picker:picked="handleFilePicked"
    @picker:canceled="closeFilePicker"
    @picker:error="handlePickerError"
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
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b" @submit.prevent="onAddFormSubmit">
          <!-- form picker -->
          <!-- File Picker UI -->
          <div class="mb-6">
            <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-gray-200">
              Google Form:
            </label>
            <div class="flex flex-col gap-3">
              <ButtonLoader
                type="button"
                class="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 dark:bg-orange-700 dark:hover:bg-orange-800 dark:focus:ring-orange-900 transition"
                :loading="loading.pickForm"
                @click="openFilePicker"
              >
                <template v-slot:icon>
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                </template>
                Pick a Google Form
              </ButtonLoader>

              <!-- Show picked form details if available -->
              <div
                v-if="pickedForm"
                class="flex flex-col gap-2 p-4 border border-orange-200 bg-orange-50 rounded-lg shadow-sm dark:bg-gray-900/60 dark:border-orange-700"
              >
                <div class="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-orange-600 dark:text-orange-400"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>

                  <span class="font-semibold text-gray-900 dark:text-gray-100">{{ pickedForm.name }}</span>
                </div>
                <div class="text-sm text-gray-700 dark:text-gray-300">
                  <span class="font-medium me-1">Last modified:</span>
                  <span>{{ pickedForm.lastEditedUtc ? new Date(pickedForm.lastEditedUtc).toLocaleString() : 'Unknown' }}</span>
                </div>
                <div>
                  <a
                    :href="pickedForm.url"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex items-center gap-1 text-orange-700 hover:underline dark:text-orange-300"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
                    Open Form
                  </a>
                </div>
              </div>
              <div
                v-else
                class="flex items-center gap-2 p-3 border border-gray-200 bg-gray-50 rounded-lg dark:bg-gray-800 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 p-0.5 text-gray-400 dark:text-gray-500"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>

                No form selected yet.
              </div>
            </div>
          </div>

          <DateTimeInput v-if="pickedForm" v-model="dueDate" label="Due Date:" required />

          <p v-if="errorMessage" class="mb-3 text-rose-500 italic">{{ errorMessage }}</p>

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>

  <GoogleAuthorizationDialog
    :club-id="club.id"
    :open="showGoogleAuthDialog"
    :requested-scopes="scopes"
    @authorized="onGoogleAuthAuthorized"
    @closed="onGoogleAuthClosed"
  />
</template>
