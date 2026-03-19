import { z } from "zod";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import { RequestError, authedJsonRequest, officerProcedure } from "../../../utils";
import { FirestoreRestDocument, OfficerPermission, UserData } from "../../../types";
import { refreshAccessToken } from "../../../google-oauth";

const GetTokenReq = z.object({
  clubId: z.string(),
  // required scopes
  scopes: z.array(z.string())
});

export default officerProcedure(OfficerPermission.Forms | OfficerPermission.Messages)
  .input(GetTokenReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // Google auth info is stored within clubs_private
    const docPath = `/schools/${ctx.user.school}/clubs_private/${input.clubId}/?mask.fieldPaths=google`;

    try {
      // fetch refresh token
      const tokenConfig = await authedJsonRequest<FirestoreRestDocument>(
        null,
        firestoreToken,
        makeFirestoreDocPath(ctx.env, docPath),
        "GET"
      ).then(r => r.name ? parseFirestoreObject(r.fields ?? {}) as unknown as Pick<UserData, "google"> : null);

      if (!tokenConfig?.google) {
        // club hasn't authorized
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

      const result: {
        success: true,
        authorizationNeeded: false,
        accessToken: string,
        scope: string,
        expiresAt: number,
        email: string
      } = {
        success: true,
        authorizationNeeded: false as const,
        accessToken: tokenResult.access_token,
        scope: tokenResult.scope,
        expiresAt: Date.now() + tokenResult.expires_in * 1000,
        email: tokenConfig.google.email
      };
      return result;
    } catch (err) {
      if (err instanceof RequestError) {
        // club hasn't authorized
        return {
          success: false,
          authorizationNeeded: true as const
        };
      } else {
        throw err;
      }
    }
  });
