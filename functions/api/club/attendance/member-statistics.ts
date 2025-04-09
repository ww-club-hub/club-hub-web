import { TRPCError } from "@trpc/server";
import {  makeServiceAccountToken, FIRESTORE_SCOPE, getFirestoreUrl, getFirestoreDocId, parseFirestoreObject, parseFirestoreField } from "../../../firebase";
import { FirestoreRestDocument, OfficerPermission, QueryResponse } from "../../../types";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { z } from "zod";

const MemberStatsReq = z.object({
  clubId: z.string(),
  memberId: z.optional(z.string())
});

export default authedProcedure
  .input(MemberStatsReq)
  .query(async ({ ctx, input }) => {
    let memberId = ctx.user.user_id;

    if (input.memberId) {
      // only club officers with the member permission can view stats for other members

      if (input.clubId in ctx.user.officerOf && (ctx.user.officerOf[input.clubId] & OfficerPermission.Meetings) > 0) {
        memberId = input.memberId;
      } else {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only club officers may view attendance statistics"
        })
      }
    }

    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    const queryResponse = await authedJsonRequest(
      {
        structuredQuery: {
          select: {
            fields: [
              {
                fieldPath: "membersPresent"
              },
              {
                fieldPath: "__name__"
              }
            ]
          },
          from: [{
            collectionId: `schools/${ctx.user.school}/clubs/${input.clubId}/meeting_attendance`
          }],
        }
      },
      firestoreToken,
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:runQuery`
    ) as QueryResponse;

    const docs = queryResponse.filter(el => el.document).map(el => parseFirestoreObject(el.document!.fields));

    const numPresent = docs.filter(el => memberId in (el.membersPresent as Record<string, string>)).length;

    return {
      numMeetings: docs.length,
      numPresent
    };
  });
