<script setup lang="ts">
import api, { isTRPCClientError } from "@/api";
import DateTimeInput from "@/components/form/DateTimeInput.vue";
import ButtonLoader from "@/components/ui/ButtonLoader.vue";
import {
  type Club,
  type ClubRole,
  OfficerPermission,
  type ClubPrivate,
} from "@/schema";
import { showErrorToast } from "@/toast";
import { downloadFile, typedGetDoc, type DocWithId } from "@/utils";
import {
  DocumentReference, collection, query, where, getCountFromServer, doc
} from "firebase/firestore";
import { getCurrentInstance } from "vue";
import { ref, computed } from "vue";

const props = defineProps<{
  role: ClubRole;
  school: string;
  club: DocWithId<Club>;
  clubDoc: DocumentReference;
}>();

const canManageAttendance = computed(() => props.role.officer & OfficerPermission.Meetings)
// TODO: allow officers to inspect other members
const memberStatistics = ref(await api.club.attendance.memberStatistics.query({
  clubId: props.club.id
}));

const context = getCurrentInstance()?.appContext;

// Computed ref for attendance percentage
const attendancePercentage = computed(() => {
  const attended = memberStatistics.value.attended;
  const total = memberStatistics.value.total;
  return total > 0 ? (attended / total) * 100 : 0;
});

// this is used for the coloring of the stats
const attendanceLevel = computed(() => {
  if (attendancePercentage.value < 33) return 0;
  if (attendancePercentage.value < 67) return 1;
  return 2;
});

// Attendance box color and background styles
const attendanceBgColors = [
  "bg-rose-100 dark:bg-rose-900 border-rose-300 dark:border-rose-700",
  "bg-yellow-100 dark:bg-yellow-900 border-yellow-300 dark:border-yellow-700",
  "bg-emerald-100 dark:bg-emerald-900 border-emerald-300 dark:border-emerald-700"
];

const attendanceTextColors = [
  "text-rose-700 dark:text-rose-200",
  "text-yellow-700 dark:text-yellow-200",
  "text-emerald-700 dark:text-emerald-200"
];

const numMeetings = ref(0);
const totalClubAttendance = ref(0);

// Export state
const exportStartDate = ref<Date | undefined>();
const exportEndDate = ref<Date | undefined>();
const exportLoading = ref(false);

if (canManageAttendance.value) {
  numMeetings.value = await getCountFromServer(query(
    collection(props.clubDoc, "meetings"),
    where("startTime", "<=", new Date())
  )).then(res => res.data().count);

  const clubsPrivateDocRef = doc(props.clubDoc.parent.parent!, "clubs_private", props.club.id);
  const clubsPrivateDocSnap = await typedGetDoc<ClubPrivate>(clubsPrivateDocRef);
  totalClubAttendance.value = clubsPrivateDocSnap?.totalAttendance ?? 0;
}

// Helper to generate CSV from records
function generateCSV(records: Array<{ name: string; email: string; meetingTime: number; code: string; location: string }>): string {
  const header = "name,email,date,code,room";
  // Surround in quotes and escape internal quotes (by using double double quotes)
  const escape = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = records
    .map(r => [r.name, r.email, new Date(r.meetingTime).toLocaleString(), r.code, r.location])
    .map(r => r.map(f => escape(f)).join(","));
  return [header, ...rows].join("\n");
}

// Export attendance data
async function exportAttendance() {
  exportLoading.value = true;
  try {
    const result = await api.club.attendance.export.query({
      clubId: props.club.id,
      startDate: exportStartDate.value,
      endDate: exportEndDate.value
    });

    const csv = generateCSV(result.records);

    // Setup filename (slugified club name, date)
    const clubSlug = props.club.name.replace(/[^\w]+/, " ").trim().replace(" ", "-").toLowerCase();
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `${clubSlug}-club-hub-attendance-${dateStr}.csv`;
    const file = new File([csv], filename, { type: "text/csv" });
    await downloadFile(file);
  } catch (e) {
    // propagate error to user
    if (isTRPCClientError(e)) {
      showErrorToast(`Error: ${e.message}`, context, 3000);
    } else {
      throw e;
    }
  } finally {
    exportLoading.value = false;
  }
}
</script>

