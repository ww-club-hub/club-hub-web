import type { Env, FirestoreRestDocument, FirestoreField, FirestoreFieldObject, RawFirestoreField, RawFirestoreFieldObject, FirestoreUser, UserClaims } from "./types";
import { decodeJwt, jwtVerify, importX509, importPKCS8, SignJWT } from "jose";
import { authedJsonRequest } from "./utils";

// NOTE: I would use the firebase-admin SDK here, but it's massive (probably over the 1MB cf workers limit) and uses unsupported node APIs

export const FIRESTORE_SCOPE = "https://firestore.googleapis.com/";
export const AUTH_SCOPE = "https://identitytoolkit.googleapis.com/";

export function getFirestoreUrl(env: Env) {
  if (env.USE_EMULATOR) {
    return "http://localhost:8080/v1";
  } else {
    return "https://firestore.googleapis.com/v1";
  }
}

export function getIdentityToolkitUrl(env: Env) {
  if (env.USE_EMULATOR) {
    return "http://localhost:9099/identitytoolkit.googleapis.com/v1";
  } else {
    return "https://identitytoolkit.googleapis.com/v1";
  }
}

// Get a bearer token for Google APIs from a service account key
export async function makeServiceAccountToken(env: Env, scope: string) {
  if (env.USE_EMULATOR) {
    // emulator token
    return "owner";
  }
    
  // the key is stored with literal "\n"s to make it easier to enter
  const key = env.SERVICE_ACCOUNT_KEY.replaceAll("\\n", "\n");
  const secretKey = await importPKCS8(key, "RS256");
  // make the JWT for these scopes
  const jwt = await new SignJWT()
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: env.SERVICE_ACCOUNT_KID })
    .setIssuedAt()
    .setSubject(env.SERVICE_ACCOUNT_EMAIL)
    .setIssuer(env.SERVICE_ACCOUNT_EMAIL)
    .setAudience(scope)
    .setExpirationTime("1h")
    .sign(secretKey);

  return jwt;
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
    if (!claims.exp || claims.exp < Date.now() / 1000) throw new Error("expired token");
    return claims as FirestoreUser;
  } else {
    // full verify
    const result = await jwtVerify(token, async (header, _token) => {
      // return correct jwk
      const firebasePubkeys = await getFirebaseAuthJwks(cfCache);
      return firebasePubkeys[header.kid!];
    });
    // verify project id
    if (result.payload.iss !== "https://securetoken.google.com/ww-club-hub") {
      throw new Error("invalid jwt issuer");
    }
    return result.payload as FirestoreUser;
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

/// update Identity Toolkit customAttributes
export async function updateUserRoles(env: Env, token: string, userId: string, oldAttrs: UserClaims, roles: any) {
  return await authedJsonRequest({
    localId: userId,
    customAttributes: JSON.stringify({
      // merge
      school: oldAttrs.school,
      role: oldAttrs.role,
      gradYear: oldAttrs.gradYear,
      interests: oldAttrs.interests,
      officerOf: oldAttrs.officerOf,
      memberOf: oldAttrs.memberOf,
      ...roles
    })
  }, token, `${getIdentityToolkitUrl(env)}/projects/ww-club-hub/accounts:update`);
}

export function getFirestoreDocId(doc: FirestoreRestDocument) {
  const parts = doc.name.split("/");
  return parts[parts.length - 1];
}


/// FIRESTORE PARSING STUFF
export function parseFirestoreField(field: RawFirestoreField): FirestoreField {
  if ("stringValue" in field && typeof field.stringValue === "string") {
    return field.stringValue;
  } else if ("integerValue" in field) {
    return Number(field.integerValue);
  } else if ("doubleValue" in field) {
    return Number(field.doubleValue);
  } else if ("booleanValue" in field && typeof field.booleanValue === "boolean") {
    return field.booleanValue;
  } else if ("referenceValue" in field && typeof field.referenceValue === "string") {
    return field.referenceValue;
  } else if ("nullValue" in field) {
    return null;
  } else if ("timestampValue" in field && typeof field.timestampValue === "string") {
    return new Date(Date.parse(field.timestampValue));
  } else if ("mapValue" in field && field.mapValue) {
    return parseFirestoreObject(field.mapValue.fields || {});
  } else if ("arrayValue" in field && field.arrayValue && Array.isArray(field.arrayValue.values)) {
    return field.arrayValue.values.map(parseFirestoreField);
  }
  return null;
}

export function parseFirestoreObject(object: RawFirestoreFieldObject): FirestoreFieldObject {
  return Object.fromEntries(Object.entries(object).map(([k, v]) => [k, parseFirestoreField(v)]));
}

export function makeFirestoreField(field: FirestoreField): RawFirestoreField {
  switch (typeof field) {
    case "number":
      return { [Number.isInteger(field) ? "integerValue" : "doubleValue"]: field.toString() } as { "integerValue": string } | { "doubleValue": string };
    case "string":
      return { stringValue: field };
    case "boolean":
      return { booleanValue: field };
    case "object":
      if (field instanceof Date) return { timestampValue: field.toISOString() };
      else if (Array.isArray(field)) return {
        arrayValue: {
          values: field.map(makeFirestoreField)
        }
      }; else if (field === null) return { nullValue: null };
      else {
        // parse as object
        return {
          mapValue: {
            // exclude undefined values
            fields: Object.fromEntries(Object.entries(field).filter(s => s[1] !== undefined).map(([k, v]) => [k, makeFirestoreField(v)]))
          }
        }
      }
  }
}
