import { initializeApp, cert } from "firebase-admin/app";
import { type Auth } from "firebase-admin/auth";
import { Env } from "./types";

/** initialize the firebase admin sdk from environment variables */
export const getApp = (env: Env) => initializeApp({
  credential: cert({
    projectId: env.GCP_PROJECT_ID,
    privateKey: env.SERVICE_ACCOUNT_KEY,
    clientEmail: env.SERVICE_ACCOUNT_EMAIL
  })
});

const authBearerRe = /Bearer: (.*)/;

export const getUserFromReq = async (auth: Auth, req: Request)  => {
  const header = req.headers.get("Authorization");
  if (!header) return null;
  const token = header.match(authBearerRe)?.[1];
  if (!token) return null;
  return await auth.verifyIdToken(token);
}
