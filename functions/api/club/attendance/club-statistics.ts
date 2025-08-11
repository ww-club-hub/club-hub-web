import { TRPCError } from "@trpc/server";
import { makeServiceAccountToken, FIRESTORE_SCOPE, makeFirestoreDocPath } from "../../../firebase";
import { AggregationQueryResponse, FirestoreRestDocument, OfficerPermission, QueryResponse } from "../../../types";
import { authedProcedure } from "../../../utils";
import { z } from "zod";

const ClubStatsReq = z.object({
  clubId: z.string()
});

export default authedProcedure
  .input(ClubStatsReq)
  .query(async ({ ctx, input }) => {
    // make sure the officer has the meetings permission
    if (!(input.clubId in ctx.user.officerOf && (ctx.user.officerOf[input.clubId] & OfficerPermission.Meetings) > 0)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only club officers may view attendance statistics"
      })
    }

    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // TODO: figure out what needs to be done here (update cache for oudated member statistics?)

    return {};
  });
