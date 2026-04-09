<script setup lang="ts">
import api from "@/api";
import {
  type Club,
  type ClubRole,
  OfficerPermission,
  type ClubPrivate,
} from "@/schema";
import { typedGetDoc, type DocWithId } from "@/utils";
import {
  DocumentReference, collection, query, where, getCountFromServer, doc
} from "firebase/firestore";
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
const exportStartDate = ref<string>("");
const exportEndDate = ref<string>("");
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

// Helper to convert date input to milliseconds (noon UTC)
function dateToMillis(dateStr: string): number {
  if (!dateStr) return 0;
  const date = new Date(dateStr);
  date.setUTCHours(12, 0, 0, 0);
  return date.getTime();
}

// Helper to generate CSV from records
function generateCSV(records: Array<{ name: string; email: string; meetingTime: string; code: string; room: string }>): string {
  const header = "name,email,meetingTime,code,room";
  const rows = records.map(r => 
    `"${r.name.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}","${r.meetingTime}","${r.code.replace(/"/g, '""')}","${r.room.replace(/"/g, '""')}"`
  );
  return [header, ...rows].join("\n");
}

// Export attendance data
async function exportAttendance() {
  exportLoading.value = true;
  try {
    const startDateMs = dateToMillis(exportStartDate.value);
    const endDateMs = dateToMillis(exportEndDate.value);

    const result = await api.club.attendance.export.query({
      clubId: props.club.id,
      startDate: startDateMs || undefined,
      endDate: endDateMs || undefined
    });

    const csv = generateCSV(result.records);

    // Create download
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `${props.club.name}-attendance-${dateStr}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Export failed:", error);
    alert("Failed to export attendance data");
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
      class="bg-white dark:bg-gray-800 rounded-xl shadow p-6 mt-6 border-2 border-blue-200 dark:border-blue-700"
    >
      <div class="mb-4">
        <h2 class="text-2xl font-semibold text-blue-700 dark:text-blue-200 mb-4">
          Export Attendance Records
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date (optional)
            </label>
            <input
              v-model="exportStartDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date (optional)
            </label>
            <input
              v-model="exportEndDate"
              type="date"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          @click="exportAttendance"
          :disabled="exportLoading"
          class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-lg"
        >
          <svg
            v-if="!exportLoading"
            class="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 19v-7m0 0V5m0 7H5m7 0h7"
            />
          </svg>
          <svg v-else class="w-5 h-5 mr-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
          </svg>
          {{ exportLoading ? "Exporting..." : "Export as CSV" }}
        </button>
      </div>
      <p class="text-sm text-gray-600 dark:text-gray-400">
        Downloads attendance records with name, email, meeting time (ISO 8601), attendance code, and room.
      </p>
    </div>
  </div>
</template>
