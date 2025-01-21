import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, getIdentityToolkitUrl, getUserFromReq, makeServiceAccountToken } from "../../firebase";
import { ClubSignupType, Env, FirestoreFieldObject, FirestoreRestDocument, OfficerPermission, UserJwtPayload } from "../../types";
import { authedJsonRequest, jsonResponse } from "../../utils";
import { parseFirestoreObject } from "../../utils";
import { updateUserRoles } from "../../firebase";
import { makeFirestoreField } from "../../utils";

const AddRemoveMemberReq = z.object({
  clubId: z.string(),
  // if this is present, an officer is adding/removing a member
  memberEmail: z.optional(z.string().email())
});

export const onRequestPost: PagesFunction<Env> = async ctx => {
  try {
    const user = await getUserFromReq(ctx.env, caches.default, ctx.request);

    if (!user.email_verified) {
      return jsonResponse(403, {
        error: "Email not verified"
      });
    }

    // validate request body
    const body = await ctx.request.json();
    const parsed = AddRemoveMemberReq.safeParse(body);

    // validate request body
    if (parsed.error) {
      return jsonResponse(400, {
        error: parsed.error.message
      });
    }

    const token = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE, AUTH_SCOPE]);

    let userId: string;
    let userEmail: string;
    let userAttrs: UserJwtPayload;

    if (parsed.data.memberEmail) {
      // ensure they have permissions to modify members
      if (!(user.officerOf[parsed.data.clubId] & OfficerPermission.Members)) {
        return jsonResponse(401, {
          error: "You do not have permissions to manage this club's members"
        });
      }

      const memberDetails = await authedJsonRequest<{
        users: {
          localId: string,
          customAttributes: UserJwtPayload,
        }[]
      }>({
        email: parsed.data.memberEmail
      }, token, `${getIdentityToolkitUrl(ctx.env)}/projects/ww-club-hub/accounts:lookup`);

      const userDetails = memberDetails.users[0];
      // make sure the user exists and they are part of this school
      if (!userDetails || userDetails.customAttributes.school !== user.school) {
        return jsonResponse(400, {
          error: "This user does not exist"
        });
      }

      userId = userDetails.localId;
      userEmail = parsed.data.memberEmail;
      userAttrs = userDetails.customAttributes;
    } else {
      const queryResponse = await authedJsonRequest(
        null,
        token,
        `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents/schools/${user.school}/clubs/${parsed.data.clubId}?fieldMask=signup`,
        "GET"
      ) as FirestoreRestDocument;

      const doc = parseFirestoreObject(queryResponse.fields);
      // make sure signup is open
      if ((doc.signup as FirestoreFieldObject).type !== ClubSignupType.Open) {
        return jsonResponse(401, {
          error: "You must apply to join this club"
        });
      }

      userId = user.user_id;
      userAttrs = user;
      userEmail = user.email;
    }

    // don't re-add existing members
    if (userAttrs.memberOf?.includes(parsed.data.clubId)) {
      return jsonResponse(400, {
        error: "User is already a member of this club"
      });
    }
    if (!userAttrs.memberOf) userAttrs.memberOf = [];
    userAttrs.memberOf.push(parsed.data.clubId);

    // update roles
    await updateUserRoles(ctx.env, token, userId, userAttrs, {
      memberOf: userAttrs.memberOf
    });

    // update the doc member list
    await authedJsonRequest(
      {
        writes: [{
          transform: {
            document: `projects/ww-club-hub/databases/(default)/documents/schools/${user.school}/clubs_private/${parsed.data.clubId}`,
            fieldTransforms: [{
              fieldPath: "members",
              appendMissingElements: makeFirestoreField([userEmail]).arrayValue
            }]
          }
        }]
      },
      token,
      `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents:batchWrite`
    );
    
    return jsonResponse(200, {
      success: true
    });
  } catch (err) {
    console.error(err);
    return jsonResponse(403, {
      error: err.message
    });
  }
};
