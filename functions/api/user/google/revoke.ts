import { z } from "zod";
import { FIRESTORE_SCOPE, exchangeOauthToken, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseFirestoreObject, refreshAccessToken, revokeOauthToken } from "../../../firebase";
import { RequestError, authedJsonRequest, authedProcedure } from "../../../utils";
import { FirestoreRestDocument, UserData } from "../../../types";

export default authedProcedure
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    try {
      // fetch refresh token
      const tokenConfig = await authedJsonRequest<FirestoreRestDocument>(
        null,
        firestoreToken,
        makeFirestoreDocPath(ctx.env, `/user_data/${ctx.user.user_id}?mask.fieldPaths=google`),
        "GET"
      ).then(r => r.name ? parseFirestoreObject(r.fields ?? {}) as unknown as Pick<UserData, "google"> : null);

      if (!tokenConfig?.google) {
        // user hasn't authorized
        return {
          success: false,
        };
      }

      await revokeOauthToken(tokenConfig.google.email);
    } catch (err) {
      if (err instanceof RequestError) {
        // user hasn't authorized
        return {
          success: false
        };
      } else {
        throw err;
      }
    }

    // remove db config
    await authedJsonRequest(
      makeFirestoreField({
        // remove google field
      }).mapValue,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/user_data/${ctx.user.user_id}?updateMask.fieldPaths=google`),
      "PATCH"
    );

    return {
      success: true
    };
  });
