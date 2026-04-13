<script setup lang="ts">
import DateTimeInput from "@/components/form/DateTimeInput.vue";
import FormInput from "@/components/form/FormInput.vue";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import {
  ClubElectionApplicationStatus,
  type Club,
  type ClubElectionApplication,
  type ClubElectionQuestion,
  type ClubElectionSettings,
  type ClubRole,
  OfficerPermission,
} from "@/schema";
import { showErrorToast, showSuccessToast } from "@/toast";
import { typedGetDoc, typedGetDocs } from "@/utils";
import {
  Timestamp,
  collection,
  doc,
  query,
  setDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { computed, getCurrentInstance, ref } from "vue";
import { useRouter } from "vue-router";

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

const router = useRouter();
const context = getCurrentInstance()?.appContext;
const canManageElections = computed(() => props.role.stuco || (props.role.officer & OfficerPermission.Officers) > 0);
if (!canManageElections.value) {
  await router.push({ name: "club-elections", params: { clubId: props.club.id } });
}

const electionsCollection = collection(props.clubDoc, "elections");
const settingsDocRef = doc(electionsCollection, "_settings");

const settingsDoc = await typedGetDoc<FirestoreElectionSettings>(settingsDocRef);
const startTime = ref<Date>(settingsDoc?.window.start.toDate() ?? new Date());
// 7 days in the future
const endTime = ref<Date>(settingsDoc?.window.end.toDate() ?? new Date(Date.now() + 7 * 3600 * 24 * 1000));
const description = ref(settingsDoc?.description ?? "");
const roles = ref(settingsDoc?.roles ?? { names: [], maxApply: 1 });
const questions = ref(settingsDoc?.questions ?? []);
const voting = ref(settingsDoc?.voting ?? { allowSelf: false, numVotes: 1 });

const submittedDocs = await typedGetDocs<ClubElectionApplication>(
  query(electionsCollection, where("status", ">=", ClubElectionApplicationStatus.Submitted))
);
const submittedApplications = ref<ElectionApplicationWithApplicant[]>(
  submittedDocs
    .filter(d => d.id !== "_settings")
    .map(d => ({
      applicantEmail: d.id,
      status: d.status,
      roles: d.roles ?? [],
      responses: d.responses ?? {},
    }))
);

const loading = ref({
  settings: false,
  review: false,
});

const roleNameInput = ref("");

function getQuestionText(questionId: string): string {
  return questions.value.find(q => q.id === questionId)?.question ?? questionId;
}

function addRoleName() {
  const role = roleNameInput.value.trim();
  if (!role) return;
  roles.value.names.push(role);
  roleNameInput.value = "";
  if (roles.value.maxApply > roles.value.names.length) {
    roles.value.maxApply = roles.value.names.length;
  }
}

function removeRoleName(index: number) {
  roles.value.names.splice(index, 1);
  if (roles.value.maxApply > roles.value.names.length) {
    roles.value.maxApply = Math.max(1, roles.value.names.length);
  }
}

function addQuestion() {
  questions.value.push({
    id: crypto.randomUUID(),
    question: "",
    required: false,
    type: "text",
  });
}

function removeQuestion(index: number) {
  questions.value.splice(index, 1);
}

function moveQuestion(index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= questions.value.length) return;
  const current = questions.value[index];
  questions.value[index] = questions.value[target];
  questions.value[target] = current;
}

function ensureQuestionOptions(question: ClubElectionQuestion) {
  if (question.type === "checkbox" || question.type === "radio") {
    if (!question.options) question.options = [""];
  } else {
    delete question.options;
  }
}

function addQuestionOption(question: ClubElectionQuestion) {
  if (!question.options) question.options = [];
  question.options.push("");
}

function removeQuestionOption(question: ClubElectionQuestion, optionIndex: number) {
  if (!question.options) return;
  question.options.splice(optionIndex, 1);
}

async function loadSubmittedApplications() {
  const docs = await typedGetDocs<ClubElectionApplication>(
    query(electionsCollection, where("status", ">=", ClubElectionApplicationStatus.Submitted))
  );
  submittedApplications.value = docs
    .filter(d => d.id !== "_settings")
    .map(d => ({
      applicantEmail: d.id,
      status: d.status,
      roles: d.roles ?? [],
      responses: d.responses ?? {},
    }));
}

