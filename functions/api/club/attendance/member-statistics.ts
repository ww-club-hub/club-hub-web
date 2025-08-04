import { TRPCError } from "@trpc/server";
import { makeServiceAccountToken, FIRESTORE_SCOPE, makeFirestoreDocPath } from "../../../firebase";
import { AggregationQueryResponse, FirestoreRestDocument, OfficerPermission, QueryResponse } from "../../../types";
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

    // count documents that contain this user present
    const presentQueryResponse = await authedJsonRequest(
      {
        structuredAggregationQuery: {
          aggregations: [
            {
              count: {},
              alias: "numPresent"
            }
          ],
          structuredQuery: {
            from: [{
              collectionId: `schools/${ctx.user.school}/clubs/${input.clubId}/meeting_attendance`
            }],
            where: {
              fieldFilter: {
                field: { fieldPath: "membersPresent" },
                op: "ARRAY_CONTAINS",
                value: { stringValue: ctx.user.email }
              }
            }
          }
        }
      },
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `:runAggregationQuery`)
    ) as AggregationQueryResponse;

    // count all documents
    const allQueryResponse = await authedJsonRequest(
      {
        structuredAggregationQuery: {
          aggregations: [
            {
              count: {},
              alias: "numTotal"
            }
          ],
          structuredQuery: {
            from: [{
              collectionId: `schools/${ctx.user.school}/clubs/${input.clubId}/meetings`
            }],
            where: {
              fieldFilter: {
                field: { fieldPath: "startTime" },
                op: "LESS_THAN_OR_EQUAL",
                value: { timestampValue: new Date().toISOString() }
              }
            }
          }
        }
      },
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `:runAggregationQuery`)
    ) as AggregationQueryResponse;

    // Extract numPresent from presentQueryResponse
    let numPresent = 0;
    const numPresentValue = presentQueryResponse[0]?.result?.aggregateFields?.numPresent?.integerValue;
    if (numPresentValue) {
      numPresent = parseInt(numPresentValue);
    }

    // Extract numMeetings from allQueryResponse
    let numMeetings = 0;
    const numMeetingsValue = allQueryResponse[0]?.result?.aggregateFields?.numTotal?.integerValue;
    if (numMeetingsValue) {
      numMeetings = parseInt(numMeetingsValue);
    }

    // update the cached member statistics

    return {
      total: numMeetings,
      attended: numPresent
    };
  });
