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

/**
 * Get the next date with the given day of week
 * @param targetDay Day of week index, in [0, 7]. 0 is Sunday (same as getDay())
 * @param fromDate Starting date
 */
export function getNextDayOfWeekDate(targetDay: number, fromDate: Date = new Date()): Date {
  const todayDay = fromDate.getDay();
  const daysToAdd = (targetDay - todayDay + 7) % 7;
  const resultDate = new Date(fromDate);
  resultDate.setDate(fromDate.getDate() + daysToAdd);
  return resultDate;
}

export function dateToISODateString(date: Date) {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a single ClubMeetingTime object into a human-readable string.
 */
export function formatMeetingTime(item: { type: "time", day: number, start: number, end: number, room: string } | { type: "flex", session: string }): string {
  if (item.type === "time") {
    const shortDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    // Convert start and end minutes to Date objects for locale formatting
    const startDate = new Date(0, 0, 0, Math.floor(item.start / 60), item.start % 60);
    const endDate = new Date(0, 0, 0, Math.floor(item.end / 60), item.end % 60);
    const startTimeStr = startDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    const endTimeStr = endDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${shortDays[item.day]} ${startTimeStr}-${endTimeStr} Room ${item.room}`;
  } else {
    return `Flex: ${item.session}`;
  }
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
  const b64Email = Object.entries(officers)
    .find(el => el[1].role.toLowerCase() === "president")?.[0] ??
    // otherwise, return the first item
    Object.keys(officers)[0];
  try {
    return atob(b64Email);
  } catch {
    // legacy emulator stuff
    return b64Email;
  }
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


export async function injectScript(src: string): Promise<void> {
	return new Promise((resolve, reject) => {
		if (!document.querySelector(`script[src="${src}"]`)) {
			document.head.appendChild(
				Object.assign(document.createElement("script"), {
					src,
					onload: resolve,
					onerror: reject,
				}),
			);
		} else {
			resolve();
		}
	});
}
