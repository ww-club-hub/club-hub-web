<template>
  <div
    v-if="open"
    tabindex="-1"
    class="overflow-y-auto overflow-x-hidden fixed inset-0 z-50 flex justify-center items-center w-full h-[calc(100%-1rem)] max-h-full bg-gray-300/75 dark:bg-gray-900/75"
  >
    <div class="absolute p-4 w-full max-w-xl max-h-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <div class="relative bg-white rounded-lg dark:bg-gray-700 shadow-lg">
        <div class="flex items-center justify-between p-4 md:p-5 border-b rounded-t dark:border-gray-600 border-gray-200">
          <div class="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-orange-600 dark:text-orange-400">
              <path fill-rule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clip-rule="evenodd" />
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
              Link your club's Google account to enable forms and automatic emails features.
            </span>
            <span class="text-sm text-gray-500 dark:text-gray-400">
              You will be prompted to grant access to Google Drive or Gmail. Club Hub will only have access to the resources you select.
            </span>
          </div>
          <div v-if="!hasPermission" class="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-yellow-800 dark:bg-yellow-900 dark:border-yellow-700 dark:text-yellow-200">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
              <path d="M12 8v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <circle cx="12" cy="16" r="1" fill="currentColor"/>
            </svg>
            <span>
              You do not have sufficient permissions to authorize Google integration for this club.<br>
              Only officers with <strong>Forms</strong> or <strong>Messages</strong> permissions can proceed.
            </span>
          </div>
          <div v-else>
            <div class="space-y-2">
              <ButtonLoader
                @click="startAuthorization"
                :loading="loading"
                class="w-full flex items-center justify-center gap-2 text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
              >
                <template #icon>
                  <svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </template>
                Authorize with Google
              </ButtonLoader>
              <ButtonLoader
                v-if="canRevoke"
                @click="revokeAuthorization"
                :loading="loading"
                class="w-full flex items-center justify-center gap-2 text-orange-600 bg-white border border-orange-600 hover:bg-orange-50 focus:ring-4 focus:outline-none focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-700 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-900 dark:focus:ring-orange-800"
              >
                <template #icon>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </template>
                Revoke Google Authorization
              </ButtonLoader>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useGoogleAccountStore } from "@/stores/googleAccount";
import { injectScript } from "@/utils";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import { showErrorToast } from "@/toast";
import { getCurrentInstance } from "vue";
import { FORMS_CLIENT_ID } from "@/google-drive";

const props = defineProps<{
  clubId: string;
  open: boolean;
  requestedScopes: string[];
}>();

const emit = defineEmits<{
  (e: "authorized"): void;
  (e: "closed"): void;
}>();

const appContext = getCurrentInstance()?.appContext;

const store = useGoogleAccountStore(props.clubId);

const loading = ref(false);
const hasPermission = ref(false);
const canRevoke = computed(() =>
  !!store.accessToken.value && !!store.email.value
);

let googleAuthClient: google.accounts.oauth2.CodeClient | null = null;
const ux_mode = "popup";

async function checkPermission() {
  hasPermission.value = await store.hasGoogleIntegrationPermission();
}

async function ensureGoogleClient() {
  if (window.google?.accounts?.oauth2 && googleAuthClient) return;
  await injectScript("https://accounts.google.com/gsi/client");
  googleAuthClient = window.google.accounts.oauth2.initCodeClient({
    client_id: FORMS_CLIENT_ID,
    scope: props.requestedScopes.join(" "),
    ux_mode,
    callback: async (response: any) => {
      if (response.code) {
        try {
          loading.value = true;
          await store.authorize(response.code);
          emit("authorized");
        } catch (e: any) {
          showErrorToast(e?.message || "Authorization failed.", appContext, 3000);
        }
      } else {
        showErrorToast("Google authorization failed or was cancelled.", appContext, 3000);
      }
      loading.value = false;
    },
    error_callback: (err: any) => {
      showErrorToast(err?.error || "Google authorization failed.", appContext, 3000);
    },
    include_granted_scopes: true,
  });
}

async function startAuthorization() {
  loading.value = true;
  try {
    await ensureGoogleClient();
    googleAuthClient?.requestCode();
  } catch (e: any) {
    showErrorToast(e?.message || "Authorization failed.", appContext, 3000);
  }
}

async function revokeAuthorization() {
  loading.value = true;
  try {
    await store.revoke();
  } catch (e: any) {
    showErrorToast(e?.message || "Revocation failed.", appContext, 3000);
  } finally {
    loading.value = false;
  }
}

watch(
  () => props.open,
  async (val) => {
    if (val) {
      loading.value = false;
      await checkPermission();
    }
  }
);

onMounted(async () => {
  await checkPermission();
});
</script>
