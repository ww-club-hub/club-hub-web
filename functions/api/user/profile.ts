import { AUTH_SCOPE, getIdentityToolkitUrl,  makeServiceAccountToken } from "../../firebase";
import { Env } from "../../types";
import { authedJsonRequest, jsonResponse } from "../../utils";

// public endpoint to get a user's public profile info
export const onRequestGet: PagesFunction<Env> = async ctx => {
  // return cached response if present
  const cachedRes = await caches.default.match(ctx.request);
  if (cachedRes) return cachedRes;

  const url = new URL(ctx.request.url);
  const email = url.searchParams.get("email");

  if (!email) {
    return jsonResponse(400, {
      error: "must include email parameter"
    });
  }

  const token = await makeServiceAccountToken(ctx.env, [AUTH_SCOPE]);

  const userRes = await authedJsonRequest<{
    users: {
      displayName: string,
      photoUrl: string
    }[]
  }>({
    email: [email]
  }, token, `${getIdentityToolkitUrl(ctx.env)}/projects/${ctx.env.GCP_PROJECT_ID}/accounts:lookup`);

  const user = userRes.users?.[0];

  if (user) {
    return jsonResponse(200, {
      success: true,
      displayName: user.displayName,
      photoUrl: user.photoUrl
    }, {
      "Content-Type": "application/json",
      // 1 week
      "Cache-Control": "max-age=604800, public, stale-while-revalidate"
    });
  } else {
    return jsonResponse(404, {
      error: "user not found"
    }, {
      "Content-Type": "application/json",
      // 1 week
      "Cache-Control": "max-age=604800, public, stale-while-revalidate"
    });
  }
};
