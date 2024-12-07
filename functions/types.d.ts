export interface Env {
  SERVICE_ACCOUNT_EMAIL: string;
  SERVICE_ACCOUNT_KEY: string;
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

export type FirestoreRestDocument = { name: string, fields: RawFirestoreFieldObject };
