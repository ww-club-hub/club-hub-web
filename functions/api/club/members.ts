import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, getIdentityToolkitUrl, makeServiceAccountToken, parseFirestoreObject, makeFirestoreField, updateUserRoles } from "../../firebase";
import { ClubSignupType, FirestoreFieldObject, FirestoreRestDocument, OfficerPermission, UserClaims } from "../../types";
import { authedJsonRequest, authedProcedure, checkOfficerPermission } from "../../utils";
import { TRPCError } from "@trpc/server";

const AddRemoveMemberReq = z.object({
  clubId: z.string(),
  // if this is present, an officer is adding/removing a member
  memberEmail: z.optional(z.string().email())
});

export default authedProcedure
  .input(AddRemoveMemberReq)
  .mutation(async ({ ctx, input }) => {
    const token = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE, AUTH_SCOPE]);

    let userId: string;
    let userEmail: string;
    let userAttrs: UserClaims;

    // officer adding a member to their club
    if (input.memberEmail) {
      // ensure they have permissions to modify members
      if (!checkOfficerPermission(ctx.user, input.clubId, OfficerPermission.Members)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permissions to manage this club's members"
        });
      }

      // fetch more info about this user
      const memberDetails = await authedJsonRequest<{
        users: {
          localId: string,
          customAttributes: string,
        }[]
      }>({
        email: input.memberEmail
      }, token, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

      const userDetails = memberDetails.users[0];
      const attrs = JSON.parse(userDetails?.customAttributes) ?? null;
      // make sure the user exists and they are part of this school
      if (attrs?.school !== ctx.user.school) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This user does not exist"
        });
      }

      userId = userDetails.localId;
      userEmail = input.memberEmail;
      userAttrs = attrs;
    } else {
      // member adding themselves to a club
      const queryResponse = await authedJsonRequest(
        null,
        token,
        `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}/clubs/${input.clubId}?fieldMask=signup`,
        "GET"
      ) as FirestoreRestDocument;

      const doc = parseFirestoreObject(queryResponse.fields);
      // make sure signup is open
      if ((doc.signup as FirestoreFieldObject).type !== ClubSignupType.Open) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must apply to join this club"
        });
      }

      userId = ctx.user.user_id;
      userAttrs = ctx.user;
      userEmail = ctx.user.email;
    }

    // don't re-add existing members
    if (userAttrs.memberOf?.includes(input.clubId)) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "User is already a member of this club"
      });
    }
    // update user roles
    if (!userAttrs.memberOf) userAttrs.memberOf = [];
    userAttrs.memberOf.push(input.clubId);
    await updateUserRoles(ctx.env, token, userId, userAttrs, {
      memberOf: userAttrs.memberOf
    });

    // update the doc member list
    await authedJsonRequest(
      {
        writes: [{
          transform: {
            document: `projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${ctx.user.school}/clubs_private/${input.clubId}`,
            fieldTransforms: [{
              fieldPath: "members",
              appendMissingElements: makeFirestoreField([userEmail]).arrayValue
            }]
          }
        }]
      },
      token,
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:batchWrite`
    );

    return {
      success: true
    };
  });
