import { type ParsedToken, type Auth, getIdTokenResult } from "firebase/auth";
import type { ClubMeetingTime, OfficerPermission, Officers } from "./schema";
import { DocumentReference, getDoc, getDocs, type DocumentData, type Query } from "firebase/firestore";

export interface UserClaims extends ParsedToken {
  school: string,
  role: string,
  interests?: number[],
  memberOf: string[],
  // map of club id to permission bitmask
  officerOf: Record<string, OfficerPermission>,
  gradYear: string
}

export const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function minutesToTimeString(minutes: number) {
  return new Date((minutes + new Date().getTimezoneOffset()) * 60 * 1000).toLocaleTimeString(undefined, { timeStyle: "short" });
}

export function clubMeetingTimesToString(meetings: ClubMeetingTime[]) {
  return meetings?.map(m => {
    if (m.type === "time") return `${days[m.day]} ${minutesToTimeString(m.start)} - ${minutesToTimeString(m.end)}`;
    else if (m.type === "flex") return `Flex (${m.session})`;
  }).join(", ") ?? "Unknown";
}

/**
 * Get the name of the club president
 */
export function getClubPresidentName(officers: Officers) {
  // if they have an item called president, return it
  return Object.entries(officers)
    .find(el => el[1].role.toLowerCase() === "president")?.[1].name ??
    // otherwise, return the first item
    Object.values(officers)[0].name;
}

export function getClubPresidentEmail(officers: Officers) {
  // if they have an item called president, return it
  return atob(Object.entries(officers)
    .find(el => el[1].role.toLowerCase() === "president")?.[0] ??
    // otherwise, return the first item
    Object.keys(officers)[0]);
}

export type DocWithId<T> = T & { id: string };

export async function typedGetDocs<T>(query: Query<DocumentData, DocumentData>) {
  const docs = await getDocs(query);
  return docs.docs.map(el => ({
    id: el.id,
    ...el.data()
  } as DocWithId<T>));
}

export async function typedGetDoc<T>(ref: DocumentReference<DocumentData, DocumentData>) {
  const doc = await getDoc(ref);
  if (!doc.exists()) return null;
  return {
    ...doc.data(),
    id: doc.id
  } as DocWithId<T>;
}

export async function getClaims(auth: Auth) {
  if (auth.currentUser) return (await getIdTokenResult(auth.currentUser, false)).claims as UserClaims;
  else return null;
}

export function generateAttendanceCode() {
  const length = 8;
  const alphabet = [..."ABCDEFGHJKLMNPQRSTUVWXYZ23456789"];
  const code = Array(length).fill(0).map(() => {
    const idx = Math.floor(Math.random() * alphabet.length);
    return alphabet[idx];
  }).join("");
  return code;
}
