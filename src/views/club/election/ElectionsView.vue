<script setup lang="ts">
import api, { isTRPCClientError } from "@/api";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import { auth } from "@/firebase";
import {
  ClubElectionApplicationStatus,
  type Club,
  type ClubElectionApplication,
  type ClubElectionSettings,
  type ClubRole,
  OfficerPermission,
} from "@/schema";
import { showErrorToast, showSuccessToast } from "@/toast";
import { typedGetDoc, typedGetDocs } from "@/utils";
import {
  collection,
  doc,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { computed, getCurrentInstance, ref } from "vue";
import { useRouter } from "vue-router";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club & { id: string },
  clubDoc: DocumentReference,
}>();

const router = useRouter();
const context = getCurrentInstance()?.appContext;
const canManageElections = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Officers) > 0);
const userEmail = auth.currentUser?.email;
if (!userEmail) throw new Error("Expected signed-in user with an email");

const electionsCollection = collection(props.clubDoc, "elections");
const settingsDocRef = doc(electionsCollection, "_settings");
const myApplicationDocRef = doc(electionsCollection, userEmail);

const settings = await typedGetDoc<ClubElectionSettings>(settingsDocRef);
const myApplication = await typedGetDoc<ClubElectionApplication>(myApplicationDocRef);
const approvedCandidates = await typedGetDocs<ClubElectionApplication>(
  query(electionsCollection, where("status", ">=", ClubElectionApplicationStatus.Approved))
);

const hasWindowOpen = computed(() => {
  if (!settings) return false;
  const now = Date.now();
  return now >= settings.window.start.toMillis() && now <= settings.window.end.toMillis();
});

const creatingApplication = ref(false);

async function createApplication() {
  creatingApplication.value = true;
  try {
    await api.club.elections.create.mutate({
      clubId: props.club.id
    });
    showSuccessToast("Application successfully started", context, 3000);
    await router.push({ name: "club-elections-apply", params: { clubId: props.club.id } });
  } catch (error) {
    if (isTRPCClientError(error)) {
      showErrorToast(error.message, context, 3000);
    } else {
      showErrorToast(`An unknown error occured: ${error}`, context, 3000);
    }
  } finally {
    creatingApplication.value = false;
  }
}
</script>

<template>
  <div class="max-w-(--breakpoint-2xl) mx-auto p-4 space-y-6">
    <section>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Club Elections</h1>
      <p v-if="settings" class="text-sm text-gray-600 dark:text-gray-300">
        {{ settings.description || "No election description provided." }}
      </p>
      <p v-else class="text-sm text-gray-600 dark:text-gray-300 italic">
        Elections are not configured yet.
      </p>
    </section>

    <section class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-2">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Current Status</h2>
      <p v-if="settings" class="text-sm text-gray-700 dark:text-gray-300">
        Window:
        {{ settings.window.start.toDate().toLocaleString(undefined, { timeStyle: "short", dateStyle: "short" }) }}
        –
        {{ settings.window.end.toDate().toLocaleString(undefined, { timeStyle: "short", dateStyle: "short" }) }}
        <span class="ml-2 font-semibold" :class="hasWindowOpen ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
          {{ hasWindowOpen ? "Open" : "Closed" }}
        </span>
      </p>
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Your application:
        <span class="font-semibold">
          {{
            !myApplication
              ? "Not created"
              : myApplication.status === ClubElectionApplicationStatus.Draft
                ? "Draft"
                : myApplication.status === ClubElectionApplicationStatus.Submitted
                  ? "Submitted"
                  : "Approved"
          }}
        </span>
      </p>
      <p class="text-sm text-gray-700 dark:text-gray-300">
        Approved candidates:
        <span class="font-semibold">{{ approvedCandidates.length }}</span>
      </p>
      <div class="pt-2">
        <ButtonLoader
          v-if="!myApplication"
          :loading="creatingApplication"
          :disabled="!hasWindowOpen"
          class=" text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
          @click="createApplication"
        >
          Create application
        </ButtonLoader>
        <router-link
          v-else
          :to="{ name: 'club-elections-apply', params: { clubId: props.club.id } }"
          class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
        >
          Open application editor
        </router-link>
      </div>
    </section>

    <section class="grid md:grid-cols-2 gap-4">
      <router-link
        :to="{ name: 'club-elections-vote', params: { clubId: props.club.id } }"
        class="p-4 bg-white dark:bg-gray-800 border-2 rounded-lg border-orange-400 dark:border-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Vote</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">View approved candidates and submit your votes.</p>
      </router-link>

      <router-link
        v-if="canManageElections"
        :to="{ name: 'club-elections-settings', params: { clubId: props.club.id } }"
        class="p-4 bg-white dark:bg-gray-800 border-2 rounded-lg border-orange-400 dark:border-orange-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <h3 class="font-semibold text-gray-900 dark:text-white mb-1">Settings & Review</h3>
        <p class="text-sm text-gray-600 dark:text-gray-300">Configure elections and review submitted applications.</p>
      </router-link>
    </section>
  </div>
</template>
