import {  makeServiceAccountToken, FIRESTORE_SCOPE, getFirestoreUrl, getFirestoreDocId, parseFirestoreObject } from "../../firebase";
import { FirestoreRestDocument, QueryResponse } from "../../types";
import { authedJsonRequest, authedProcedure } from "../../utils";
import { z } from "zod";

const SearchReq = z.object({
  query: z.string()
});

export default authedProcedure
  .input(SearchReq)
  .query(async ({ ctx, input }) => {
    const userEmailDomain = ctx.user.email.split("@")[1];

    const firestoreToken = await makeServiceAccountToken(ctx.env, [FIRESTORE_SCOPE]);

    const query = input.query.toLowerCase();
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
      `${getFirestoreUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/databases/(default)/documents:runQuery`
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

    return {
      success: true,
      schools: docs
    };
  });
