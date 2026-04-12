import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ClubElectionApplicationStatus, type ClubElectionApplication, type FirestoreRestDocument } from "../../../types";
import { authedJsonRequest, authedProcedure, isNotFoundError } from "../../../utils";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import {
  ensureAttendanceRequirement,
  ensureElectionWindowOpen,
  ensureMemberAccess,
  ensureRolesValid,
  getElectionSettings,
} from "./helpers";

const SubmitElectionApplicationReq = z.object({
  clubId: z.string(),
});

export default authedProcedure
  .input(SubmitElectionApplicationReq)
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
      `/schools/${school}/clubs/${input.clubId}/elections/${email}?mask.fieldPaths=roles`
    );
    
    // Make sure the roles they selected are valid
    try {
      const existingDoc = await authedJsonRequest<FirestoreRestDocument>(
        null,
        firestoreToken,
        `${applicationDocPath}?mask.fieldPaths=roles`,
        "GET"
      );
      const application = parseFirestoreObject(existingDoc.fields) as Pick<ClubElectionApplication, "roles">;
      ensureRolesValid(application.roles ?? [], settings);
    } catch (error) {
      if (isNotFoundError(error)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No election application exists yet" });
      }
      throw error;
    }

    await authedJsonRequest(
      makeFirestoreField({
        status: ClubElectionApplicationStatus.Submitted
      }).mapValue,
      firestoreToken,
      `${applicationDocPath}?updateMask.fieldPaths=status`,
      "PATCH"
    );

    return { success: true };
  });