async function saveSettings() {
  loading.value.settings = true;
  try {
    await setDoc(settingsDocRef, toFirestoreSettings({
      window: { start: startTime.value, end: endTime.value },
      description: description.value,
      roles: roles.value,
      questions: questions.value,
      voting: voting.value,
    }));
    showSuccessToast("Election settings saved", context, 3000);
  } catch (error) {
    showErrorToast(`Failed to save settings: ${String(error)}`, context, 3000);
  } finally {
    loading.value.settings = false;
  }
}

function toFirestoreSettings(settings: {
  window: { start: Date, end: Date },
  description: string,
  roles: { names: string[], maxApply: number },
  questions: ClubElectionQuestion[],
  voting: { allowSelf: boolean, numVotes: number }
}): FirestoreElectionSettings {
  return {
    window: {
      start: Timestamp.fromDate(settings.window.start),
      end: Timestamp.fromDate(settings.window.end),
    },
    description: settings.description,
    roles: settings.roles,
    questions: settings.questions,
    voting: settings.voting,
  };
}

async function setApplicationStatus(applicantEmail: string, action: "approve" | "reject") {
  loading.value.review = true;
  try {
    await setDoc(
      doc(electionsCollection, applicantEmail),
      {
        status: action === "approve" ? ClubElectionApplicationStatus.Approved : ClubElectionApplicationStatus.Draft,
      },
      { mergeFields: ["status"] }
    );
    await loadSubmittedApplications();
    showSuccessToast(
      action === "approve" ? "Application approved for voting" : "Application moved back to draft",
      context,
      3000
    );
  } catch (error) {
    showErrorToast(`Failed to update application status: ${String(error)}`, context, 3000);
  } finally {
    loading.value.review = false;
  }
}
</script>

