<script setup lang="ts">
import { ref } from "vue";
import { auth } from "../firebase";
import { years } from "../assets/grad-years.json";
import { topics } from "../assets/club-topics.json";
import { type ParsedToken, getIdTokenResult, onAuthStateChanged, type User, sendEmailVerification, getIdToken, reload } from "firebase/auth";
import { computed } from "vue";
import OnboardingStep from "../components/OnboardingStep.vue";
import { useRouter } from "vue-router";
import { api, isTRPCClientError } from "@/api";
import { nextTick } from "vue";
import { showSuccessToast, showWarningToast } from "@/toast";
import { getCurrentInstance } from "vue";
import ButtonLoader from "@/components/ButtonLoader.vue";

// TYPES

enum OnboardingStepType {
  VerifyEmail,
  JoinSchool,
  SetGraduationYear,
  SetInterests,
  Done
};

interface School {
  id: string,
  website: string,
  name: string
}

// STATE

const user = ref<User | null>(null);
const claims = ref<ParsedToken | null>(null);
const message = ref("");
const searchQuery = ref("");
const foundSchools = ref<School[]>([]);
const gradYear = ref("");
const interests = ref(new Set<number>());
const emailVerificationSent = ref(false);

const loading = ref({
  sendEmailVerification: false,
  verifyEmail: false,
  search: false,
  joinSchool: false,
  setGradYear: false,
  setInterests: false
});

const router = useRouter();

const context = getCurrentInstance()?.appContext;

// LISTENERS

onAuthStateChanged(auth, async currentUser => {
  if (currentUser) {
    user.value = currentUser;
    const idToken = await getIdTokenResult(currentUser);
    claims.value = idToken.claims;
  }
});

const currentStep = computed(() => {
  if (!user.value?.emailVerified) return OnboardingStepType.VerifyEmail;
  if (!claims.value?.school) return OnboardingStepType.JoinSchool;
  if (!claims.value?.gradYear) return OnboardingStepType.SetGraduationYear;
  if (!claims.value?.interests) return OnboardingStepType.SetInterests;

  // go to school page
  router.push({ name: "school-detail" });
  return OnboardingStepType.Done;
});

async function verifyEmail() {
  if (!user.value) return;

  loading.value.sendEmailVerification = true;

  await sendEmailVerification(user.value);

  emailVerificationSent.value = true;

  // show toast
  showSuccessToast("Verification email sent.", context, 1000);

  loading.value.sendEmailVerification = false;
}

async function refreshEmailVerification() {
  if (!user.value) return;

  loading.value.verifyEmail = true;

  // need to refresh to register email verification
  await reload(user.value);
  await getIdToken(user.value, true);
  user.value = auth.currentUser;

  await nextTick();

  if (user.value?.emailVerified) emailVerificationSent.value = false;
  else showWarningToast("Email not verified!", context, 1000);

  loading.value.verifyEmail = false;
}

async function search() {
  if (!user.value) return;

  loading.value.search = true;

  // fetch schools starting with searchQuery
  try {
    const { schools } = await api.school.search.query({
      query: searchQuery.value.trim().toLowerCase()
    });
    foundSchools.value = schools;
    message.value = "";
  } catch (err) {
    if (isTRPCClientError(err)) {
      message.value = err.message;
    }
  } finally {
    loading.value.search = false;
  }
}

async function joinSchool(id: string) {
  if (!user.value) return;

  loading.value.joinSchool = true;

  try {
    await api.school.join.mutate({
      schoolId: id
    });
    message.value = "";

    // refresh id token

    claims.value = (await getIdTokenResult(user.value, true)).claims;
  } catch (err) {
    if (isTRPCClientError(err)) {
      message.value = err.message;
    }
  } finally {
    loading.value.joinSchool = false;
  }
}

async function setGradYear() {
  if (!user.value) return;

  loading.value.setGradYear = true;

  try {
    await api.user.gradYear.mutate({
      gradYear: gradYear.value
    });
    message.value = "";

    // refresh id token

    claims.value = (await getIdTokenResult(user.value, true)).claims;
  } catch (err) {
    if (isTRPCClientError(err)) {
      message.value = err.message;
    }
  } finally {
    loading.value.setGradYear = false;
  }
}

async function setInterests() {
  if (!user.value) return;

  loading.value.setInterests = true;

  try {
    await api.user.interests.mutate({
      interests: [...interests.value]
    });
    message.value = "";

    // refresh id token

    claims.value = (await getIdTokenResult(user.value, true)).claims;
  } catch (err) {
    if (isTRPCClientError(err)) {
      message.value = err.message;
    }
  } finally {
    loading.value.setInterests = false;
  }
}
</script>

