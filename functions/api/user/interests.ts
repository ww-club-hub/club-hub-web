import { z } from "zod";
import { AUTH_SCOPE, makeServiceAccountToken, updateUserRoles } from "../../firebase";
import { authedProcedure } from "../../utils";

const SetInterestsReq = z.object({
  interests: z.array(z.number())
});

export default authedProcedure
  .input(SetInterestsReq)
  .mutation(async ({ ctx, input }) => {
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    await updateUserRoles(ctx.env, authToken, ctx.user.user_id, ctx.user, {
      interests: input.interests,
    });

    return {
      success: true
    };
  });
