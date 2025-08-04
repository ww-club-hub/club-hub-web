import { z } from "zod";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import { ClubMeetingAttendance, FirestoreRestDocument } from "../../../types";
import { TRPCError } from "@trpc/server";

const TakeAttendanceReq = z.object({
  clubId: z.string(),
  meetingId: z.string(),
  code: z.string()
});

export default authedProcedure
  .input(TakeAttendanceReq)
  .mutation(async ({ ctx, input }) => {
    if (!ctx.user.memberOf?.includes(input.clubId)) {
      throw new Error("User is not a member of this club.");
    }

    // TODO: global take attendance without club id/meeting id

    // fetch the meeting attendance document
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE)
    const attendanceDocPath = makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}/meeting_attendance/${input.meetingId}`);
    const attendanceDocResp = await authedJsonRequest<FirestoreRestDocument>(
      null,
      firestoreToken,
      attendanceDocPath,
      "GET"
    );
    const doc = parseFirestoreObject(attendanceDocResp.fields) as unknown as ClubMeetingAttendance;

    // validate code
    if (doc.code !== input.code) {
      throw new TRPCError({
        message: "Invalid attendance code",
        code: "UNAUTHORIZED"
      });
    }

    if (doc.membersPresent.includes(ctx.user.email)) {
      throw new TRPCError({
        message: "Attendance already taken",
        code: "CONFLICT"
      });
    }

    // update the membersPresent array
    const batchWriteBody = {
      writes: [
        {
          transform: {
            document: attendanceDocResp.name,
            fieldTransforms: [{
              fieldPath: "membersPresent",
              appendMissingElements: {
                values: [{ stringValue: ctx.user.email }]
              }
            }]
          }
        },
        {
          transform: {
            document: makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs_private/${input.clubId}`),
            fieldTransforms: [{
              fieldPath: "totalAttendance",
              increment: makeFirestoreField(1)
            }]
          }
        }
      ]
    };
    await authedJsonRequest(
      batchWriteBody,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `:ommit`)
    );

    return { success: true };
  });