<template>
  <h1 class="text-4xl text-gray-700 dark:text-gray-300 mb-3 font-bold">
    Attendance Statistics:
  </h1>
  <div class="p-4">
    <!-- TODO: prompt for user to _take_ attendance -->

    <div class="flex flex-col md:flex-row gap-6">
      <!-- User Attendance Statistic Box -->
      <div
        class="flex-1 rounded-xl shadow p-6 flex flex-col items-center justify-center border-2"
        :class="attendanceBgColors[attendanceLevel]"
      >
        <div
          class="text-2xl font-semibold mb-2"
          :class="attendanceTextColors[attendanceLevel]"
        >
          Your Attendance
        </div>
        <div
          class="text-4xl font-bold mb-1"
          :class="attendanceTextColors[attendanceLevel]"
        >
          {{ memberStatistics.attended }} / {{ memberStatistics.total }}
        </div>
        <div
          class="text-lg"
          :class="attendanceTextColors[attendanceLevel]"
        >
          ({{ Math.round(attendancePercentage) }}%)
        </div>
      </div>

      <!-- Attendance Requirement Box -->
      <div class="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow p-6 flex flex-col items-center justify-center border-2 border-orange-200 dark:border-orange-700">
        <div class="text-2xl font-semibold text-orange-700 dark:text-orange-200 mb-2">
          Member Attendance Requirement
        </div>
        <div class="text-lg text-gray-700 dark:text-gray-200 mb-1">
          Must attend at least
          <span class="font-bold text-orange-600 dark:text-orange-200">
            {{ props.club.attendanceRequirements.memberPercentage }}%
          </span>
          of meetings to retain member status.
        </div>
        <div class="text-md text-gray-600 dark:text-gray-400 mb-2">
          (≈
          <span class="font-bold text-orange-500 dark:text-orange-300">
            {{
              Math.ceil(props.club.attendanceRequirements.memberPercentage / 100 * memberStatistics.total)
            }}
          </span>
          out of {{ memberStatistics.total }} meetings)
        </div>
        <div
          class="mt-2 px-4 py-2 rounded-lg font-semibold"
          :class="{
            'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 border border-green-300 dark:border-green-700': attendancePercentage >= props.club.attendanceRequirements.memberPercentage,
            'bg-red-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-700': !(attendancePercentage >= props.club.attendanceRequirements.memberPercentage)
          }"
        >
          {{
            attendancePercentage >= props.club.attendanceRequirements.memberPercentage
              ? "Requirement Met"
              : "Requirement Not Met"
          }}
        </div>
      </div>
    </div>

    <!-- TODO: global club statistics (if canManageAttendance) -->
    <div
      v-if="canManageAttendance"
      class="flex-1 bg-orange-50 dark:bg-orange-950 rounded-xl shadow p-6 flex flex-col items-center justify-center border-2 border-orange-300 dark:border-orange-700 mt-6"
    >
      <div class="text-2xl font-semibold text-orange-700 dark:text-orange-200 mb-2">
        Club-wide Attendance
      </div>
      <div class="text-4xl font-bold text-orange-600 dark:text-orange-100 mb-1">
        {{
          totalClubAttendance
        }}
        /
        {{
          numMeetings * club.numMembers
        }}
      </div>
      <div class="text-lg text-orange-700 dark:text-orange-200 mb-2">
        Average Attendance Rate:
        <span class="font-bold text-orange-700 dark:text-orange-200">
          {{
            Math.round((totalClubAttendance / (numMeetings * club.numMembers)) * 100)
          }}%
        </span>
      </div>
      <div class="text-md text-orange-600 dark:text-orange-300">
        (Total attendance records / total possible attendance)
      </div>
    </div>

    <!-- Export Section -->
    <div
      v-if="canManageAttendance"
      class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-6 border-2 border-orange-200 dark:border-orange-700"
    >
      <div class="mb-4">
        <h2 class="text-2xl font-semibold text-orange-700 dark:text-orange-200 mb-4">
          Export Attendance Records
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <!-- meeting date filter -->
          <DateTimeInput label="Start Date (optional)" :withTime="false" v-model="exportStartDate" />
          <DateTimeInput label="End Date (optional)" :withTime="false" v-model="exportEndDate" />
        </div>
        <ButtonLoader
          @click="exportAttendance"
          :loading="exportLoading"
          class="inline-flex gap-3 items-center px-4 py-2 text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 dark:bg-orange-500 dark:hover:bg-orange-600 rounded-lg"
        >
          <template #icon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-5 h-5">
              <path fill-rule="evenodd" d="M.99 5.24A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25l.01 9.5A2.25 2.25 0 0 1 16.76 17H3.26A2.267 2.267 0 0 1 1 14.74l-.01-9.5Zm8.26 9.52v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.615c0 .414.336.75.75.75h5.373a.75.75 0 0 0 .627-.74Zm1.5 0a.75.75 0 0 0 .627.74h5.373a.75.75 0 0 0 .75-.75v-.615a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625Zm6.75-3.63v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75h5.25a.75.75 0 0 0 .75-.75Zm-8.25 0v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75v.625c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75ZM17.5 7.5v-.625a.75.75 0 0 0-.75-.75H11.5a.75.75 0 0 0-.75.75V7.5c0 .414.336.75.75.75h5.25a.75.75 0 0 0 .75-.75Zm-8.25 0v-.625a.75.75 0 0 0-.75-.75H3.25a.75.75 0 0 0-.75.75V7.5c0 .414.336.75.75.75H8.5a.75.75 0 0 0 .75-.75Z" clip-rule="evenodd" />
            </svg>
          </template>
          {{ exportLoading ? "Exporting..." : "Export as CSV" }}
        </ButtonLoader>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Downloads member attendance records in CSV format
      </p>
    </div>
  </div>
</template>
