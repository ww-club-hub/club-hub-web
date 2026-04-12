<script setup lang="ts">
import api, { isTRPCClientError } from "@/api";
import FormMultiSelect from "@/components/form/FormMultiSelect.vue";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import {
  ClubElectionApplicationStatus,
  type Club,
  type ClubElectionApplication,
  type ClubElectionSettings,
  type ClubRole,
} from "@/schema";
import { showErrorToast, showSuccessToast } from "@/toast";
import { typedGetDoc, typedGetDocs } from "@/utils";
import {
  Timestamp,
  collection,
  doc,
  query,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { computed, getCurrentInstance, ref } from "vue";

type ElectionApplicationWithApplicant = ClubElectionApplication & { applicantEmail: string };
type FirestoreElectionSettings = Omit<ClubElectionSettings, "window"> & {
  window: { start: Timestamp, end: Timestamp }
};

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club & { id: string },
  clubDoc: DocumentReference,
}>();

const context = getCurrentInstance()?.appContext;
const electionsCollection = collection(props.clubDoc, "elections");
const settingsDocRef = doc(electionsCollection, "_settings");

const settings = await typedGetDoc<FirestoreElectionSettings>(settingsDocRef);
const docs = await typedGetDocs<ClubElectionApplication>(
  query(electionsCollection, where("status", ">=", ClubElectionApplicationStatus.Approved))
);
const candidates = ref<ElectionApplicationWithApplicant[]>(
  docs
    .filter(d => d.id !== "_settings")
    .map(d => ({
      applicantEmail: d.id,
      status: d.status,
      roles: d.roles ?? [],
      responses: d.responses ?? {},
    }))
);

const loading = ref({ vote: false });
const myVotes = ref<Set<string>>(new Set());

const hasWindowOpen = computed(() => {
  if (!settings) return false;
  const now = Date.now();
  return now >= settings.window.start.toMillis() && now <= settings.window.end.toMillis();
});

const votingAvailabilityMessage = computed(() => {
  if (!settings) return "Voting is unavailable until officers configure elections.";
  if (!hasWindowOpen.value) return "Voting is only available while the election window is open.";
  if (candidates.value.length === 0) return "No approved candidates are available yet.";
  return "Voting availability may still depend on attendance requirements set by officers.";
});

async function submitVotes() {
  loading.value.vote = true;
  try {
    const res = await api.club.elections.vote.mutate({
      clubId: props.club.id,
      votes: Array.from(myVotes.value),
    });
    myVotes.value = new Set(res.votes);
    showSuccessToast("Votes submitted", context, 3000);
  } catch (error) {
    if (isTRPCClientError(error)) {
      showErrorToast(error.message, context, 3000);
    } else {
      showErrorToast("Failed to submit votes. Please try again.", context, 3000);
    }
  } finally {
    loading.value.vote = false;
  }
}
</script>

<template>
  <div class="max-w-(--breakpoint-2xl) mx-auto p-4 space-y-6">
    <section>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Election Voting</h1>
      <p class="text-sm text-gray-600 dark:text-gray-300 italic">{{ votingAvailabilityMessage }}</p>
    </section>

    <section v-if="settings" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <FormMultiSelect
        v-model="myVotes"
        label="Vote for candidates"
        :max-items="settings.voting.numVotes"
        :options="candidates.map(c => ({ value: c.applicantEmail, label: `${c.applicantEmail} — ${c.roles.join(', ') || 'No roles listed'}` }))"
      />

      <p class="text-xs text-gray-500 dark:text-gray-400">
        Select up to {{ settings.voting.numVotes }} candidate(s).
      </p>

      <ButtonLoader
        :loading="loading.vote"
        :disabled="!hasWindowOpen || candidates.length === 0 || myVotes.size === 0"
        class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
        @click="submitVotes"
      >
        Submit votes
      </ButtonLoader>
    </section>
  </div>
</template>
