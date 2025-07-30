import { JWTPayload } from "jose";
// imports from frontend
import type { UserClaims } from "../src/utils";
import { type Club, ClubSignupType, OfficerPermission, ClubMeetingAttendance, ClubMeeting } from "../src/schema";
export { Club, ClubSignupType, UserClaims, OfficerPermission, ClubMeeting, ClubMeetingAttendance };
export interface Env {
  SERVICE_ACCOUNT_EMAIL: string;
  SERVICE_ACCOUNT_KEY: string;
  SERVICE_ACCOUNT_KID: string;
  OAUTH_CLIENT_ID: string;
  OAUTH_CLIENT_SECRET: string;
  GCP_PROJECT_ID: string;
  USE_EMULATOR: string;
}

export type AtLeastOne<T, U = { [K in keyof T]: Pick<T, K> }> = Partial<T> & U[keyof U];

// this is so stupid
export type RawFirestoreField = AtLeastOne<{
    integerValue: string;
    doubleValue: string;
    booleanValue: boolean;
    stringValue: string;
    referenceValue: string;
    mapValue: { fields: RawFirestoreFieldObject; };
    arrayValue: { values: RawFirestoreField[]; };
    nullValue: null;
    timestampValue: string;
}>;

export type RawFirestoreFieldObject = { [key: string]: RawFirestoreField };

export type FirestoreField = null | number | boolean | string | Date | FirestoreField[] | FirestoreFieldObject;

export type FirestoreFieldObject = { [key: string]: FirestoreField };

export interface FirestoreRestDocument {
  name: string;
  fields: RawFirestoreFieldObject;
  createTime: string;
  updateTime: string;
}

export interface AggregationQueryResponseItem {
  result: {
    aggregateFields: Record<string, RawFirestoreField>
  }
}

export type AggregationQueryResponse = [AggregationQueryResponseItem];

export interface QueryResponseItem {
  document?: FirestoreRestDocument,
  done: boolean
}

export type QueryResponse = QueryResponseItem[];

export interface BeginTransactionResponse {
  transaction: string;
};

export interface FirebaseJwtPayload {
  name: string;
  email: string;
  email_verified: boolean;
  auth_time: number;
  user_id: string;
  firebase: {
    sign_in_provider: string;
    identities: {
      // TODO
    }
  };
}

export type FirestoreUser = JWTPayload & FirebaseJwtPayload & UserClaims;

export interface Context {
  req: Request<unknown, CfProperties<unknown>>,
  resHeaders: Headers,
  env: Env,
  user: FirestoreUser | null
}
