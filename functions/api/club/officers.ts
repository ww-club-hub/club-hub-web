import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, getIdentityToolkitUrl, getUserFromReq, makeServiceAccountToken } from "../../firebase";
import { Env, FirestoreRestDocument, OfficerPermission, UserJwtPayload } from "../../types";
import { authedJsonRequest, jsonResponse } from "../../utils";
import { parseFirestoreObject } from "../../utils";
import { updateUserRoles } from "../../firebase";
import { makeFirestoreField } from "../../utils";

const UpdateOfficersReq = z.object({
  clubId: z.string(),
  officers: z.record(z.string().email(), z.object({
    name: z.string(),
    role: z.string(),
    // bitmask
    permissions: z.number()
  }))
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
    const parsed = UpdateOfficersReq.safeParse(body);

    // validate request body
    if (parsed.error) {
      return jsonResponse(400, {
        error: parsed.error.message
      });
    }

    // ensure they have permissions to modify officers
    if (!(user.officerOf[parsed.data.clubId] & OfficerPermission.Officers)) {
      return jsonResponse(401, {
        error: "You do not have permissions to manage this club's officers"
      });
    }

    const token = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE, AUTH_SCOPE]);

    const queryResponse = await authedJsonRequest(
      null,
      token,
      `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents/schools/${user.school}/clubs/${parsed.data.clubId}?fieldMask=officers`,
      "GET"
    ) as FirestoreRestDocument;

    const doc = parseFirestoreObject(queryResponse.fields);

    // get a list of all officers
    const allOfficerEmails = [...Object.keys(doc.officers), ...Object.keys(parsed.data.officers)];

    // fetch all officer details
    const officerUsers = await authedJsonRequest<{
      users: {
        localId: string,
        email: string,
        customAttributes: UserJwtPayload,
      }[]
    }>({
      email: allOfficerEmails
    }, token, `${getIdentityToolkitUrl(ctx.env)}/projects/ww-club-hub/accounts:lookup`);
    
    await Promise.all(allOfficerEmails.map(async email => {
      const userDetails = officerUsers.users.find(u => u.email === email);
      // if the user doesn't exist, or if they're int he wrong school, remove from officer list
      if (!userDetails || userDetails.customAttributes.school !== user.school) {
        delete parsed.data.officers[email];
        return;
      }
      if (email in parsed.data.officers) {
        if (!userDetails.customAttributes.officerOf)
          userDetails.customAttributes.officerOf = {};

        // set permissions
        userDetails.customAttributes.officerOf[parsed.data.clubId] = parsed.data.officers[email].permissions;
      } else {
        // remove officer permissions
        if (userDetails.customAttributes.officerOf) {
          delete userDetails.customAttributes.officerOf[parsed.data.clubId];
        }
      }
      // update roles
      await updateUserRoles(ctx.env, token, userDetails.localId, userDetails.customAttributes, {
        officerOf: userDetails.customAttributes.officerOf
      });
    }));

    // update the doc officer list
    await authedJsonRequest(
      makeFirestoreField({
        officers: parsed.data.officers
      }).mapValue,
      token,
      `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents/schools/${user.school}/clubs/${parsed.data.clubId}?updateMask=officers`,
      "PATCH"
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
