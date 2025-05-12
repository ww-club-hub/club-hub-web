import { z } from "zod";
import { FIRESTORE_SCOPE, exchangeOauthToken, makeServiceAccountToken, refreshAccessToken } from "../../../firebase";
import { authedProcedure } from "../../../utils";

export default authedProcedure
  .mutation(async ({ ctx }) => {
    const firebaseToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // TODO: get refreshtoken from DB, error if doesn't exist

    const refreshToken = "";

    const tokenResult = await refreshAccessToken(ctx.env, refreshToken);

    return {
      success: true,
      accessToken: tokenResult.access_token,
      scope: tokenResult.scope
    };
  });