<template>
  <div class="max-w-(--breakpoint-2xl) mx-auto p-4 space-y-8">
    <section class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Election Settings</h1>

      <div class="grid md:grid-cols-2 gap-4">
        <DateTimeInput v-model="startTime" label="Window start" required />
        <DateTimeInput v-model="endTime" label="Window end" required />
      </div>

      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">Description (Markdown)</label>
        <textarea
          v-model="description"
          class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          placeholder="Enter election description (supports markdown)"
          rows="4"
        />
      </div>

      <div>
        <label class="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">Roles</label>
        <div class="flex gap-2 mb-2">
          <input
            v-model="roleNameInput"
            type="text"
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Add role name"
          />
          <button type="button" class="px-3 py-2 text-sm rounded-lg bg-orange-600 text-white" @click="addRoleName">Add</button>
        </div>
        <div class="flex flex-wrap gap-2 mb-3">
          <button
            v-for="(roleName, i) in roles.names"
            :key="`${roleName}-${i}`"
            type="button"
            class="px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 text-sm"
            @click="removeRoleName(i)"
          >
            {{ roleName }} ×
          </button>
        </div>
      </div>
      <div class="flex gap-3">
        <FormInput v-model.number="roles.maxApply" label="Max roles per application" type="number" min="1" :max="Math.max(1, roles.names.length)" required />
        <FormInput v-model.number="voting.numVotes" label="Votes per member" type="number" min="1" required />
        <div class="inline-flex items-center mt-6">
          <input id="check-allow-self-voting" type="checkbox" v-model="voting.allowSelf"
            class="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
          <label for="check-allow-self-voting"
            class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Allow self-voting</label>
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-2">
          <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Application Questions</h2>
          <button type="button" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800" @click="addQuestion">Add question</button>
        </div>
        <div class="space-y-3">
          <div v-for="(question, i) in questions" :key="question.id" class="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-xs text-gray-500 dark:text-gray-400">ID: {{ question.id }}</p>
              <div class="flex items-center gap-1">
                <button type="button" class="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors p-1" title="Move up" @click="moveQuestion(i, -1)">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button type="button" class="text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors p-1" title="Move down" @click="moveQuestion(i, 1)">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <button type="button" class="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-1" title="Delete question" @click="removeQuestion(i)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-5 h-5">
                    <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>

            <FormInput v-model="question.question" label="Question prompt" placeholder="What makes you a good fit for your selected roles?" type="text" required />

            <div class="grid md:grid-cols-2 gap-3 mt-3">
              <div>
                <label class="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">Question type</label>
                <select
                  v-model="question.type"
                  class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  @change="ensureQuestionOptions(question)"
                >
                  <option value="text">Text</option>
                  <option value="url">Link</option>
                  <option value="checkbox">Multiple select</option>
                  <option value="radio">Single select</option>
                </select>
              </div>
              <div class="inline-flex items-center mt-7">
                <input :id="`check-required-${question.id}`" type="checkbox" v-model="question.required"
                  class="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <label :for="`check-required-${question.id}`"
                  class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">Required</label>
              </div>
            </div>

            <div v-if="question.type === 'checkbox' || question.type === 'radio'" class="mt-3">
              <p class="text-sm font-semibold text-gray-900 dark:text-white mb-2">Options</p>
              <div v-for="(_, optionIndex) in question.options" :key="optionIndex" class="flex gap-2 mb-2">
                <FormInput
                  :label="`Option ${optionIndex + 1}`" label-style="placeholder"
                  v-model="question.options![optionIndex]"
                  type="text" class="grow" />
                <button type="button" class="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors p-1" title="Remove option" @click="removeQuestionOption(question, optionIndex)">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-4 h-4">
                    <path fill-rule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 0 1 3.878.512.75.75 0 1 1-.256 1.478l-.209-.035-1.005 13.07a3 3 0 0 1-2.991 2.77H8.084a3 3 0 0 1-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 0 1-.256-1.478A48.567 48.567 0 0 1 7.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 0 1 3.369 0c1.603.051 2.815 1.387 2.815 2.951Zm-6.136-1.452a51.196 51.196 0 0 1 3.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 0 0-6 0v-.113c0-.794.609-1.428 1.364-1.452Zm-.355 5.945a.75.75 0 1 0-1.5.058l.347 9a.75.75 0 1 0 1.499-.058l-.346-9Zm5.48.058a.75.75 0 1 0-1.498-.058l-.347 9a.75.75 0 0 0 1.5.058l.345-9Z" clip-rule="evenodd" />
                  </svg>
                </button>
              </div>
              <button type="button" class="text-sm text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-gray-100 dark:hover:bg-gray-600 transition rounded-lg px-3 py-2 inline-flex items-center gap-1" @click="addQuestionOption(question)">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add option
              </button>
            </div>
          </div>
        </div>
      </div>

      <ButtonLoader :loading="loading.settings" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800" @click="saveSettings">
        Save election settings
      </ButtonLoader>
    </section>

    <section class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white">Submitted Applications</h2>

      <p v-if="submittedApplications.length === 0" class="text-sm italic text-gray-600 dark:text-gray-300">
        No submitted applications yet.
      </p>

      <div v-for="app in submittedApplications" :key="app.applicantEmail" class="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-3">
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-gray-900 dark:text-white">{{ app.applicantEmail }}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">Roles: {{ app.roles.join(', ') || 'None selected' }}</p>
          </div>
          <div class="text-right">
            <span class="inline-block px-2 py-1 rounded text-xs font-medium" :class="app.status === ClubElectionApplicationStatus.Submitted ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'">
              {{ app.status === ClubElectionApplicationStatus.Submitted ? 'Submitted' : 'Approved' }}
            </span>
          </div>
        </div>

        <div class="space-y-2 bg-white dark:bg-gray-800 rounded p-3">
          <div v-for="(value, questionId) in app.responses" :key="questionId" class="pb-2 last:pb-0 border-b border-gray-200 dark:border-gray-700 last:border-0">
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

        <div class="flex gap-2 pt-2">
          <ButtonLoader 
            :loading="loading.review" 
            class="flex-1 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors" 
            @click="setApplicationStatus(app.applicantEmail, 'approve')"
          >
            Approve
          </ButtonLoader>
          <ButtonLoader 
            :loading="loading.review" 
            class="flex-1 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-medium transition-colors" 
            @click="setApplicationStatus(app.applicantEmail, 'reject')"
          >
            Return to draft
          </ButtonLoader>
        </div>
      </div>
    </section>
  </div>
</template>
