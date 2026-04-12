import { TRPCError } from "@trpc/server";
import type {
  AggregationQueryResponse,
  Club,
  ClubElectionSettings,
  Env,
  FirestoreRestDocument,
  UserClaims,
} from "../../../types";
import {
  makeFirestoreDocPath,
  parseAggregationCount,
  parseFirestoreObject,
} from "../../../firebase";
import { authedJsonRequest, isNotFoundError } from "../../../utils";

export function ensureMemberAccess(user: Pick<UserClaims, "role" | "memberOf" | "officerOf">, clubId: string) {
  const isAdmin = user.role === "owner" || user.role === "admin";
  const isOfficer = clubId in (user.officerOf ?? {});
  const isMember = user.memberOf?.includes(clubId) ?? false;
  if (!isAdmin && !isOfficer && !isMember) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a member of this club",
    });
  }
}

export function ensureElectionWindowOpen(settings: ClubElectionSettings) {
  const now = Date.now();
  const start = settings.window.start.toMillis();
  const end = settings.window.end.toMillis();
  if (now < start || now > end) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Elections are not currently open",
    });
  }
}

/** Make sure the selected roles are valid according to settings */
export function ensureRolesValid(roles: string[], settings: ClubElectionSettings) {
  if (roles.length > settings.roles.maxApply) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `You can apply for up to ${settings.roles.maxApply} role(s)`,
    });
  }
  if (roles.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You must select at least one role to apply for",
    });
  }

  const unknownRole = roles.find(r => !settings.roles.names.includes(r));
  if (unknownRole) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Unknown role: ${unknownRole}`,
    });
  }
}

export async function getElectionSettings(
  env: Env,
  firestoreToken: string,
  schoolId: string,
  clubId: string
) {
  try {
    const settingsDoc = await authedJsonRequest<FirestoreRestDocument>(
      null,
      firestoreToken,
      makeFirestoreDocPath(
        env,
        `/schools/${schoolId}/clubs/${clubId}/elections/__settings__`,
      ),
      "GET"
    );
    return parseFirestoreObject(settingsDoc.fields) as unknown as ClubElectionSettings;
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Elections are not currently configured",
      });
    }
    throw error;
  }
}

export async function getClubAttendanceThresholds(
  env: Env,
  firestoreToken: string,
  schoolId: string,
  clubId: string
) {
  const clubDoc = await authedJsonRequest<FirestoreRestDocument>(
    null,
    firestoreToken,
    makeFirestoreDocPath(
      env,
      `/schools/${schoolId}/clubs/${clubId}?mask.fieldPaths=attendanceRequirements`,
    ),
    "GET"
  );
  const parsed = parseFirestoreObject(clubDoc.fields) as Pick<Club, "attendanceRequirements">;
  if (!parsed.attendanceRequirements) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Club attendance requirements are missing",
    });
  }
  return parsed.attendanceRequirements;
}

/** Get the attendance percentage for a member */
async function getAttendancePercentage(
  env: Env,
  firestoreToken: string,
  schoolId: string,
  clubId: string,
  email: string
) {
  // Count present
  const presentQuery = await authedJsonRequest<AggregationQueryResponse>(
    {
      structuredAggregationQuery: {
        aggregations: [{ count: {}, alias: "numPresent" }],
        structuredQuery: {
          from: [{ collectionId: "meeting_attendance" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "membersPresent" },
              op: "ARRAY_CONTAINS",
              value: { stringValue: email },
            },
          },
        },
      },
    },
    firestoreToken,
    makeFirestoreDocPath(env, `/schools/${schoolId}/clubs/${clubId}:runAggregationQuery`)
  );
  
  // Count total
  const totalQuery = await authedJsonRequest<AggregationQueryResponse>(
    {
      structuredAggregationQuery: {
        aggregations: [{ count: {}, alias: "numTotal" }],
        structuredQuery: {
          from: [{ collectionId: "meetings" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "startTime" },
              op: "LESS_THAN_OR_EQUAL",
              value: { timestampValue: new Date().toISOString() },
            },
          },
        },
      },
    },
    firestoreToken,
    makeFirestoreDocPath(env, `/schools/${schoolId}/clubs/${clubId}:runAggregationQuery`)
  );

  const attended = parseAggregationCount(presentQuery, "numPresent");
  const total = parseAggregationCount(totalQuery, "numTotal");
  const percentage = total === 0 ? 100 : (attended / total) * 100;
  return { attended, total, percentage };
}

/*** Ensure a member meets an attendance requirement for a club */
export async function ensureAttendanceRequirement(
  env: Env,
  firestoreToken: string,
  schoolId: string,
  clubId: string,
  email: string,
  requirement: "memberPercentage" | "officerPercentage",
  context: "applications" | "voting"
) {
  const thresholds = await getClubAttendanceThresholds(env, firestoreToken, schoolId, clubId);
  const attendance = await getAttendancePercentage(env, firestoreToken, schoolId, clubId, email);
  if (attendance.percentage < thresholds[requirement]) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `Attendance requirement not met for ${context} (${thresholds[requirement]}%)`,
    });
  }
  return { attendance, requiredPercentage: thresholds[requirement] };
}
