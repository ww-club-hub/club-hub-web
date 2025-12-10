import { jwtVerify } from "jose";
import { FIRESTORE_SCOPE, GOOGLE_AUTH_PROVIDER_CERT_URI, getServiceAccountJWKs, getServiceAccountKey, makeFirestoreDocPath, makeServiceAccountToken, parseFirestoreObject } from "../../../firebase";
import type { ClubForm, Env, FirestoreRestDocument, UserData } from "../../../types";
import { authedJsonRequest, getBearerToken } from "../../../utils";
import { refreshAccessToken } from "../../../google-oauth";

async function getUserTokenFromEvent(env: Env, firestoreToken: string, watchId: string, formId: string) {
  // ${school id}-${club id}
  const mid = watchId.indexOf("-");
  const schoolId = watchId.substring(0, mid);
  const clubId = watchId.substring(mid + 1);
  // TODO: handle 404s

  // fetch form doc
  const formDoc = await authedJsonRequest<FirestoreRestDocument>(
    null,
    firestoreToken,
    makeFirestoreDocPath(env, `/schools/${schoolId}/clubs/${clubId}/forms/${formId}`),
    "GET"
  ).then(r => parseFirestoreObject(r.fields) as unknown as ClubForm);

  // fetch user refresh token
  const userDataDoc = await authedJsonRequest<FirestoreRestDocument>(
    null,
    firestoreToken,
    makeFirestoreDocPath(env, `/user_data/${formDoc.officerId}`),
    "GET"
  ).then(r => parseFirestoreObject(r.fields) as unknown as UserData);

  const refreshToken = userDataDoc.google?.refreshToken;
  if (!refreshToken) {
    console.error("No refresh token found for user:", formDoc.officerId);
    // we can't throw here - need to return 200 to properly ACK pub sub request
    return null;
  }

  const accessToken = await refreshAccessToken(env, refreshToken);

  if (!accessToken?.scope || !accessToken.scope.split(" ").includes("https://www.googleapis.com/auth/drive.file")) {
    console.error("Access token does not have required drive.file scope for user:", formDoc.officerId);
    return null;
  }
}

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
  } catch (err) {
    console.error("Error while verifying key:", err);
    // invalid JWT
    return new Response(null, {
      status: 403
    })
  }

  const watchId = req.headers.get("watchid");
  const formId = req.headers.get("formid");

  const firestoreToken = await makeServiceAccountToken(env, FIRESTORE_SCOPE);

  const formDoc = await authedJsonRequest<FirestoreRestDocument>(
    null,
    firestoreToken,
    makeFirestoreDocPath(env, `/schools/${`),
    "GET"
  );
  const doc = parseFirestoreObject(attendanceDocResp.fields) as unknown as ClubMeetingAttendance;
  //const newResponses =

  return new Response("ACK", {
    status: 200
  })
}
