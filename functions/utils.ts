import { publicProcedure } from "./trpc";
import { TRPCError } from "@trpc/server";
import type { OfficerPermission, UserClaims } from "./types";

export class RequestError extends Error {
  url: string;
  response: Response;
  method: string;

  constructor(reqBody: string, resBody: string, url: string, response: Response, method: string) {
    super(`[${method} ${url}]: ${response.status} ${response.statusText}\n\tReq: ${reqBody}\n\tRes: ${resBody}`)
    this.url = url;
    this.response = response;
    this.method = method;
  }
}

export async function authedJsonRequest<T = unknown>(body: any, token: string, url: string, method = "POST") {
  return await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: method === "GET" ? undefined : JSON.stringify(body)
  }).then(async r => {
    if (!r.ok) {
      throw new RequestError(JSON.stringify(body), await r.text(), url, r, method);
    }
    const response = await r.json<T>();
    return response;
  });
}

export const authedProcedure = publicProcedure.use(async({ ctx, next }) => {
  // verify user is signed in and has a verified email
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  if (!ctx.user.email_verified) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Email not verified" });
  }

  return next({
    ctx: {
      // non-null
      user: ctx.user
    }
  });
});

export function checkOfficerPermission(user: UserClaims, clubId: string, permission: OfficerPermission, allowAdmins = true) {
  // admin access
  if (allowAdmins && (user.role === "owner" || user.role === "admin")) return true;

  // not an officer of any clubs
  if (!user.officerOf) return false;

  const permissions = user.officerOf[clubId];
  return (permissions & permission) !== 0;
}
