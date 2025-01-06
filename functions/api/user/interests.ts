import { z } from "zod";
import { AUTH_SCOPE, getUserFromReq, makeServiceAccountToken } from "../../firebase";
import { Env } from "../../types";
import { jsonResponse } from "../../utils";
import { updateUserRoles } from "../../firebase";

const SetInterestsReq = z.object({
  interests: z.array(z.number())
});

export const onRequestPost: PagesFunction<Env> = async ctx => {
  try {
    const user = await getUserFromReq(ctx.env, caches.default, ctx.request);

    if (!user.email_verified) {
      return jsonResponse(403, {
        error: "Email not verified"
      });
    }

    // validate request body
    const body = await ctx.request.json();
    const parsed = SetInterestsReq.safeParse(body);

    // validate request body
    if (parsed.error) {
      return jsonResponse(400, {
        error: parsed.error.message
      });
    }

    const firebaseToken = await makeServiceAccountToken(ctx.env, [AUTH_SCOPE]);

    console.log(user);

    await updateUserRoles(ctx.env, firebaseToken, user.user_id, {
      interests: parsed.data.interests,
      // keep existing attrs
      school: user.school,
      role: user.role
    });
    
    return jsonResponse(200, {
      success: true
    });
  } catch (err) {
    return jsonResponse(403, {
      error: err.message
    });
  }
};
