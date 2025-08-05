import { z } from "zod";
import { FIRESTORE_SCOPE, exchangeOauthToken, fetchGoogleUserInfo, makeFirestoreDocPath, makeFirestoreField, makeServiceAccountToken, parseFirestoreObject, revokeOauthToken } from "../../../firebase";
import { authedJsonRequest, authedProcedure } from "../../../utils";
import { TRPCError } from "@trpc/server";
import { FirestoreRestDocument, UserData } from "../../../types";

const AuthorizeGoogleReq = z.object({
  token: z.string()
});

export default authedProcedure
  .input(AuthorizeGoogleReq)
  .mutation(async ({ ctx, input }) => {
    const firestoreToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    const token = await exchangeOauthToken(ctx.env, input.token);

    if (!token) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid authorization code"
      });
    }

    // make sure we can fetch user email
    const requiredScopes = ["openid", "email"];
    const scopes = token.scope.split(" ");
    if (requiredScopes.some(scope => !scopes.includes(scope))) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing email or openid scopes"
      });
    }

    const userInfo = await fetchGoogleUserInfo(token.access_token);
    if (!userInfo?.email_verified || userInfo?.email !== ctx.user.email) {
      // TODO: should this really be required?
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Your account email does not match the Google account you authorized"
      });
    }

    // fetch old token config
    const tokenConfig = await authedJsonRequest<FirestoreRestDocument>(
      null,
      firestoreToken,
      makeFirestoreDocPath(ctx.env, `/user_data/${ctx.user.id}?mask.fieldPaths=google`),
      "GET"
    ).then(r => r.name ? parseFirestoreObject(r.fields) as unknown as Pick<UserData, "google"> : null);

    // revoke old token
    if (tokenConfig?.google) {
      await revokeOauthToken(tokenConfig.google.refreshToken);
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
      makeFirestoreDocPath(ctx.env, `/user_data/${ctx.user.id}?updateMask.fieldPaths=google`)
    );

    return {
      success: true,
      accessToken: token.access_token,
      scope: token.scope,
      expiresAt: Date.now() + token.expires_in * 1000,
      email: userInfo.email
    };
  });
