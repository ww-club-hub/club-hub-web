import { z } from "zod";
import { AUTH_SCOPE, getIdentityToolkitUrl,  makeServiceAccountToken } from "../../firebase";
import { authedJsonRequest } from "../../utils";
import { publicProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";

const GetProfileReq = z.object({
  email: z.string().email()
});

// public endpoint to get a user's public profile info
export default publicProcedure
  .input(GetProfileReq)
  .query(async ({ ctx, input }) => {
    const cachedRes = await caches.default.match(ctx.req);
    if (cachedRes) return cachedRes;

    const token = await makeServiceAccountToken(ctx.env, [AUTH_SCOPE]);
    
    const userRes = await authedJsonRequest<{
      users: {
        displayName: string,
        photoUrl: string
      }[]
    }>({
      email: [input.email]
    }, token, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);
    
    const user = userRes.users?.[0];

    ctx.resHeaders.set("Cache-Control", "max-age=604800, public, stale-while-revalidate");

    if (user) {
      return {
        success: true,
        displayName: user.displayName,
        photoUrl: user.photoUrl
      }
    } else {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "user not found"
      });
    }
  });
