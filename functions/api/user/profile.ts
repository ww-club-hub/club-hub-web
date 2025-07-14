import { z } from "zod";
import { AUTH_SCOPE, lookupUser,  makeServiceAccountToken } from "../../firebase";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

const GetProfileReq = z.object({
  email: z.string().email()
});

// public endpoint to get a user's public profile info
export default publicProcedure
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

    ctx.resHeaders.set("Cache-Control", "max-age=604800, public, stale-while-revalidate");

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "user not found"
      });
    }
    
    return {
      success: true,
      displayName: user.displayName as string,
      photoUrl: user.photoUrl as string
    };
  });
