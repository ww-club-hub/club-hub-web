import { getAuth } from "firebase-admin/auth";
import { getApp, getUserFromReq } from "../firebase";
import { Env } from "../types";

export const onRequestPost: PagesFunction<Env> = async ctx => {
  const app = getApp(ctx.env);
  const auth = getAuth(app);
  const user = await getUserFromReq(auth, ctx.request);
  return new Response("", {
    status: 405
  });
};
