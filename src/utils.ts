import type { ParsedToken } from "firebase/auth";
import type { ClubMeetingTime, OfficerPermission, Officers } from "./schema";

export interface UserClaims extends ParsedToken {
  school: string,
  role: string,
  interests?: number[],
  memberOf: string[],
  // map of club id to permission bitmask
  officerOf: Record<string, OfficerPermission>
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
