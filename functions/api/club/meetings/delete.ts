import { z } from "zod";
import { OfficerPermission } from "../../../types";
import { authedJsonRequest, officerProcedure } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import type { FirestoreRestDocument, ClubMeetingAttendance } from "../../../types";

const DeleteMeetingReq = z.object({
  clubId: z.string(),
  meetingId: z.string()
});

export default officerProcedure(OfficerPermission.Meetings)
  .input(DeleteMeetingReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // Fetch the meeting_attendance document to get the count of members present
    const attendanceDocPath = makeFirestoreDocPath(
      ctx.env,
      `/schools/${ctx.user.school}/clubs/${input.clubId}/meeting_attendance/${input.meetingId}`
    );
    const attendanceDocResp = await authedJsonRequest<FirestoreRestDocument>(
      null,
      firestoreToken,
      attendanceDocPath,
      "GET"
    );
    
    const attendanceDoc = parseFirestoreObject(attendanceDocResp.fields) as Partial<Pick<ClubMeetingAttendance, "membersPresent" | "membersAttending">>;

    const presentCount = attendanceDoc.membersPresent?.length || 0;

    // Delete meeting, meeting attendance, and decremenet total in one go
    const batchWriteBody = {
      writes: [
        {
          delete: makeFirestoreDocPath(
            ctx.env,
            `/schools/${ctx.user.school}/clubs/${input.clubId}/meetings/${input.meetingId}`,
            false
          )
        },
        {
          delete: attendanceDocResp.name
        },
        ...(presentCount > 0
          ? [
              {
                transform: {
                  document: makeFirestoreDocPath(
                    ctx.env,
                    `/schools/${ctx.user.school}/clubs_private/${input.clubId}`,
                    false
                  ),
                  fieldTransforms: [
                    {
                      fieldPath: "totalAttendance",
                      increment: { integerValue: -presentCount }
                    }
                  ]
                }
              }
            ]
          : [])
      ]
    };

    await authedJsonRequest(
      batchWriteBody,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `:commit`)
    );

    return { success: true };
  });
