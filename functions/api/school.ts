import { getUserFromReq, makeServiceAccountToken, FIRESTORE_SCOPE, getFirestoreUrl } from "../firebase";
import { Env } from "../types";
import { authedJsonRequest, jsonResponse, makeFirestoreField } from "../utils";
import { z } from "zod";

const CreateSchoolReq = z.object({
  name: z.string(),
  domainRestriction: z.optional(z.array(z.string())),
  website: z.string().url()
});

export const onRequestPost: PagesFunction<Env> = async ctx => {
  try {
    const user = await getUserFromReq(ctx.env, caches.default, ctx.request);

      // validate request body
    const body = await ctx.request.json();
    const parsed = CreateSchoolReq.safeParse(body);
    if (parsed.success) {
      const canonUrl = new URL(parsed.data.website).href;
      // make sure user's email is verified
      if (user.email_verified) {
        // make sure they're not already a part of a school
        if (user.school) {
          return jsonResponse(403, {
            error: "User is already a member of a school"
          });
        } else {
          const firestoreToken = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE]);
          
          // check if any schools with this website exist
          const queryResponse = await authedJsonRequest(
            {
              structuredQuery: {
                select: {
                  fields: [{
                    fieldPath: "name"
                  }]
                },
                from: [{
                  collectionId: "schools"
                }],
                where: {
                  fieldFilter: {
                    field: {
                      fieldPath: "website",
                    },
                    op: "EQUAL",
                    value: {
                      stringValue: canonUrl
                    }
                  }
                }
              }
            },
            firestoreToken,
            `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents:runQuery`
          ) as any[];
          if (queryResponse.filter(el => el.document).length > 0) {
            // this school already exists
            return jsonResponse(400, {
              error: "A school with this website already exists"
            });
          }
          
          // create a school and update this user
          const doc = await authedJsonRequest(
            makeFirestoreField({
              name: parsed.data.name,
              domainRestriction: parsed.data.domainRestriction,
              website: canonUrl,
              owner: user.user_id as string,
              admins: []
            }).mapValue,
            firestoreToken,
            `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents/schools`
          );
          console.log(doc);
        }
      } else {
        return jsonResponse(403, {
          error: "Email not verified"
        });
      }
    } else {
      return jsonResponse(400, {
        error: parsed.error.message
      });
    }
  } catch (err) {
    return jsonResponse(403, {
      error: err.message
    });
  }
};
