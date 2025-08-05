<script setup lang="ts">
import { OfficerPermission, type Club, type ClubForm, type ClubRole, type ClubUpdate } from '@/schema';
import { onMounted, ref, computed, type Ref, watch } from 'vue';
import { collection } from "@firebase/firestore";
import { db, auth } from "@/firebase";
import FormInput from '@/components/FormInput.vue';
import { typedGetDocs, type DocWithId, injectScript } from '@/utils';
import "@googleworkspace/drive-picker-element";
import { FORMS_CLIENT_ID, API_KEY, DRIVE_APP_ID } from "@/google-drive";
import api, { isTRPCClientError } from '@/api';

const FORM_MIME_TYPE = "application/vnd.google-apps.form";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club
}>();

const scopes = ["openid", "email", "https://www.googleapis.com/auth/drive.file"];

const canManageForms = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Forms));
const formsCollection = collection(db, "schools", props.school, "clubs", props.club.id, "forms");
const forms = ref(await typedGetDocs<ClubForm>(formsCollection));

const googleAccessToken = ref<{ token: string, expiresAt: number, email: string } | null>(null);
const showModal = ref(false);
const showPicker = ref(false);
const errorMessage = ref("");

let googleAuthClient: google.accounts.oauth2.CodeClient | null = null;

onMounted(async () => {
  if (!window.google?.accounts?.oauth2)
    await injectScript("https://accounts.google.com/gsi/client");

  googleAuthClient = google.accounts.oauth2.initCodeClient({
    client_id: FORMS_CLIENT_ID,
    ux_mode: "popup",
    scope: scopes.join(" "),
    callback: async response => {
      if (!scopes.every(scope => response.scope.includes(scope))) {
        errorMessage.value = "Authorization error: Missing required scopes.";
        return;
      }
      try {
        // exchange code
        const exchangeResult = await api.user.google.authorize.mutate({ token: response.code });

        googleAccessToken.value = {
          token: exchangeResult.accessToken,
          expiresAt: exchangeResult.expiresAt,
          email: exchangeResult.email
        };
      } catch (e) {
        if (isTRPCClientError(e)) {
          errorMessage.value = `Authorization error: ${e.message}`;
        }
      }
    },
    error_callback: e => {
      errorMessage.value = `Prompt error: ${e.message}`;
    },
    include_granted_scopes: true,
    login_hint: auth.currentUser?.email ?? undefined
  });
})

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
  showPicker.value = false;

  // Picker error
  errorMessage.value = `File picker error: ${String(event.detail)}`;
}

/**
 * Returns true if Google authorization is needed.
 */
async function needsGoogleAuthorization() {
  if (!googleAccessToken.value || googleAccessToken.value.expiresAt < Date.now()) {
    // expired or missing - fetch from backend
    const newToken = await api.user.google.getToken.mutate({ scopes });
    if (newToken.authorizationNeeded) {
      return true;
    } else {
      googleAccessToken.value = {
        expiresAt: newToken.expiresAt,
        token: newToken.accessToken,
        email: newToken.email
      };
    }
  }

  // existing token works
  return false;
}

async function openFormModal() {
  if (await needsGoogleAuthorization()) {
    // we can't show the picker yet - show the authz prompt
    googleAccessToken.value = null;
  }
  errorMessage.value = "";
  showModal.value = true;
}
</script>

