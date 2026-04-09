<script setup lang="ts">
import api, { isTRPCClientError } from '@/api';
import FormInput from '@/components/form/FormInput.vue';
import FormMultiSelect from '@/components/form/FormMultiSelect.vue';
import { getCachedProfile } from '@/stores/profiles';
import { type Club, type ClubPrivate, type ClubRole, OfficerPermission } from '@/schema';
import { showErrorToast, showSuccessToast } from '@/toast';
import { typedGetDoc, permissionBitmaskToArray, arrayToPermissionBitmask, PERMISSION_LABELS } from '@/utils';
import { computedAsync } from '@vueuse/core';
import type { DocumentReference } from 'firebase/firestore';
import { getCurrentInstance, ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const context = getCurrentInstance()?.appContext;

const props = defineProps<{
  role: ClubRole,
  school: string,
  club: Club,
  clubPrivateDoc: DocumentReference
}>();

const canEditOfficers = props.role.stuco || (props.role.officer & OfficerPermission.Officers);
const loading = ref(false);
const searchInput = ref("");

let clubPrivate = ref<ClubPrivate | null>(null);
try {
  clubPrivate.value = await typedGetDoc<ClubPrivate>(props.clubPrivateDoc);
} catch (e) {
  // ignore - user doesn't have member permission
}

// Convert officer dict to array
const officers = ref(
  Object.entries(props.club.officers).map(([encodedEmail, data]) => ({
    email: encodedEmail,
    role: data.role,
    permissions: permissionBitmaskToArray(data.permissions)
  }))
);

// Fetch all officer profiles (uses cache)
const officerProfilesMap = computedAsync(async () => {
  const map = new Map<string, { displayName: string; photoUrl: string }>();
  for (const officer of officers.value) {
    const profile = await getCachedProfile(officer.email);
    map.set(officer.email, profile);
  }
  return map;
});

// Filter current officers out of members and apply the email search
const filteredMembers = computed(() => {
  const currentOfficerEmails = new Set(officers.value.map(o => o.email));
  const query = searchInput.value.trim().toLowerCase();
  // emails
  return clubPrivate.value?.members.filter(m =>
    !currentOfficerEmails.has(m) && m.includes(query)
  ) ?? [];
});

async function addOfficer(email: string) {
  if (officers.value.some(o => o.email === email)) {
    showErrorToast("This member is already an officer.", context, 3000);
    return;
  }

  officers.value.push({
    email,
    role: "",
    permissions: []
  });
  searchInput.value = "";
}

function removeOfficer(index: number) {
  officers.value.splice(index, 1);
}

async function saveOfficers() {
  try {
    loading.value = true;

    // build officer record for backend
    const officersRecord: Record<string, { role: string; permissions: number }> = {};
    for (const officer of officers.value) {
      officersRecord[officer.email] = {
        role: officer.role,
        permissions: arrayToPermissionBitmask(officer.permissions)
      };
    }

    // apply
    await api.club.officers.mutate({
      clubId: props.club.id,
      officers: officersRecord
    });

    showSuccessToast("Officer permissions updated successfully", context, 3000);
  } catch (e) {
    // propagate error to user
    if (isTRPCClientError(e)) {
      const errorMsg = e.data?.code === "FORBIDDEN" 
        ? "You don't have permission to manage officers."
        : e.message;
      showErrorToast(`Error: ${errorMsg}`, context, 3000);
    } else {
      throw e;
    }
  } finally {
    loading.value = false;
  }
}

// for mutliselect input
const permissionOptions = [
  { value: OfficerPermission.Officers, label: PERMISSION_LABELS[OfficerPermission.Officers] },
  { value: OfficerPermission.Members, label: PERMISSION_LABELS[OfficerPermission.Members] },
  { value: OfficerPermission.Meetings, label: PERMISSION_LABELS[OfficerPermission.Meetings] },
  { value: OfficerPermission.Messages, label: PERMISSION_LABELS[OfficerPermission.Messages] },
  { value: OfficerPermission.Forms, label: PERMISSION_LABELS[OfficerPermission.Forms] },
  { value: OfficerPermission.ClubDetails, label: PERMISSION_LABELS[OfficerPermission.ClubDetails] }
];
</script>

<template>
  <div class="max-w-(--breakpoint-2xl) mx-auto p-4">
    <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
      Officer Permissions
    </h2>

    <!-- Officer List -->
    <div class="space-y-4 mb-8">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Current Officers</h3>

      <div v-if="officers.length === 0" class="text-gray-500 dark:text-gray-400 italic">
        No officers assigned yet.
      </div>

      <div v-for="(officer, i) in officers" :key="officer.email" class="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div class="flex items-start gap-4">
          <!-- Officer Info -->
          <div class="shrink-0">
            <img 
              :src="officerProfilesMap?.get(officer.email)?.photoUrl || '/icons/icon.svg'" 
              alt="officer photo" 
              class="h-12 w-12 rounded-full" 
            />
          </div>

          <!-- Editable Fields -->
          <div class="grow space-y-3">
            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Name</p>
              <p class="text-gray-900 dark:text-white">{{ officerProfilesMap?.get(officer.email)?.displayName || officer.email }}</p>
            </div>

            <div>
              <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
              <p class="text-gray-900 dark:text-white">{{ officer.email }}</p>
            </div>

            <FormInput
              v-model="officer.role"
              label="Role"
              type="text"
              placeholder="e.g., President, Vice President"
              :disabled="!canEditOfficers"
            />

            <FormMultiSelect
              v-model="officer.permissions"
              label="Permissions"
              :options="permissionOptions"
              :disabled="!canEditOfficers"
            />
          </div>

          <!-- Remove Button -->
          <button
            v-if="canEditOfficers"
            type="button"
            @click="removeOfficer(i)"
            class="shrink-0 text-red-700 border border-red-700 hover:bg-red-200 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-3 py-2 bg-transparent dark:text-red-400 dark:border-red-400 dark:hover:bg-red-900 dark:focus:ring-red-900 inline-flex gap-2 items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-4 w-4">
              <path d="M10.375 2.25a4.125 4.125 0 1 0 0 8.25 4.125 4.125 0 0 0 0-8.25ZM10.375 12a7.125 7.125 0 0 0-7.124 7.247.75.75 0 0 0 .363.63 13.067 13.067 0 0 0 6.761 1.873c2.472 0 4.786-.684 6.76-1.873a.75.75 0 0 0 .364-.63l.001-.12v-.002A7.125 7.125 0 0 0 10.375 12ZM16 9.75a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Z" />
            </svg>
            <span>Remove</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Add Officer Section -->
    <div v-if="canEditOfficers" class="space-y-4 mb-8 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Add Officer</h3>

      <div class="space-y-3">
        <div>
          <label class="block mb-2 text-sm font-medium text-gray-900 dark:text-white">
            Enter Member Email
          </label>
          <input
            v-model="searchInput"
            type="text"
            placeholder="Search by name or email..."
            class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-orange-500 focus:border-orange-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-orange-500 dark:focus:border-orange-500"
          />
        </div>

        <!-- Dropdown of available members -->
        <div v-if="searchInput.trim() && filteredMembers.length > 0" class="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <button
            v-for="email in filteredMembers.slice(0, 5)"
            :key="email"
            type="button"
            @click="addOfficer(email)"
            class="w-full text-left p-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 border-b border-gray-200 dark:border-gray-600 last:border-b-0"
          >
            <p class="text-sm font-medium text-gray-900 dark:text-white">{{ email }}</p>
          </button>
        </div>

        <div v-if="searchInput.trim() && filteredMembers.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
          No matching members found.
        </div>
      </div>
    </div>

    <!-- Save Button -->
    <div v-if="canEditOfficers" class="flex gap-3">
      <button
        type="button"
        @click="saveOfficers"
        :disabled="loading"
        class="text-white bg-orange-600 hover:bg-orange-700 focus:ring-4 focus:outline-hidden focus:ring-orange-300 font-medium rounded-lg text-sm px-5 py-2.5 dark:bg-orange-600 dark:hover:bg-orange-700 dark:focus:ring-orange-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ loading ? 'Saving...' : 'Save Changes' }}
      </button>
    </div>

    <div v-if="!canEditOfficers" class="mt-8 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
      <p class="text-sm text-rose-900 dark:text-rose-200">
        You don't have permission to edit officer roles and permissions.
      </p>
    </div>
  </div>
</template>
