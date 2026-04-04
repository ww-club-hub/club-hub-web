import { z } from "zod";
import { AUTH_SCOPE, makeServiceAccountToken, updateUserRoles } from "../../firebase";
import { authedProcedure } from "../../utils";

const SetPersonalEmailReq = z.object({
  personalEmail: z.email()
});

export default authedProcedure
  .input(SetPersonalEmailReq)
  .mutation(async ({ ctx, input }) => {
    const authToken = await makeServiceAccountToken(ctx.env, AUTH_SCOPE);

    await updateUserRoles(ctx.env, authToken, ctx.user.user_id, ctx.user, {
      personalEmail: input.personalEmail,
    });

    return {
      success: true
    };
  });
