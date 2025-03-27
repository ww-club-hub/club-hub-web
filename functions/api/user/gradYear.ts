import { z } from "zod";
import { AUTH_SCOPE, makeServiceAccountToken, updateUserRoles } from "../../firebase";
import { authedProcedure } from "../../utils";

const SetGradYearReq = z.object({
  gradYear: z.string()
});

export default authedProcedure
  .input(SetGradYearReq)
  .mutation(async ({ ctx, input }) => {
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    await updateUserRoles(ctx.env, authToken, ctx.user.user_id, ctx.user, {
      gradYear: input.gradYear,
    });

    return {
      success: true
    };
  });
