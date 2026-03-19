<template>
  <dialog
    :open="open"
    tabindex="-1"
    aria-hidden="true"
    class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 flex justify-center items-center w-full h-[calc(100%-1rem)] max-h-full bg-gray-300/75 dark:bg-gray-900/75"
  >
    <div class="relative p-4 w-full max-w-xl max-h-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div class="relative bg-white rounded-lg dark:bg-gray-700 shadow-lg">
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
          <div class="flex items-center gap-2">
            <svg class="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <h3 class="text-xl font-semibold text-gray-900 dark:text-white">
              Google Account Authorization
            </h3>
          </div>
          <button
            type="button"
            class="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ms-auto inline-flex justify-center items-center dark:hover:bg-gray-600 dark:hover:text-white"
            @click="emit('closed')"
          >
            <svg class="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
              <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"/>
            </svg>
            <span class="sr-only">Close modal</span>
          </button>
        </div>
        <div class="p-4 md:p-5 space-y-4 dark:bg-gray-800 rounded-b">
          <div class="mb-2">
            <span class="block text-base font-medium text-gray-900 dark:text-white mb-1">
              Link your club's Google account to enable forms and messaging features.
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              You will be prompted to grant access to Google Drive and Forms.
            </span>
          </div>
          <div v-if="!hasPermission" class="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="orange" stroke-width="2"/>
              <path d="M12 8v4" stroke="orange" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1" fill="orange"/>
            </svg>
            <span>
              You do not have sufficient permissions to authorize Google integration for this club.<br>
              Only officers with <strong>Forms</strong> or <strong>Messages</strong> permissions can proceed.
            </span>
          </div>
          <div v-else>
            <div v-if="error" class="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded px-3 py-2 text-rose-700 dark:bg-rose-900 dark:border-rose-700 dark:text-rose-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                <path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
              <span>{{ error }}</span>
            </div>
            <div v-if="loading" class="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold">
              <svg class="animate-spin h-5 w-5 text-orange-600 dark:text-orange-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              Authorizing...
            </div>
            <div v-else class="space-y-2">
              <button
                @click="startAuthorization"
                class="w-full flex items-center justify-center gap-2 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
              >
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M21.35 11.1h-9.17v2.8h5.22c-.22 1.18-1.32 3.47-5.22 3.47-3.13 0-5.69-2.59-5.69-5.76s2.56-5.76 5.69-5.76c1.78 0 2.97.76 3.65 1.41l2.49-2.42C16.18 4.5 14.36 3.5 12 3.5 6.73 3.5 2.5 7.73 2.5 13s4.23 9.5 9.5 9.5c5.47 0 9.5-4.23 9.5-9.5 0-.63-.07-1.25-.15-1.9z"/>
                </svg>
                Authorize with Google
              </button>
              <button
                v-if="canRevoke"
                @click="revokeAuthorization"
                class="w-full flex items-center justify-center gap-2 text-orange-600 bg-white border border-orange-600 hover:bg-orange-50 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-700 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900 dark:focus:ring-orange-800"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Revoke Google Authorization
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useGoogleAccountStore } from "@/stores/googleAccount";
import { injectScript } from "@/utils";

const props = defineProps<{
  clubId: string;
  open: boolean;
  requestedScopes: string[];
}>();

const emit = defineEmits<{
  (e: "authorized"): void;
  (e: "closed"): void;
}>();

const store = useGoogleAccountStore(props.clubId);

const loading = ref(false);
const error = ref<string | null>(null);

const hasPermission = ref(false);
const canRevoke = computed(() =>
  !!store.accessToken.value && !!store.email.value
);

let googleAuthClient: any = null;
const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const ux_mode = "popup";

async function checkPermission() {
  hasPermission.value = await store.hasGoogleIntegrationPermission();
}

async function ensureGoogleClient() {
  if (window.google?.accounts?.oauth2 && googleAuthClient) return;
  await injectScript("https://accounts.google.com/gsi/client");
  googleAuthClient = window.google.accounts.oauth2.initCodeClient({
    client_id,
    scope: props.requestedScopes.join(" "),
    ux_mode,
    callback: async (response: any) => {
      if (response.code) {
        try {
          loading.value = true;
          await store.authorize(response.code);
          emit("authorized");
        } catch (e: any) {
          error.value = e?.message || "Authorization failed.";
        } finally {
          loading.value = false;
        }
      } else {
        error.value = "Google authorization failed or was cancelled.";
      }
    },
    error_callback: (err: any) => {
      error.value = err?.error || "Google authorization failed.";
    },
    include_granted_scopes: true,
    // Optionally: login_hint, etc.
  });
}

async function startAuthorization() {
  error.value = null;
  loading.value = true;
  try {
    await ensureGoogleClient();
    googleAuthClient.requestCode();
  } catch (e: any) {
    error.value = e?.message || "Authorization failed.";
    loading.value = false;
  }
}

async function revokeAuthorization() {
  error.value = null;
  loading.value = true;
  try {
    await store.revoke();
  } catch (e: any) {
    error.value = e?.message || "Revocation failed.";
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  async (val) => {
    if (val) {
      error.value = null;
      loading.value = false;
      await checkPermission();
    }
  }
);

onMounted(async () => {
  await checkPermission();
});
</script>