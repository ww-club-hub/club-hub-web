import { makeServiceAccountToken, FIRESTORE_SCOPE } from "../../../firebase";
import { OfficerPermission } from "../../../types";
import { officerProcedure } from "../../../utils";
import z from "zod";

const ClubStatsReq = z.object({
  clubId: z.string()
});

export default officerProcedure(OfficerPermission.Meetings)
  .input(ClubStatsReq)
  .query(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // TODO: figure out what needs to be done here (update cache for oudated member statistics?)

    return {};
  });
