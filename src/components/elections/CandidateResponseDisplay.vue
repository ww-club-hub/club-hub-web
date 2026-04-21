<script setup lang="ts">
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import { computed, onMounted, ref } from "vue";
import type { ClubElectionApplication, ClubElectionQuestion } from "@/schema";
import { getCachedProfile } from "@/stores/profiles";

const props = defineProps<{
  candidate: ClubElectionApplication & { email: string };
  questions: ClubElectionQuestion[];
  showApprovals?: boolean;
  loading: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}>();

const profile = ref<{ displayName: string; photoUrl: string } | null>(null);

onMounted(async () => {
  profile.value = await getCachedProfile(props.candidate.email);
});

function getQuestionText(questionId: string): string {
  return props.questions.find(q => q.id === questionId)?.question ?? questionId;
}

// Sort responses by question order
const sortedResponses = computed(() => {
  if (!props.candidate.responses) return [];
  // Iterate over questions in order and build array
  return props.questions
    .map(q => [q.id, props.candidate.responses[q.id]])
    .filter(([, value]) => value !== undefined);
});
</script>

<template>
  <div class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-3">
    <!-- Header with user info -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <img
          v-if="profile?.photoUrl"
          :src="profile.photoUrl"
          :alt="profile.displayName"
          class="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700"
        />
        <div>
          <p class="font-semibold text-gray-900 dark:text-white">{{ profile?.displayName ?? candidate.email }}</p>
          <p class="text-xs text-gray-500 dark:text-gray-400">{{ candidate.email }}</p>
          <p class="text-sm text-gray-600 dark:text-gray-400">Applying for: {{ candidate.roles.join(', ') || 'No roles listed' }}</p>
        </div>
      </div>
      <div v-if="showApprovals" class="text-right">
        <span class="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Approved
        </span>
      </div>
    </div>

    <!-- Responses -->
    <div class="space-y-2 bg-white dark:bg-gray-800 rounded p-3">
      <div v-for="[questionId, value] in sortedResponses" :key="questionId" class="pb-2 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-0">
        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{{ getQuestionText(String(questionId)) }}</p>
        <p class="text-sm text-gray-900 dark:text-gray-100 mt-1">
          <template v-if="Array.isArray(value)">
            {{ (value as string[]).join(', ') }}
          </template>
          <template v-else>
            {{ value }}
          </template>
        </p>
      </div>
    </div>

    <!-- Action buttons -->
    <div v-if="showApprovals && onApprove && onReject" class="flex gap-2 pt-2">
      <ButtonLoader
        :loading="loading"
        class="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
        @click="onApprove"
      >
        Approve
      </ButtonLoader>
      <ButtonLoader
        :loading="loading"
        class="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors"
        @click="onReject"
      >
        Return to draft
      </ButtonLoader>
    </div>
  </div>
</template>
