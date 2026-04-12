import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ClubElectionApplicationStatus, type ClubElectionApplication } from "../../../types";
import { authedJsonRequest, authedProcedure, RequestError } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken } from "../../../firebase";
import {
  ensureAttendanceRequirement,
  ensureElectionWindowOpen,
  ensureMemberAccess,
  getElectionSettings,
} from "./helpers";

const CreateElectionApplicationReq = z.object({
  clubId: z.string()
});

export default authedProcedure
  .input(CreateElectionApplicationReq)
  .mutation(async ({ ctx, input }) => {
    ensureMemberAccess(ctx.user, input.clubId);
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const school = ctx.user.school;
    const email = ctx.user.email;

    const settings = await getElectionSettings(ctx.env, firestoreToken, school, input.clubId);
    ensureElectionWindowOpen(settings);

    await ensureAttendanceRequirement(
      ctx.env,
      firestoreToken,
      school,
      input.clubId,
      email,
      "officerPercentage",
      "applications"
    );

    const applicationDocPath = makeFirestoreDocPath(
      ctx.env,
      `/schools/${school}/clubs/${input.clubId}/elections/${email}`
    );
    
    // Create the application with precondition that it doesn't already exist
    try {
      await authedJsonRequest(
        makeFirestoreField({
          status: ClubElectionApplicationStatus.Draft,
          roles: [],
          responses: {}
        }).mapValue,
        firestoreToken,
        `${applicationDocPath}?currentDocument.exists=false`,
        "PATCH"
      );
    } catch (error) {
      // Precondition failed: document already exists
      if (error instanceof RequestError && error.response.status === 412) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Application already exists",
        });
      }
      throw error;
    }

    return { success: true };
  });
