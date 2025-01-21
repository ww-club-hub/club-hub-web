import { getUserFromReq, makeServiceAccountToken, FIRESTORE_SCOPE, getFirestoreUrl, getFirestoreDocId } from "../../firebase";
import { Env, FirestoreRestDocument, QueryResponse } from "../../types";
import { authedJsonRequest, jsonResponse, parseFirestoreObject } from "../../utils";
import { z } from "zod";

const SearchReq = z.object({
  query: z.string()
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
    const parsed = SearchReq.safeParse(body);

    if (parsed.error) {
      return jsonResponse(400, {
        error: parsed.error.message
      });
    }
    
    const firestoreToken = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE]);

    const query = parsed.data.query.toLowerCase();
    // search
    const queryResponse = await authedJsonRequest(
      {
        structuredQuery: {
          select: {
            fields: [
              {
                fieldPath: "name"
              },
              {
                fieldPath: "domainRestriction"
              },
              {
                fieldPath: "website"
              },
              {
                fieldPath: "__name__"
              }
            ]
          },
          from: [{
            collectionId: "schools"
          }],
          // prefix searching
          // https://stackoverflow.com/a/56815787
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: {
                      fieldPath: "nameLowercase",
                    },
                    op: "GREATER_THAN_OR_EQUAL",
                    value: {
                      stringValue: query
                    }
                  }
                },
                {
                  fieldFilter: {
                    field: {
                      fieldPath: "nameLowercase",
                    },
                    op: "LESS_THAN_OR_EQUAL",
                    value: {
                      stringValue: query + "\uf8ff"
                    }
                  }
                }
              ]
            }
          }
        }
      },
      firestoreToken,
      `${getFirestoreUrl(ctx.env)}/projects/ww-club-hub/databases/(default)/documents:runQuery`
    ) as QueryResponse;

    // parse docsg
    const docs = queryResponse
      .map(doc => doc.document)
      .filter((doc): doc is FirestoreRestDocument => !!doc)
      .map(doc => ({
        id: getFirestoreDocId(doc),
        ...parseFirestoreObject(doc.fields)
      } as { id: string, domainRestriction: string[] }))
      // filter by domain restriction
      .filter(doc => {
        if (doc.domainRestriction) {
          return doc.domainRestriction.includes(userEmailDomain);
        } else {
          return true;
        }
      });

    return jsonResponse(200, {
      success: true,
      schools: docs
    })
  } catch (err) {
    return jsonResponse(403, {
      error: err.message
    });
  }
};
