import { z } from "zod";
import { AUTH_SCOPE, lookupUser,  makeServiceAccountToken } from "../../firebase";
import { TRPCError } from "@trpc/server";
import { authedProcedure } from "../../utils";
import { UserClaims } from "../../types";

const GetProfileReq = z.object({
  email: z.email()
});

// public endpoint to get a user's public profile info
export default authedProcedure
  .input(GetProfileReq)
  .query(async ({ ctx, input }) => {
    // TODO: did we need to cache this?
    //const cachedRes = await caches.default.match(ctx.req);
    //if (cachedRes) return cachedRes as {
    //success: boolean,
    //displayName: string,
    //photoUrl?: string
    //};

    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    const user = await lookupUser(input.email, authToken, ctx.env);

    ctx.resHeaders.set("Cache-Control", "max-age=604800, stale-while-revalidate");

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found"
      });
    }

    const attrs = JSON.parse(user.customAttributes) as UserClaims;

    // return not found here to prevent email enumeration between schools
    if (attrs.school !== ctx.user.school) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found"
      });
    }

    return {
      success: true,
      displayName: user.displayName as string,
      photoUrl: user.photoUrl as string
    };
  });
