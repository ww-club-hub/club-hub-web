import { z } from "zod";
import { AUTH_SCOPE, FIRESTORE_SCOPE, makeServiceAccountToken, parseFirestoreObject, makeFirestoreField, makeFirestoreDocPath } from "../../firebase";
import { FirestoreRestDocument } from "../../types";
import { authedJsonRequest, authedProcedure } from "../../utils";
import { updateUserRoles } from "../../firebase";
import { TRPCError } from "@trpc/server";

const JoinReq = z.object({
  schoolId: z.string()
});

export default authedProcedure
  .input(JoinReq)
  .mutation(async ({ ctx, input }) => {
    const userEmailDomain = ctx.user.email.split("@")[1];

    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    // make sure they can join this school
    const queryResponse = await authedJsonRequest(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/schools/${input.schoolId}`),
      "GET"
    ) as FirestoreRestDocument;

    const doc = parseFirestoreObject(queryResponse.fields);

    if (doc.domainRestriction && (!Array.isArray(doc.domainRestriction) || !doc.domainRestriction.includes(userEmailDomain))) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You are not allowed to join this school (${userEmailDomain} is not an allowed email domain)`
      });
    }

    // add them to the school member list
    await authedJsonRequest(
      {
        writes: [{
          transform: {
            document: makeFirestoreDocPath(ctx.env, `/schools/${input.schoolId}`, false),
            fieldTransforms: [{
              fieldPath: "members",
              appendMissingElements: makeFirestoreField([ctx.user.email]).arrayValue
            }]
          }
        }]
      },
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `:batchWrite`)
    );

    await updateUserRoles(ctx.env, authToken, ctx.user.user_id, ctx.user, {
      school: input.schoolId,
    });

    return {
      success: true
    };
  });
