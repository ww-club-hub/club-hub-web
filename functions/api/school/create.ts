import { TRPCError } from "@trpc/server";
import { makeServiceAccountToken, FIRESTORE_SCOPE, getFirestoreUrl, updateUserRoles, AUTH_SCOPE, getFirestoreDocId, makeFirestoreField, makeFirestoreDocPath } from "../../firebase";
import { AggregationQueryResponse, FirestoreRestDocument } from "../../types";
import { authedJsonRequest, authedProcedure } from "../../utils";
import { z } from "zod";

const CreateSchoolReq = z.object({
  name: z.string(),
  domainRestriction: z.optional(z.array(z.string())),
  website: z.string().url()
});

export default authedProcedure
  .input(CreateSchoolReq)
  .mutation(async ({ ctx, input }) => {
    const canonUrl = new URL(input.website).href;

      // make sure they're not already a part of a school
    if (ctx.user.school) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "User is already a member of a school"
      });
    } else {
      const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
      const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

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
        makeFirestoreDocPath(ctx.env, `:runAggregationQuery`)
      ) as AggregationQueryResponse;
      if (parseInt(queryResponse[0]?.result.aggregateFields.count.integerValue!) > 0) {
        // this school already exists
        throw new TRPCError({
          code: "CONFLICT",
          message: "A school with this website already exists"
        });
      }

      // create a school and update this user
      const doc = await authedJsonRequest(
        makeFirestoreField({
          name: input.name,
          nameLowercase: input.name.toLowerCase(),
          domainRestriction: input.domainRestriction!,
          website: canonUrl,
          owner: ctx.user.email,
          admins: [],
          members: []
        }).mapValue,
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `/schools`)
      ) as FirestoreRestDocument;

      const schoolId = getFirestoreDocId(doc);

      await updateUserRoles(ctx.env, authToken, ctx.user.user_id, ctx.user, {
        school: schoolId,
        role: "owner"
      });

      return {
        success: true,
        schoolId
      };
    }
  });
