import { getUserFromReq } from "../firebase";
import { Env } from "../types";
import { jsonResponse } from "../utils";
import { z } from "zod";

const CreateSchoolReq = z.object({
  name: z.string(),
  domainRestriction: z.optional(z.array(z.string())),
  website: z.string(),
});

export const onRequestPost: PagesFunction<Env> = async ctx => {
  try {
    const user = await getUserFromReq(ctx.env, caches.default, ctx.request);
  } catch (err) {
    return jsonResponse(403, {
      error: err.message
    });
  }

  // validate request body
  const body = await ctx.request.json();
  const parsed = CreateSchoolReq.safeParse(body);
  if (parsed.success) {
    console.log(parsed);
  } else {
    return jsonResponse(400, {
      error: parsed.error.message
    });
  }
};
