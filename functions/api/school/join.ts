import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, getFirestoreUrl, getUserFromReq, makeServiceAccountToken } from "../../firebase";
import { Env, FirestoreRestDocument } from "../../types";
import { authedJsonRequest, jsonResponse } from "../../utils";
import { parseFirestoreObject } from "../../utils";
import { updateUserRoles } from "../../firebase";
import { makeFirestoreField } from "../../utils";

const JoinReq = z.object({
  schoolId: z.string()
});

export const onRequestPost: PagesFunction<Env> = async ctx => {
  try {
    const user = await getUserFromReq(ctx.env, caches.default, ctx.request);

    if (!user.email_verified) {
      return jsonResponse(403, {
        error: "Email not verified"
      });
    }

    const userEmailDomain = user.email.split("@")[1];

    // validate request body
    const body = await ctx.request.json();
    const parsed = JoinReq.safeParse(body);

    // validate request body
    if (parsed.error) {
      return jsonResponse(400, {
        error: parsed.error.message
      });
    }

    const firebaseToken = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE, AUTH_SCOPE]);

    // make sure they can join this school
    const queryResponse = await authedJsonRequest(
      null,
      firebaseToken,
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${parsed.data.schoolId}`,
      "GET"
    ) as FirestoreRestDocument;

    const doc = parseFirestoreObject(queryResponse.fields);

    if (doc.domainRestriction && (!Array.isArray(doc.domainRestriction) || !doc.domainRestriction.includes(userEmailDomain))) {
      return jsonResponse(403, {
        error: `You are not allowed to join this school (${userEmailDomain} is not an allowed email domain)`
      });
    }

    // add them to the school member list
    await authedJsonRequest(
      {
        writes: [{
          transform: {
            document: `projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents/schools/${parsed.data.schoolId}`,
            fieldTransforms: [{
              fieldPath: "members",
              appendMissingElements: makeFirestoreField([user.email]).arrayValue
            }]
          }
        }]
      },
      firebaseToken,
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:batchWrite`
    );

    await updateUserRoles(ctx.env, firebaseToken, user.user_id, user, {
      school: parsed.data.schoolId,
    });
    
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