<template>
  <section class="bg-gray-50 dark:bg-gray-900 grow flex flex-col items-center justify-center px-6 py-8 lg:py-0">
    <h1 class="flex items-center mb-6 text-2xl font-semibold text-gray-900 dark:text-white">
      Account setup:
    </h1>
    <div
      class="w-full bg-white rounded-lg shadow-sm dark:border md:mt-0 sm:max-w-md xl:p-0 dark:bg-gray-800 dark:border-gray-700">
      <div class="p-6 space-y-4 md:space-y-6 sm:p-8">
        <ul class="max-w-md space-y-2 list-inside">
          <OnboardingStep :active="currentStep == OnboardingStepType.VerifyEmail" name="Verify your email address"
            :done="currentStep > OnboardingStepType.VerifyEmail">
            <template v-if="emailVerificationSent">
              <!-- we show this after they click send verification email -->
              <p class="mb-2 text-gray-700 dark:text-gray-200">Verification email sent! Click the button below when you're done.</p>

              <div class="flex gap-3 items-center">
                <ButtonLoader :loading="loading.verifyEmail" type="button"
                        class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
                        @click="refreshEmailVerification">Check verification</ButtonLoader>

                <!-- TODO: make this outlined to de-emphasize it -->
                <ButtonLoader :loading="loading.sendEmailVerification" type="button"
                        class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
                        @click="verifyEmail">Resend email</ButtonLoader>
              </div>
            </template>
            <template v-else>
              <!-- initial verification prompt -->
              <p class="mb-3">You'll need to verify your email before you can use this site</p>

              <ButtonLoader :loading="loading.sendEmailVerification" type="button"
                      class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
                      @click="verifyEmail">Send verification email</ButtonLoader>
            </template>
          </OnboardingStep>

          <OnboardingStep :active="currentStep == OnboardingStepType.JoinSchool" name="Join a school"
            :done="currentStep > OnboardingStepType.JoinSchool">
            <!-- search box -->
            <div class="relative my-3">
              <div class="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none">
                <svg class="w-4 h-4 text-gray-500 dark:text-gray-400" aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z" />
                </svg>
              </div>
              <input type="search" v-model="searchQuery"
                class="block w-full p-4 ps-10 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-orange-500 focus:border-orange-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500"
                placeholder="Search for your school..." required />
              <ButtonLoader :loading="loading.search" type="button" @click="search"
                class="text-white absolute end-2.5 bottom-2.5 bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800">Search</ButtonLoader>
            </div>

            <div class="mb-3">
              <div
                class="max-w-sm p-3 bg-gray-50 border border-gray-200 rounded-lg shadow-sm dark:bg-gray-900 dark:border-gray-700 flex items-start gap-3 justify-between"
                v-for="school in foundSchools" :key="school.id">
                <div>
                  <a :href="school.website" target="_blank" rel="noreferrer">
                    <h5 class="mb-2 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">{{ school.name }}
                    </h5>
                  </a>
                  <p class="font-normal text-gray-700 dark:text-gray-400">{{ school.website }}</p>
                </div>
                <ButtonLoader :loading="loading.joinSchool" type="button"
                  class="inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium text-center text-orange-700 hover:text-white border-2 border-orange-700 hover:bg-orange-800 focus:ring-4 focus:outline-hidden focus:ring-orange-300 not-only-of-type:rounded-lg dark:border-orange-500 dark:text-orange-300 dark:hover:text-white dark:hover:bg-orange-500 dark:focus:ring-orange-800"
                  @click="joinSchool(school.id)">
                  Join
                  <svg class="rtl:rotate-180 w-3.5 h-3.5 ms-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"
                    fill="none" viewBox="0 0 14 10">
                    <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M1 5h12m0 0L9 1m4 4L9 9" />
                  </svg>
                </ButtonLoader>
              </div>
            </div>

            <p class="text-sm font-light text-gray-500 dark:text-gray-400">
              Don't see your school? Administrators, <router-link :to="{ name: 'create-school' }"
                class="font-medium text-orange-600 hover:underline dark:text-orange-500">create a school</router-link>.
            </p>
          </OnboardingStep>
          <OnboardingStep :active="currentStep == OnboardingStepType.SetGraduationYear" name="Set your graduation year"
            :done="currentStep > OnboardingStepType.SetGraduationYear">
            <p class="mb-3">Your graduation year is used to determine grade-based eligibility. (e.g. officer positions)
            </p>

            <!-- graduation year dropdown -->
            <!-- TODO: make list autoupdating, rather than just fixed list of 5 years -->
            <div>
              <div class="flex items-center mb-4" v-for="year in years" :key="year">
                <input :id="`check-grad-year-${year}`" type="radio" :value="year" name="check-grad-years"
                  v-model="gradYear"
                  class="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 round-sm focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <label :for="`check-grad-year-${year}`"
                  class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">{{ year }}</label>
              </div>
            </div>

            <ButtonLoader :loading="loading.setGradYear" type="button"
              class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
              @click="setGradYear">Next</ButtonLoader>
          </OnboardingStep>
          <OnboardingStep :active="currentStep == OnboardingStepType.SetInterests" name="Set your interests"
            :done="currentStep > OnboardingStepType.SetInterests">
            <p class="mb-3">This step is optional, but setting interests helps you find new clubs to join.</p>

            <!-- interests list -->
            <div>
              <div class="flex items-center mb-4" v-for="topic, i in topics" :key="i">
                <input :id="`check-interests-${i}`" type="checkbox" :value="i" name="check-interests"
                  v-model="interests"
                  class="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-orange-500 dark:focus:ring-orange-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600">
                <label :for="`check-interests-${i}`"
                  class="ms-2 text-sm font-medium text-gray-900 dark:text-gray-300">{{ topic }}</label>
              </div>
            </div>

            <ButtonLoader :loading="loading.setInterests" type="button"
              class="w-full text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800"
              @click="setInterests">Done</ButtonLoader>
          </OnboardingStep>
        </ul>

        <!-- TODO: make this something like a toast -->
        <p v-if="message" class="mb-2 text-orange-950 dark:text-orange-100 italic">{{ message }}</p>
      </div>
    </div>
  </section>
</template>
