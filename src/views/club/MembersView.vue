<script setup lang="ts">
import api, { isTRPCClientError } from '@/api';
import { db } from '@/firebase';
import { getCachedProfile } from '@/profiles';
import { type ClubPrivate, type Club, type ClubRole, OfficerPermission, ClubSignupType } from '@/schema';
import { showErrorToast, showSuccessToast } from '@/toast';
import { typedGetDoc, type DocWithId } from '@/utils';
import { computedAsync } from '@vueuse/core';
import { doc } from 'firebase/firestore';
import { getCurrentInstance } from 'vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: DocWithId<Club>
}>();

const context = getCurrentInstance()?.appContext;

const newMemberEmail = ref("");

async function getClubPrivate() {
  const clubPrivate = await typedGetDoc<ClubPrivate>(doc(db, "schools", props.school, "clubs_private", props.club.id));

  if (!clubPrivate) {
    await router.push({ name: "club-list" });
  }

  return clubPrivate!;
}

async function removeMember(i: number) {
  if (i < 0 || i >= clubPrivate.value.members.length) return;

  try {
    const name = users.value?.[i].displayName ?? clubPrivate.value.members[i];

    await api.club.members.mutate({
      clubId: props.club.id,
      memberEmail: clubPrivate.value.members[i],
      removeMember: true
    });

    // remove this member from the list
    clubPrivate.value.members.splice(i, 1);

    showSuccessToast(`Successfully removed ${name}`, context, 3000);
  } catch (e) {
    if (isTRPCClientError(e)) {
      showErrorToast(`An error occurred while removing this member: ${e.message}`, context, 3000);
    } else {
      throw e;
    }
  }
}

async function addMember(email: string) {
  if (clubPrivate.value.members.includes(email)) {
    showErrorToast(`This user is already a member of the club.`, context, 3000);
    return;
  }

  try {
    const userProfile = await getCachedProfile(email, true);

    await api.club.members.mutate({
      clubId: props.club.id,
      memberEmail: email,
      removeMember: false
    });

    clubPrivate.value.members.push(email);

    showSuccessToast(`Successfully added ${userProfile.displayName}`, context, 3000);
  } catch (e) {
    if (isTRPCClientError(e)) {
      if (e.data!.code === "NOT_FOUND") {
        showErrorToast(`User does not exist`, context, 3000);
      }
      showErrorToast(`An error occurred while removing this member: ${e.message}`, context, 3000);
    } else {
      throw e;
    }
  }
}

// check permission
if (!(props.role.stuco || (props.role.officer & OfficerPermission.Members)))
  router.push({ name: "club-list" });

// data about emails of users
const clubPrivate = ref(await getClubPrivate());

const users = computedAsync(() =>
  Promise.all(
    clubPrivate.value.members.map(memberEmail =>
      getCachedProfile(memberEmail).then(profile => ({
        ...profile,
        email: memberEmail
      }))
    )
  )
);
</script>

<template>
  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
    Club Members:
  </h2>

  <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
    <div v-for="(user, i) in users" :key="user.email" class="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-sm grow flex items-center gap-3 mb-2">
      <img :src="user.photoUrl ?? '/icons/icon.svg'" alt="user photo" class="w-6 h-6" />
      <div class="flex flex-col gap-1 grow">
        <span class="text-black dark:text-white">{{ user.displayName }}</span>
        <span class="font-sm text-gray-700 dark:text-gray-300">{{ user.email }}</span>
      </div>
      <button type="button" class="focus:outline-hidden text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-3 py-2 dark:bg-red-600 dark:hover:bg-red-700 dark:focus:ring-red-900"
        @click="removeMember(i)">
        <span class="sr-only">Remove member</span>
        <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.293 7.293a1 1 0 011.414 0L10 9.586l2.293-2.293a1 1 0 111.414 1.414L11.414 11l2.293 2.293a1 1 0 01-1.414 1.414L10 12.414l-2.293 2.293a1 1 0 01-1.414-1.414L8.586 11 6.293 8.707a1 1 0 010-1.414z"/></svg>
      </button>
    </div>

    <form @submit.prevent="addMember(newMemberEmail)" class="flex items-end gap-3 max-w-screen-sm mt-4">
      <input type="email" v-model="newMemberEmail" placeholder="New member email" required
        class="grow px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-900 dark:text-white" />
      <button type="submit" class="flex items-center justify-center text-white bg-orange-700 hover:bg-orange-800 focus:ring-4 focus:ring-orange-300 font-medium rounded-lg text-sm px-4 py-3 dark:bg-orange-600 dark:hover:bg-orange-700 focus:outline-hidden dark:focus:ring-orange-800">
        <svg class="h-3.5 w-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
          <path clip-rule="evenodd" fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
        Add new member
      </button>
    </form>

    <div v-if="props.club.signup.type === ClubSignupType.Open" class="mt-4 p-3 bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-sm text-green-900 dark:text-green-100">
      This club has <span class="font-semibold">open signup</span>: any student from this school can join.
    </div>
  </div>
</template>
