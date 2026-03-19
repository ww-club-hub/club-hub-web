import { z } from "zod";
import { FIRESTORE_SCOPE, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import { RequestError, authedJsonRequest, officerProcedure } from "../../../utils";
import { TRPCError } from "@trpc/server";
import { FirestoreRestDocument, OfficerPermission, UserData } from "../../../types";
import { exchangeOauthToken, fetchGoogleUserInfo, revokeOauthToken } from "../../../google-oauth";

const AuthorizeGoogleReq = z.object({
  clubId: z.string(),
  token: z.string()
});

// TODO: eventually migrate to dedicated google management permission
export default officerProcedure(OfficerPermission.Forms | OfficerPermission.Messages)
  .input(AuthorizeGoogleReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // Authorize the linked google account
    const token = await exchangeOauthToken(ctx.env, input.token);

    if (!token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid authorization code"
      });
    }

    // make sure we can fetch user email
    const requiredScopes = ["openid", "https://www.googleapis.com/auth/userinfo.email"];
    const scopes = token.scope.split(" ");
    if (requiredScopes.some(scope => !scopes.includes(scope))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing email or openid scopes"
      });
    }
    const userInfo = await fetchGoogleUserInfo(token.access_token);
    if (!userInfo?.email_verified) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Could not fetch Google account email"
      });
    }
    
    // Google auth info is stored within clubs_private
    const docPath = `/schools/${ctx.user.school}/clubs_private/${input.clubId}/?mask.fieldPaths=google`;

    try {
      // fetch old token config
      const tokenConfig = await authedJsonRequest<FirestoreRestDocument>(
        null,
        firestoreToken,
        makeFirestoreDocPath(ctx.env, docPath),
        "GET"
      ).then(r => r.name ? parseFirestoreObject(r.fields ?? {}) as unknown as Pick<UserData, "google"> : null);

      // revoke old token
      if (tokenConfig?.google) {
        await revokeOauthToken(tokenConfig.google.refreshToken);
      }
    } catch (err) {
      if (err instanceof RequestError) {
        // not found - ignore
      } else {
        throw err;
      }
    }

    // write token to db
    await authedJsonRequest(
      makeFirestoreField({
        google: {
          refreshToken: token.refresh_token,
          email: userInfo.email
        }
      }).mapValue,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, docPath),
      "PATCH"
    );

    return {
      success: true,
      accessToken: token.access_token,
      scope: token.scope,
      expiresAt: Date.now() + token.expires_in * 1000,
      email: userInfo.email
    };
  });
