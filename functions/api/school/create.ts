import { getUserFromReq, makeServiceAccountToken, FIRESTORE_SCOPE, getFirestoreUrl, updateUserRoles, AUTH_SCOPE, getFirestoreDocId } from "../../firebase";
import { AggregationQueryResponse, Env, FirestoreRestDocument } from "../../types";
import { authedJsonRequest, jsonResponse, makeFirestoreField } from "../../utils";
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
          const firestoreToken = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE, AUTH_SCOPE]);
          
          // check if any schools with this website exist
          const queryResponse = await authedJsonRequest(
            {
              structuredAggregationQuery: {
                structuredQuery: {
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
                },
                aggregations: [{
                  alias: "count",
                  count: {
                    upTo: "1"
                  }
                }]
              }
            },
            firestoreToken,
            `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents:runAggregationQuery`
          ) as AggregationQueryResponse;
          if (parseInt(queryResponse[0].result.aggregateFields.count.integerValue) > 0) {
            // this school already exists
            return jsonResponse(400, {
              error: "A school with this website already exists"
            });
          }
          
          // create a school and update this user
          const doc = await authedJsonRequest(
            makeFirestoreField({
              name: parsed.data.name,
              nameLowercase: parsed.data.name.toLowerCase(),
              domainRestriction: parsed.data.domainRestriction,
              website: canonUrl,
              owner: user.email as string,
              admins: []
            }).mapValue,
            firestoreToken,
            `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents/schools`
          ) as FirestoreRestDocument;

          const schoolId = getFirestoreDocId(doc);

          await updateUserRoles(ctx.env, firestoreToken, user.user_id, {
            school: schoolId,
            role: "owner"
          });

          return jsonResponse(200, {
            success: true,
            schoolId
          });
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
