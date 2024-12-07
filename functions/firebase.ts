import { Env } from "./types";
import { decodeJwt, jwtVerify, importX509, importPKCS8, SignJWT } from "jose";

// NOTE: I would use the firebase-admin SDK here, but it's massive (probably over the 1MB cf workers limit) and uses unsupported node APIs

const googleTokenUrl = "https://www.googleapis.com/oauth2/v4/token";

export const FIRESTORE_SCOPE = "https:///www.googleapis.com/auth/datastore";

export function getFirestoreUrl(env: Env) {
  if (env.USE_EMULATOR) {
    return "http://localhost:8080/v1";
  } else {
    return "https://firestore.googleapis.com/v1";
  }
}

// Get a bearer token for Google APIs from a service account key
export async function makeServiceAccountToken(env: Env, scopes: string[]) {
  if (env.USE_EMULATOR) {
    // emulator token
    return "owner";
  }
    
  // the key is stored with literal "\n"s to make it easier to enter
  const secretKey = await importPKCS8(env.SERVICE_ACCOUNT_KEY.replaceAll("\\n", "\n"), "RS256");
  // make the JWT for these scopes
  const jwt = await new SignJWT({ scope: scopes.join(" ") })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .setSubject(env.SERVICE_ACCOUNT_EMAIL)
    .setIssuer(env.SERVICE_ACCOUNT_EMAIL)
    .setAudience(googleTokenUrl)
    .setExpirationTime("1h")
    .sign(secretKey);
  // get an access token
  const res = await fetch(googleTokenUrl, {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt
    }),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  }).then(r => r.json()) as { access_token?: string };
  if (!res.access_token) throw new Error("Could not generate GAPI token");
  return res.access_token;
}

const firebaseJwkUrl = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

// parse the Firebase Auth JWK dict
async function parseFirebaseAuthJwks(jwkDict: Record<string, string>) {
  return Object.fromEntries(await Promise.all(Object.entries(jwkDict).map(async ([keyId, rawKey]) => {
    const key = await importX509(rawKey, "RS256");
    return [keyId, key] as const; // as const forces this to be a tuple instead of an array
  })));
}

// retrieve Firebase Auth JWKs
// https://firebase.google.com/docs/auth/admin/verify-id-tokens#verify_id_tokens_using_a_third-party_jwt_library
async function getFirebaseAuthJwks(cfCache: Cache) {
  const existingCache = await cfCache.match(firebaseJwkUrl);
  if (existingCache) return await parseFirebaseAuthJwks(await existingCache.json());

  // fetch JWKs
  const res = await fetch(firebaseJwkUrl);
  await cfCache.put(firebaseJwkUrl, res.clone());
  return await parseFirebaseAuthJwks(await res.json());
}

// verify and parse a Firebase Auth ID token
async function verifyParseFirebaseAuthToken(token: string, env: Env, cfCache: Cache) {
  if (env.USE_EMULATOR) {
    // just make sure it's not expired for emulator tokens
    const claims = decodeJwt(token);
    if (claims.exp < Date.now() / 1000) throw new Error("expired token");
    return claims;
  } else {
    // full verify
    const result = await jwtVerify(token, async (header, _token) => {
      // return correct jwk
      const firebasePubkeys = await getFirebaseAuthJwks(cfCache);
      return firebasePubkeys[header.kid];
    });
    return result.payload;
  }
}

const authBearerRe = /Bearer (.*)/;

export const getUserFromReq = async (env: Env, cfCache: Cache, req: Request)  => {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const token = header.match(authBearerRe)?.[1];
  if (!token) return null;
  return await verifyParseFirebaseAuthToken(token, env, cfCache);
}
