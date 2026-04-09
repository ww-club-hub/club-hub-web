import { makeServiceAccountToken, FIRESTORE_SCOPE, AUTH_SCOPE, makeFirestoreDocPath, parseFirestoreObject, getFirestoreDocId, lookupUser, lookupUsers } from "../../../firebase";
import { OfficerPermission, type ClubMeetingAttendance, type ClubMeeting, FirestoreRestDocument } from "../../../types";
import { authedJsonRequest, officerProcedure } from "../../../utils";
import z from "zod";

const ClubExportReq = z.object({
  clubId: z.string(),
  startDate: z.date().optional(),
  endDate: z.date().optional()
});

// Individual record stating a member was present at a meeting
interface AttendanceRecord {
  name: string;
  email: string;
  meetingTime: number;
  code: string;
  location: string;
}

export default officerProcedure(OfficerPermission.Meetings)
  .input(ClubExportReq)
  .query(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const school = ctx.user.school;

    // Fetch all meetings for the club
    const meetingsQueryResp = await authedJsonRequest<{
      documents: FirestoreRestDocument[],
    }>(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${school}/clubs/${input.clubId}/meetings?mask.fieldPaths=startTime&mask.fieldPaths=location`),
      "GET"
    );

    // Create a map of meeting ID -> { startTime (seconds), location/room }
    const meetingsMap = new Map<string, { startTime: Date; location: string }>();
    for (const doc of meetingsQueryResp.documents) {
      const parsed = parseFirestoreObject(doc.fields) as { location: string; startTime: Date; };
      const meetingId = getFirestoreDocId(doc);

      // Filter by date range if provided
      if (input.startDate && parsed.startTime < input.startDate) continue;
      if (input.endDate && parsed.startTime > input.endDate) continue;

      meetingsMap.set(meetingId, { startTime: parsed.startTime, location: parsed.location });
    }

    // Fetch all meeting attendance records for the club
    const attendanceQueryResp = await authedJsonRequest<{
      documents: FirestoreRestDocument[],
    }>(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${school}/clubs/${input.clubId}/meeting_attendance?mask.fieldPaths=code&mask.fieldPaths=membersPresent`),
      "GET"
    );

    // Filter attendance records to only include meetings in the date range
    const attendanceRecords = attendanceQueryResp.documents
      .map(doc => ({
        id: getFirestoreDocId(doc),
        ...parseFirestoreObject(doc.fields) as { code: string; membersPresent: string[] }
      }))
      .filter(doc => {
        return meetingsMap.has(doc.id) && doc.membersPresent?.length > 0
      });

    // Get all unique emails
    const uniqueEmails = new Set(attendanceRecords.flatMap(r => r.membersPresent ?? []));

    // Fetch all unique profiles
    const rawProfiles = await lookupUsers([...uniqueEmails], authToken, ctx.env);
    // map email to name for lookup
    const userNames = new Map(rawProfiles.map(p => [p.email, p.displayName]));

    // Build attendance records with meeting info
    const records: AttendanceRecord[] = [];
    for (const { code, membersPresent, id } of attendanceRecords) {
      const meetingData = meetingsMap.get(id);
      if (!meetingData) continue;

      for (const email of membersPresent) {
        const name = userNames.get(email) ?? "Unknown name";
        records.push({
          name: name,
          email: email,
          meetingTime: meetingData.startTime.getTime(),
          code,
          location: meetingData.location
        });
      }
    }

    // Sort records by meetingTime
    records.sort((a, b) => a.meetingTime - b.meetingTime);

    return { records };
  });
