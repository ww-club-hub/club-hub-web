import { z } from "zod";
import { FIRESTORE_SCOPE, exchangeOauthToken, makeFirestoreDocPath, makeServiceAccountToken, parseFirestoreObject, refreshAccessToken } from "../../../firebase";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { FirestoreRestDocument, UserData } from "../../../types";

const GetTokenReq = z.object({
  // required scopes
  scopes: z.array(z.string())
});

export default authedProcedure
  .input(GetTokenReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // fetch refresh token
    const tokenConfig = await authedJsonRequest<FirestoreRestDocument>(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/user_data/${ctx.user.id}?mask.fieldPaths=google`),
      "GET"
    ).then(r => r.name ? parseFirestoreObject(r.fields) as unknown as Pick<UserData, "google"> : null);

    // the user hasn't authorized yet
    if (!tokenConfig?.google) {
      return {
        success: false,
        authorizationNeeded: true as const
      };
    }

    const tokenResult = await refreshAccessToken(ctx.env, tokenConfig.google.refreshToken);
    const tokenScopes = tokenResult?.scope.split(" ");

    // if we couldn't get the token or if some of the scopes requested are not in it, authorization is needed
    if (!tokenResult || !tokenScopes || input.scopes.some(scope => !tokenScopes.includes(scope))) {
      return {
        success: false,
        authorizationNeeded: true as const
      };
    }

    return {
      success: true,
      authorizationNeeded: false as const,
      accessToken: tokenResult.access_token,
      scope: tokenResult.scope,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
      email: tokenConfig.google.email
    };
  });
