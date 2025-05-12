import { z } from "zod";
import { FIRESTORE_SCOPE, exchangeOauthToken, makeServiceAccountToken } from "../../../firebase";
import { authedProcedure } from "../../../utils";

const AuthorizeGoogleReq = z.object({
  token: z.string()
});

export default authedProcedure
  .input(AuthorizeGoogleReq)
  .mutation(async ({ ctx, input }) => {
    const firebaseToken = await makeServiceAccountToken(ctx.env, FIRESTORE_SCOPE);

    // TODO: email match verification

    const token = await exchangeOauthToken(ctx.env, input.token);

    // update token in DB, revoke old token if needed

    return {
      success: true,
      accessToken: token.access_token,
      scope: token.scope
    };
  });
