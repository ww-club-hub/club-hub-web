<script setup lang="ts">
import api, { isTRPCClientError } from "@/api";
import FormInput from "@/components/form/FormInput.vue";
import FormMultiSelect from "@/components/form/FormMultiSelect.vue";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import MarkdownContent from "@/components/ui/MarkdownContent.vue";
import { auth } from "@/firebase";
import {
  ClubElectionApplicationStatus,
  type Club,
  type ClubElectionApplication,
  type ClubElectionSettings,
  type ClubRole,
} from "@/schema";
import { showErrorToast, showSuccessToast } from "@/toast";
import { typedGetDoc } from "@/utils";
import { collection, doc, setDoc, type DocumentReference } from "firebase/firestore";
import { computed, getCurrentInstance, ref } from "vue";

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club & { id: string },
  clubDoc: DocumentReference,
}>();

const context = getCurrentInstance()?.appContext;
const userEmail = auth.currentUser?.email;
if (!userEmail) throw new Error("Expected signed-in user with an email");

const electionsCollection = collection(props.clubDoc, "elections");
const settingsDocRef = doc(electionsCollection, "_settings");
const myApplicationDocRef = doc(electionsCollection, userEmail);

const settings = await typedGetDoc<ClubElectionSettings>(settingsDocRef);
const myApplication = ref(await typedGetDoc<ClubElectionApplication>(myApplicationDocRef));
const selectedRoles = ref<Set<string>>(new Set(myApplication.value?.roles ?? []));
const responses = ref<Record<string, string | number | Set<string>>>(myApplication.value?.responses ? { ...myApplication.value.responses } : {});

const loading = ref({
  saveDraft: false,
  submitDraft: false,
});

const hasWindowOpen = computed(() => {
  if (!settings) return false;
  const now = Date.now();
  return now >= settings.window.start.toMillis() && now <= settings.window.end.toMillis();
});

async function saveDraft(showSuccess = true) {
  if (!myApplication.value) {
    showErrorToast("Create a draft application first.", context, 3000);
    return false;
  }
  loading.value.saveDraft = true;
  try {
    const processedResponses: Record<string, any> = {};
    for (const [key, value] of Object.entries(responses.value)) {
      processedResponses[key] = value instanceof Set ? Array.from(value) : value;
    }
    await setDoc(
      myApplicationDocRef,
      {
        roles: Array.from(selectedRoles.value),
        responses: processedResponses,
      },
      { mergeFields: ["roles", "responses"] }
    );
    if (showSuccess) {
      showSuccessToast("Draft saved", context, 3000);
    }
    return true;
  } catch (error) {
    showErrorToast(`Failed to save draft: ${String(error)}`, context, 3000);
    return false;
  } finally {
    loading.value.saveDraft = false;
  }
}

async function submitDraft() {
  if (!myApplication.value) return;
  loading.value.submitDraft = true;
  try {
    const saved = await saveDraft(false);
    if (!saved) return;
    await api.club.elections.submit.mutate({ clubId: props.club.id });
    myApplication.value.status = ClubElectionApplicationStatus.Submitted;
    showSuccessToast("Application submitted", context, 3000);
  } catch (error) {
    if (isTRPCClientError(error)) {
      showErrorToast(error.message, context, 3000);
    } else {
      showErrorToast("Failed to submit application. Please try again.", context, 3000);
    }
  } finally {
    loading.value.submitDraft = false;
  }
}
</script>

<template>
  <div class="max-w-(--breakpoint-2xl) mx-auto p-4 space-y-6">
    <section>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">Edit Election Application</h1>
      <p v-if="settings" class="text-sm text-gray-600 dark:text-gray-300">
        Window:
        {{ settings.window.start.toDate().toLocaleString(undefined, { timeStyle: "short", dateStyle: "short" })  }}
        –
        {{ settings.window.end.toDate().toLocaleString(undefined, { timeStyle: "short", dateStyle: "short" })  }}
        <span class="ml-2 font-semibold" :class="hasWindowOpen ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'">
          {{ hasWindowOpen ? "Open" : "Closed" }}
        </span>
      </p>
      <MarkdownContent v-if="settings && settings.description" :content="settings.description" class="mt-3" />
    </section>

    <section class="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
      <div v-if="!settings" class="text-sm text-gray-600 dark:text-gray-300 italic">
        Officers must configure elections before applications can be edited.
      </div>
      <div v-else-if="!myApplication" class="space-y-3">
        <p class="text-sm text-gray-600 dark:text-gray-300">No application draft exists yet.</p>
        <router-link :to="{ name: 'club-elections', params: { clubId: props.club.id } }" class="inline-flex px-4 py-2 rounded-lg bg-orange-600 text-white">
          Go to Elections status page
        </router-link>
      </div>
      <div v-else class="space-y-4">
        <p class="text-sm text-gray-700 dark:text-gray-300">
          Status:
          <span class="font-semibold">
            {{
              myApplication.status === ClubElectionApplicationStatus.Draft
                ? "Draft"
                : myApplication.status === ClubElectionApplicationStatus.Submitted
                  ? "Submitted"
                  : "Approved"
            }}
          </span>
        </p>
        <form class="space-y-3" @submit.prevent="submitDraft">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-2">Roles</h3>
            <FormMultiSelect
              v-model="selectedRoles"
              label="Select roles"
              :options="settings.roles.names.map(name => ({ value: name, label: name }))"
              :max-items="settings.roles.maxApply"
              required
            />
            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Select up to {{ settings.roles.maxApply }} role(s).
            </p>
          </div>
          
          <div v-for="question in settings.questions" :key="question.id">
            <FormInput
              v-if="question.type === 'text' || question.type === 'url'"
              v-model="responses[question.id]"
              :label="question.question"
              type="text"
              :required="question.required"
            />
            <FormMultiSelect
              v-else-if="question.type === 'checkbox'"
              v-model="responses[question.id] as Set<string>"
              :label="question.question"
              :options="(question.options ?? []).map(opt => ({ value: opt, label: opt }))"
              :required="question.required"
            />
            <div v-else>
              <label class="block mb-2 text-sm font-semibold text-gray-900 dark:text-white">{{ question.question }}</label>
              <select
                v-model="responses[question.id]"
                class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                :required="question.required"
              >
                <option disabled value="">Choose an option</option>
                <option v-for="option in (question.options ?? [])" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>
          <div class="flex gap-3">
            <ButtonLoader :loading="loading.saveDraft" class="text-white bg-gray-600 hover:bg-gray-700 focus:ring-4 focus:outline-hidden focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-gray-600 dark:hover:bg-gray-700 dark:focus:ring-gray-800" @click="saveDraft()" type="button">
              Save draft
            </ButtonLoader>
            <ButtonLoader :loading="loading.submitDraft" :disabled="!hasWindowOpen" class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800" type="submit">
              Submit application
            </ButtonLoader>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>
