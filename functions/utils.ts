import { FirestoreFieldObject } from "./types";
import { FirestoreField } from "./types";
import { RawFirestoreField, RawFirestoreFieldObject } from "./types";

export async function jsonResponse(status: number, response: Record<string, any>, headers?: Record<string, string>) {
  return new Response(JSON.stringify(response), {
    status,
    headers: headers ?? {
      "Content-Type": "application/json"
    }
  });
}

export async function authedJsonRequest<T = unknown>(body: any, token: string, url: string, method = "POST") {
  return await fetch(url, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: method === "GET" ? undefined : JSON.stringify(body)
  }).then(r => r.json<T>());
}

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
  } else if ("mapValue" in field) {
    return parseFirestoreObject(field.mapValue.fields || {});
  } else if ("arrayValue" in field && Array.isArray(field.arrayValue.values)) {
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
