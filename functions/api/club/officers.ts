import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, makeFirestoreDocPath, getIdentityToolkitUrl, makeServiceAccountToken, updateUserRoles, parseFirestoreObject, makeFirestoreField } from "../../firebase";
import { FirestoreRestDocument, OfficerPermission, UserClaims } from "../../types";
import { authedJsonRequest, authedProcedure, checkOfficerPermission } from "../../utils";
import { TRPCError } from "@trpc/server";

const UpdateOfficersReq = z.object({
  clubId: z.string(),
  officers: z.record(z.email(), z.object({
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

    // Ensure at least one officer has the Officers permission
    const hasOfficerWithPermission = Object.values(input.officers).some(
      officer => (officer.permissions & OfficerPermission.Officers) !== 0
    );
    if (!hasOfficerWithPermission) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "At least one officer must have the Officers permission."
      });
    }

    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const queryResponse = await authedJsonRequest(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}?mask.fieldPaths=name&mask.fieldPaths=officers`),
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
    }, authToken, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

    await Promise.all(allOfficerEmails.map(async email => {
      const userDetails = officerUsers.users.find(u => u.email === email);
      // if the user doesn't exist, or if they're int he wrong school, remove from officer list
      const attrs = (JSON.parse(userDetails?.customAttributes!) ?? null) as UserClaims | null;
      // they also need to be a member of the club
      if (attrs?.school !== ctx.user.school || !attrs.memberOf.includes(input.clubId)) {
        console.warn(`Removing officer ${email} because they are either not a member of the club or the school`);
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
      await updateUserRoles(ctx.env, authToken, userDetails!.localId, attrs, {
        officerOf: attrs.officerOf
      });
    }));

    // update the doc officer list
    await authedJsonRequest(
      makeFirestoreField({
        officers: input.officers
      }).mapValue,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}?updateMask.fieldPaths=officers`),
      "PATCH"
    );

    return {
      success: true
    };
  });
