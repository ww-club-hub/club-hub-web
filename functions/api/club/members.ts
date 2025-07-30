import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, getIdentityToolkitUrl, makeServiceAccountToken, parseFirestoreObject, makeFirestoreField, updateUserRoles, lookupUser, getUserAttributes, makeFirestoreDocPath } from "../../firebase";
import { BeginTransactionResponse, Club, ClubSignupType, FirestoreFieldObject, FirestoreRestDocument, OfficerPermission, RawFirestoreFieldObject, UserClaims } from "../../types";
import { authedJsonRequest, authedProcedure, checkOfficerPermission } from "../../utils";
import { TRPCError } from "@trpc/server";

const AddRemoveMemberReq = z.object({
  clubId: z.string(),
  // if this is present, an officer is adding/removing a member
  memberEmail: z.optional(z.string().email()),
  removeMember: z.optional(z.boolean())
});

export default authedProcedure
  .input(AddRemoveMemberReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

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
      const userDetails = await lookupUser(input.memberEmail, authToken, ctx.env);

      const attrs = getUserAttributes(userDetails);
      // make sure the user exists and they are part of this school
      if (!userDetails || attrs?.school !== ctx.user.school) {
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
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}?mask.fieldPaths=signup`),
        "GET"
      ) as FirestoreRestDocument;

      const doc = parseFirestoreObject(queryResponse.fields);
      // make sure signup is open if they are joining
      if ((doc.signup as FirestoreFieldObject).type !== ClubSignupType.Open && !input.removeMember) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must apply to join this club"
        });
      }

      userId = ctx.user.user_id;
      userAttrs = ctx.user;
      userEmail = ctx.user.email;
    }

    if (input.removeMember) {
      // don't remove non members
      if (!userAttrs.memberOf?.includes(input.clubId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not a member of this club"
        });
      }

      // update user roles
      userAttrs.memberOf.splice(userAttrs.memberOf.indexOf(input.clubId), 1);

      const { transaction } = await authedJsonRequest<BeginTransactionResponse>(
        {},
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `:beginTransaction`)
      );

      // fields to update in the club doc
      let updateFields: RawFirestoreFieldObject = {};

      // this user is an officer, so extra steps need to be taken
      if (input.clubId in userAttrs.officerOf) {
        // remove officer role
        delete userAttrs.officerOf[input.clubId];

        // fetch club officers
        const { officers } = await authedJsonRequest<FirestoreRestDocument>(
          null,
          firestoreToken,
          makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}?mask.fieldPaths=name&mask.fieldPaths=officers&transaction=${transaction}`),
          "GET"
        ).then(r => parseFirestoreObject(r.fields) as Pick<Club, "officers">);
        // remove officer from club
        delete officers[userEmail];
        updateFields.officers = makeFirestoreField(officers);
      }

      // commit update to user roles
      await updateUserRoles(ctx.env, authToken, userId, userAttrs, {
        memberOf: userAttrs.memberOf,
        officerOf: userAttrs.officerOf
      });

      // update club doc - numMembers + officers? and clubs_private - just members
      await authedJsonRequest(
        {
          writes: [
            {
              update: {
                name: makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}`, false),
                fields: updateFields
              },
              updateTransforms: [{
                fieldPath: "numMembers",
                increment: makeFirestoreField(-1)
              }]
            },
            {
              transform: {
                document: makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs_private/${input.clubId}`, false),
                fieldTransforms: [{
                  fieldPath: "members",
                  removeAllFromArray: makeFirestoreField([userEmail]).arrayValue
                }]
              }
            },
          ],
          // commit transaction
          transaction
        },
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `:commit`)
      );
    } else {
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
      await updateUserRoles(ctx.env, authToken, userId, userAttrs, {
        memberOf: userAttrs.memberOf
      });

      // update the doc member list
      await authedJsonRequest(
        {
          writes: [
            {
              transform: {
                document: makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs_private/${input.clubId}`, false),
                fieldTransforms: [{
                  fieldPath: "members",
                  appendMissingElements: makeFirestoreField([userEmail]).arrayValue
                }]
              }
            },
            {
              transform: {
                document: makeFirestoreDocPath(ctx.env, `/schools/${ctx.user.school}/clubs/${input.clubId}`, false),
                fieldTransforms: [{
                  fieldPath: "numMembers",
                  increment: makeFirestoreField(1)
                }]
              }
            }
          ]
        },
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `:commit`)
      );

      return {
        success: true
      };
    }
  });