<template>
  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
    Forms:
  </h2>
  <button v-if="canManageForms" type="button" class=" my-3 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block" @click="openFormModal">Add form</button>

  <div v-if="forms.length > 0" class="flex gap-3 flex-row flex-wrap">
    <div v-for="form in forms" :key="form.id" class="max-w-sm py-4 px-6 bg-white border border-gray-200 rounded-lg shadow-sm dark:bg-gray-800 dark:border-gray-700 flex flex-col">
      <h3 class="mb-2 text-2xl font-bold text-gray-900 dark:text-white">{{ form.description }}</h3>
    </div>
  </div>
  <p v-else class="italic text-black dark:text-white">No forms configured yet...</p>

  <!-- this should never have to authorize itself -->
  <drive-picker
    v-if="showPicker && googleAccessToken"
    :client-id="FORMS_CLIENT_ID"
    :app-id="DRIVE_APP_ID"
    :oauth-token="googleAccessToken"
    :developer-key="API_KEY"
    @picker:picked="handleFilePicked"
    @picker:canceled="showModal = false"
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
        <form class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b">
          <div v-if="!googleAccessToken" class="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 rounded-lg mb-4 flex items-start gap-4 shadow-sm">
            <svg class="w-6 h-6 text-yellow-400 dark:text-yellow-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z"/>
            </svg>
            <div>
              <h4 class="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Google Authorization Required</h4>
              <p class="text-yellow-700 dark:text-yellow-100 mb-2">
                To select a Google Form, you need to authorize access to your Google account. Club Hub will only have access to the specific files which you select.
              </p>
              <button
                type="button"
                @click="googleAuthClient?.requestCode()"
                class="inline-flex items-center px-4 py-2 bg-yellow-500 dark:bg-yellow-700 hover:bg-yellow-600 dark:hover:bg-yellow-800 text-white text-sm font-medium rounded shadow focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-yellow-600"
              >
                <svg class="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.35 11.1h-9.17v2.97h5.27c-.23 1.22-1.38 3.58-5.27 3.58-3.17 0-5.76-2.62-5.76-5.85s2.59-5.85 5.76-5.85c1.81 0 3.02.77 3.72 1.43l2.54-2.47C16.44 3.94 14.56 3 12.18 3 6.98 3 2.77 7.22 2.77 12.01s4.21 9.01 9.41 9.01c5.43 0 9.02-3.81 9.02-9.18 0-.62-.07-1.09-.15-1.74z"/>
                </svg>
                Authorize with Google
              </button>
            </div>
          </div>
          <template v-else>
            <!-- google account connection info -->
            <div class="bg-orange-50 dark:bg-orange-900 border-l-4 border-orange-400 dark:border-orange-600 p-4 rounded-lg mb-4 flex items-start gap-4 shadow-sm">
              <svg class="w-6 h-6 text-orange-400 dark:text-orange-300 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 01-8 0m8 0a4 4 0 00-8 0m8 0V8a4 4 0 00-8 0v4m8 0v4a4 4 0 01-8 0v-4"/>
              </svg>
              <div>
                <h4 class="font-semibold text-orange-800 dark:text-orange-200 mb-1">Google Account Connected</h4>
                <p class="text-orange-700 dark:text-orange-100 mb-2">
                  Signed in as <span class="font-mono font-semibold">{{ googleAccessToken.email }}</span>
                </p>

                <button
                  type="button"
                  class="inline-flex items-center px-4 py-2 bg-rose-500 dark:bg-rose-700 hover:bg-rose-600 dark:hover:bg-rose-800 text-white text-sm font-medium rounded shadow focus:outline-none focus:ring-2 focus:ring-rose-400 dark:focus:ring-rose-600"
                >
                  <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                  Revoke Access
                </button>
                <div class="mt-3 text-xs text-yellow-600 dark:text-yellow-200 bg-yellow-100 dark:bg-yellow-900 rounded p-2">
                  <strong>Disclaimer:</strong> Other club officers with the Forms permission will be able to view responses from any forms you select.
                </div>
              </div>
            </div>

            <!-- form picker -->
            <div class="flex flex-col items-center justify-center gap-2 py-6">
              <button
                type="button"
                @click="showPicker = true"
                class="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg shadow transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 dark:bg-orange-700 dark:hover:bg-orange-800 dark:focus:ring-orange-600"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M8 7V5a4 4 0 018 0v2" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M12 13v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M9 16h6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Choose a Google Form
              </button>
              <div class="text-sm text-orange-700 dark:text-orange-200 bg-orange-50 dark:bg-orange-900 rounded px-4 py-2 mt-2 w-full max-w-md text-center shadow">
                Select a Google Form from your Drive to link it to this club. Only forms you own or have access to will appear.
              </div>
            </div>
          </template>

          <p v-if="errorMessage" class="mb-3 text-rose-500 italic">{{ errorMessage }}</p>

          <button class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 block">Submit</button>
        </form>
      </div>
    </div>
  </dialog>

</template>
