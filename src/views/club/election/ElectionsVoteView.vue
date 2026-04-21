<script setup lang="ts">
import api, { isTRPCClientError } from "@/api";
import FormMultiSelect from "@/components/form/FormMultiSelect.vue";
import CandidateResponseDisplay from "@/components/elections/CandidateResponseDisplay.vue";
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

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club & { id: string },
  clubDoc: DocumentReference,
}>();

const context = getCurrentInstance()?.appContext;
const electionsCollection = collection(props.clubDoc, "elections");
const settingsDocRef = doc(electionsCollection, "_settings");

const settings = await typedGetDoc<ClubElectionSettings>(settingsDocRef);
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
// votes: position name -> set of candidate emails
const myVotes = ref<Record<string, Set<string>>>(
  (settings?.roles.names ?? []).reduce((acc, position) => {
    acc[position] = new Set();
    return acc;
  }, {} as Record<string, Set<string>>)
);

const hasVotingWindowOpen = computed(() => {
  if (!settings?.votingWindow) return false;
  const now = Date.now();
  return now >= settings.votingWindow.start.toMillis() && now <= settings.votingWindow.end.toMillis();
});

const votingAvailabilityMessage = computed(() => {
  if (!settings) return "Voting is unavailable until officers configure elections.";
  if (!hasVotingWindowOpen.value) return "Voting is only available during the voting window.";
  if (candidates.value.length === 0) return "No approved candidates are available yet.";
  return "Voting availability may still depend on attendance requirements set by officers.";
});

// Check if all positions have at least one vote
const allPositionsHaveVotes = computed(() => {
  return (settings?.roles.names ?? []).every(position => myVotes.value[position]?.size > 0);
});

// Validate no candidate appears in multiple positions
function validateNoDuplicates(): string | null {
  const allVotes = new Set<string>();
  for (const positionVotes of Object.values(myVotes.value)) {
    for (const email of positionVotes) {
      if (allVotes.has(email)) {
        return `You cannot vote for the same person (${email}) in multiple positions`;
      }
      allVotes.add(email);
    }
  }
  return null;
}

async function submitVotes() {
  const duplicateError = validateNoDuplicates();
  if (duplicateError) {
    showErrorToast(duplicateError, context, 3000);
    return;
  }

  loading.value.vote = true;
  try {
    // Convert sets to arrays for submission
    const votes: Record<string, string[]> = {};
    for (const [position, emailSet] of Object.entries(myVotes.value)) {
      votes[position] = Array.from(emailSet);
    }

    const res = await api.club.elections.vote.mutate({
      clubId: props.club.id,
      votes,
    });
    
    // Update local state with returned votes
    for (const [position, emails] of Object.entries(res.votes)) {
      myVotes.value[position] = new Set(emails);
    }
    
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

    <section v-if="settings && candidates.length > 0" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">Candidate Responses</h2>
      <div class="space-y-4">
        <CandidateResponseDisplay
          v-for="candidate in candidates"
          :key="candidate.applicantEmail"
          :loading="false"
          :candidate="{ ...candidate, email: candidate.applicantEmail }"
          :questions="settings.questions"
        />
      </div>
    </section>

    <section v-if="settings" class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Cast Your Votes</h2>

      <div v-for="position in settings.roles.names" :key="position" class="space-y-2 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0">
        <FormMultiSelect
          v-model="myVotes[position]"
          :label="`Votes for ${position}`"
          :max-items="settings.voting.numVotes"
          :options="candidates.map(c => ({ value: c.applicantEmail, label: c.applicantEmail }))"
        />
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Select up to {{ settings.voting.numVotes }} candidate(s) for this position.
        </p>
      </div>

      <ButtonLoader
        :loading="loading.vote"
        :disabled="!hasVotingWindowOpen || candidates.length === 0 || !allPositionsHaveVotes"
        :class="{
          'w-full text-white font-medium rounded-lg text-sm px-5 py-2.5 text-center transition-colors': true,
          'bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800': hasVotingWindowOpen && candidates.length > 0 && allPositionsHaveVotes,
          'bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-60': !hasVotingWindowOpen || candidates.length === 0 || !allPositionsHaveVotes
        }"
        @click="submitVotes"
      >
        Submit votes
      </ButtonLoader>
    </section>
  </div>
</template>
