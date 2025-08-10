import { z } from "zod";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import { ClubMeetingAttendance, FirestoreRestDocument } from "../../../types";
const QueryAttendanceReq = z.object({
  meetings: z.array(z.object({
    id: z.string(),
    clubId: z.string()
  }))
});

export default authedProcedure
  .input(QueryAttendanceReq)
  .query(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const userEmail = ctx.user.email;
    const school = ctx.user.school;

    // Check membership for all meetings' clubs
    const notMember = input.meetings
      .map(m => m.clubId)
      .some(clubId => !ctx.user.memberOf?.includes(clubId));
    if (notMember) {
      throw new Error("You are not a member of one or more clubs in the request");
    }

    // Build document paths for batchGet
    const docPaths = input.meetings.map(meeting =>
      makeFirestoreDocPath(
        ctx.env,
        `/schools/${school}/clubs/${meeting.clubId}/meeting_attendance/${meeting.id}`,
        false
      )
    );

    // Fetch attendance of all meetings at once
    const batchGetResp = await authedJsonRequest(
      {
        documents: docPaths,
        mask: {
          fieldPaths: ["membersPresent"]
        }
      },
      firestoreToken,
      makeFirestoreDocPath(ctx.env, ":batchGet")
    ) as {
      found?: FirestoreRestDocument,
      missing?: string
    }[];

    // Find meetings where user is present
    const presentMeetings: string[] = [];
    batchGetResp.forEach((result, idx) => {
      if (result.found) {
        const doc = parseFirestoreObject(result.found.fields) as unknown as ClubMeetingAttendance;
        const meetingId = input.meetings[idx].id;
        if (doc.membersPresent && doc.membersPresent.includes(userEmail)) {
          presentMeetings.push(meetingId);
        }
      }
      // ignore missing docs
    });

    return {
      presentMeetings
    };
  });
