import { makeServiceAccountToken, FIRESTORE_SCOPE, AUTH_SCOPE, makeFirestoreDocPath, parseFirestoreObject, getFirestoreDocId, lookupUser } from "../../../firebase";
import { OfficerPermission, ClubMeetingAttendance, type ClubMeeting } from "../../../types";
import { authedJsonRequest, officerProcedure } from "../../../utils";
import z from "zod";

const ClubExportReq = z.object({
  clubId: z.string(),
  startDate: z.number().optional(),
  endDate: z.number().optional()
});

interface AttendanceRecord {
  name: string;
  email: string;
  meetingTime: string; // ISO 8601 format
  code: string;
  room: string;
}

// Convert Firebase Timestamp (seconds) to ISO 8601 string
function timestampToISO8601(seconds: number): string {
  return new Date(seconds * 1000).toISOString();
}

export default officerProcedure(OfficerPermission.Meetings)
  .input(ClubExportReq)
  .query(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const school = ctx.user.school;

    // Fetch all meetings for the club
    const meetingsQueryResp = await authedJsonRequest<{
      document: Array<{
        name: string;
        fields: {
          startTime?: { integerValue: string };
          location?: { stringValue: string };
        };
      }>;
    }>(
      {
        structuredQuery: {
          from: [{ collectionId: "meetings" }],
          select: {
            fields: [
              { fieldPath: "startTime" },
              { fieldPath: "location" }
            ]
          }
        }
      },
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${school}/clubs/${input.clubId}/meetings:runQuery`),
    );

    // Create a map of meeting ID -> { startTime (seconds), location/room }
    const meetingsMap = new Map<string, { startTime: number; room: string }>();
    for (const doc of (meetingsQueryResp.document || [])) {
      const parsed = parseFirestoreObject(doc.fields) as any;
      const startTimeSeconds = parsed.startTime || 0;
      const room = parsed.location || "Unknown";
      
      const meetingId = getFirestoreDocId(doc);
      
      // Filter by date range if provided
      if (input.startDate && startTimeSeconds * 1000 < input.startDate) continue;
      if (input.endDate && startTimeSeconds * 1000 > input.endDate) continue;
      
      meetingsMap.set(meetingId, { startTime: startTimeSeconds, room });
    }

    // Fetch all meeting attendance records for the club
    const attendanceQueryResp = await authedJsonRequest<{
      document: Array<{
        name: string;
        fields: {
          membersPresent?: { arrayValue?: { values?: Array<{ stringValue: string }> } };
          code?: { stringValue: string };
        };
      }>;
    }>(
      {
        structuredQuery: {
          from: [{ collectionId: "meeting_attendance" }],
          select: {
            fields: [
              { fieldPath: "membersPresent" },
              { fieldPath: "code" }
            ]
          }
        }
      },
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${school}/clubs/${input.clubId}/meeting_attendance:runQuery`),
    );

    // Filter attendance records to only include meetings in the date range
    const attendanceRecords = (attendanceQueryResp.document || [])
      .filter(doc => {
        const attendanceId = getFirestoreDocId(doc);
        return meetingsMap.has(attendanceId);
      })
      .filter(doc => {
        const parsed = parseFirestoreObject(doc.fields) as any;
        const membersPresent = parsed.membersPresent || [];
        return membersPresent.length > 0;
      });

    // Collect all unique emails from filtered attendance records
    const uniqueEmails = new Set<string>();
    for (const record of attendanceRecords) {
      const parsed = parseFirestoreObject(record.fields) as any;
      const members = parsed.membersPresent || [];
      for (const member of members) {
        if (member) {
          uniqueEmails.add(member);
        }
      }
    }

    // Fetch all unique profiles
    const profiles = new Map<string, { name: string; email: string }>();
    for (const email of uniqueEmails) {
      try {
        const user = await lookupUser(email, authToken, ctx.env);
        if (user) {
          profiles.set(email, {
            name: user.displayName || email,
            email: user.email
          });
        } else {
          // If lookup returns null, use email as name
          profiles.set(email, {
            name: email,
            email: email
          });
        }
      } catch {
        // If lookup fails, use email as name
        profiles.set(email, {
          name: email,
          email: email
        });
      }
    }

    // Build attendance records with meeting info
    const records: AttendanceRecord[] = [];
    for (const attendance of attendanceRecords) {
      const attendanceId = getFirestoreDocId(attendance);
      const meetingData = meetingsMap.get(attendanceId);
      if (!meetingData) continue;

      const parsed = parseFirestoreObject(attendance.fields) as any;
      const code = parsed.code || "";
      const members = parsed.membersPresent || [];

      for (const email of members) {
        if (email && profiles.has(email)) {
          const profile = profiles.get(email)!;
          records.push({
            name: profile.name,
            email: profile.email,
            meetingTime: timestampToISO8601(meetingData.startTime),
            code,
            room: meetingData.room
          });
        }
      }
    }

    return { records };
  });
