import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, getIdentityToolkitUrl, makeServiceAccountToken, updateUserRoles, parseFirestoreObject, makeFirestoreField } from "../../firebase";
import { FirestoreRestDocument, OfficerPermission } from "../../types";
import { authedJsonRequest, authedProcedure, checkOfficerPermission } from "../../utils";
import { TRPCError } from "@trpc/server";

const UpdateOfficersReq = z.object({
  clubId: z.string(),
  officers: z.record(z.string().email(), z.object({
    name: z.string(),
    role: z.string(),
    // bitmask
    permissions: z.number()
  }))
});

export default authedProcedure
  .input(UpdateOfficersReq)
  .mutation(async ({ ctx, input }) => {
    // ensure they have permissions to modify officers
    if (!checkOfficerPermission(ctx.user, input.clubId, OfficerPermission.Officers)) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not have permissions to manage this club's officers"
      });
    }

    const token = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE, AUTH_SCOPE]);

    const queryResponse = await authedJsonRequest(
      null,
      token,
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}/clubs/${input.clubId}?fieldMask=officers`,
      "GET"
    ) as FirestoreRestDocument;

    const doc = parseFirestoreObject(queryResponse.fields);

    // get a list of all officers
    const allOfficerEmails = [...Object.keys(doc.officers || {}), ...Object.keys(input.officers || {})];

    // fetch all officer details
    const officerUsers = await authedJsonRequest<{
      users: {
        localId: string,
        email: string,
        customAttributes: string,
      }[]
    }>({
      email: allOfficerEmails
    }, token, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

    await Promise.all(allOfficerEmails.map(async email => {
      const userDetails = officerUsers.users.find(u => u.email === email);
      // if the user doesn't exist, or if they're int he wrong school, remove from officer list
      const attrs = JSON.parse(userDetails?.customAttributes!) ?? null;
      if (attrs?.school !== ctx.user.school) {
        delete input.officers[email];
        return;
      }
      if (email in input.officers) {
        if (!attrs.officerOf)
          attrs.officerOf = {};

        // set permissions
        attrs.officerOf[input.clubId] = input.officers[email].permissions;
      } else {
        // remove officer permissions
        if (attrs.officerOf) {
          delete attrs.officerOf[input.clubId];
        }
      }
      // update roles
      await updateUserRoles(ctx.env, token, userDetails!.localId, attrs, {
        officerOf: attrs.officerOf
      });
    }));

    // update the doc officer list
    await authedJsonRequest(
      makeFirestoreField({
        officers: input.officers
      }).mapValue,
      token,
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}/clubs/${input.clubId}?updateMask=officers`,
      "PATCH"
    );

    return {
      success: true
    };
  });
