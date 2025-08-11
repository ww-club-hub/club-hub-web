import { jwtVerify } from "jose";
import { GOOGLE_AUTH_PROVIDER_CERT_URI, getServiceAccountJWKs, getServiceAccountKey } from "../../../firebase";
import type { Env } from "../../../types";
import { getBearerToken } from "../../../utils";

export default async function handleFormPush(req: Request, env: Env): Promise<Response> {
  const authorizationJwt = getBearerToken(req);

  if (req.headers.get("from") !== "noreply@google.com" || !authorizationJwt) return new Response(null, {
    status: 403
  });

  try {
    // verify the provided authorization token
    const { payload } = await jwtVerify(authorizationJwt, async (header, _token) => {
      // get our service account pubkey
      const serviceAccountKeys = await getServiceAccountJWKs(GOOGLE_AUTH_PROVIDER_CERT_URI);
      return serviceAccountKeys[header.kid!];
    });

    // make sure it was signed for our service account
    if (payload.email !== env.SERVICE_ACCOUNT_EMAIL) {
      return new Response(null, {
        status: 403
      });
    }

    console.log("passed verification")
  } catch (err) {
    console.error("Error while verifying key:", err);
    // invalid JWT
    return new Response(null, {
      status: 403
    })
  }

  console.log([...req.headers.entries()], await req.text());

  const watchId = req.headers.get("watchid");
  const formId = req.headers.get("formid");
  const newResponses =

  return new Response("ACK", {
    status: 200
  })
}
