<script setup lang="ts">
import api from "@/api";
import {
  type Club,
  type ClubRole,
  OfficerPermission,
} from "@/schema";
import { getClaims } from "@/utils";
import {
  DocumentReference,
} from "firebase/firestore";
import { computed } from "vue";
import { onMounted } from "vue";

const props = defineProps<{
  role: ClubRole;
  school: string;
  club: Club;
  clubDoc: DocumentReference;
}>();

const canManageAttendance = computed(() => props.role.officer & OfficerPermission.Meetings)
// TODO: allow officers to inspect other members
const memberStatistics = await api.club.attendance.memberStatistics.query({
  clubId: props.club.id
});
</script>

<template>
  <h1 class="text-4xl text-gray-700 dark:text-gray-300 mb-3 font-bold">
    Attendance Statistics:
  </h1>
  <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
    <!-- TODO: prompt for user to _take_ attendance -->

    <div class="flex flex-col md:flex-row gap-6">
      <!-- User Attendance Statistic Box -->
      <div class="flex-1 bg-orange-100 dark:bg-orange-900 rounded-xl shadow p-6 flex flex-col items-center justify-center border-2 border-orange-300 dark:border-orange-700">
        <div class="text-2xl font-semibold text-orange-700 dark:text-orange-200 mb-2">
          Your Attendance
        </div>
        <div class="text-4xl font-bold text-orange-600 dark:text-orange-100 mb-1">
          {{ memberStatistics.attended }} / {{ memberStatistics.total }}
        </div>
        <div class="text-lg text-orange-700 dark:text-orange-200">
          ({{ memberStatistics.total > 0 ? Math.round((memberStatistics.attended / memberStatistics.total) * 100) : 0 }}%)
        </div>
      </div>

      <!-- Attendance Requirement Box -->
      <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center justify-center border-2 border-orange-200 dark:border-orange-700">
        <div class="text-2xl font-semibold text-orange-700 dark:text-orange-200 mb-2">
          Requirement
        </div>
        <div class="text-lg text-gray-700 dark:text-gray-200 mb-1">
          Must attend at least
          <span class="font-bold text-orange-600 dark:text-orange-200">
            {{ props.club.attendanceRequirements.memberPercentage }}%
          </span>
          of meetings
        </div>
        <div class="text-md text-gray-600 dark:text-gray-400 mb-2">
          (≈
          <span class="font-bold text-orange-500 dark:text-orange-300">
            {{
              memberStatistics.total > 0
                ? Math.ceil(props.club.attendanceRequirements.memberPercentage / 100 * memberStatistics.total)
                : 0
            }}
          </span>
          out of {{ memberStatistics.total }} meetings)
        </div>
        <div
          class="mt-2 px-4 py-2 rounded-lg font-semibold"
          :class="{
            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 border border-green-300 dark:border-green-700': memberStatistics.total > 0 && (memberStatistics.attended / memberStatistics.total) * 100 >= props.club.attendanceRequirements.memberPercentage,
            'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 border border-red-300 dark:border-red-700': !(memberStatistics.total > 0 && (memberStatistics.attended / memberStatistics.total) * 100 >= props.club.attendanceRequirements.memberPercentage)
          }"
        >
          {{
            memberStatistics.total > 0 && (memberStatistics.attended / memberStatistics.total) * 100 >= props.club.attendanceRequirements.memberPercentage
              ? "Requirement Met"
              : "Requirement Not Met"
          }}
        </div>
      </div>
    </div>

    <!-- TODO: global club statistics (if canManageAttendance) -->
  </div>
</template>
