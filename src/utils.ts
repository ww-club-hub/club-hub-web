import type { ParsedToken } from "firebase/auth";

export type ClubMeetingTime = ClubMeetingDayTime | ClubMeetingFlex;

export interface ClubMeetingDayTime {
  type: "time",
  // [0, 7)
  day: number,
  // minutes since 12:00 AM
  start: number,
  end: number,
  // room number
  room: string
}

export interface ClubMeetingFlex {
  type: "flex",
  session: string
}

export type Officers = Record<string, {
  name: string,
  role: string,
  permissions: OfficerPermission
}>;

export enum ClubSignupType {
  // open to anyone
  Open,
  ApplicationRequired
}

export interface Club {
  id: string,
  name: string,
  description: string,
  topics: number[],
  logoUrl: string,
  // usual meeting time(s)
  meetings: ClubMeetingTime[],
  // map of email to name, role
  // this is the best way to do security rules queries
  officers: Officers,
  contact: {
    // Contact email
    email?: string,
    sponsor: string
  },
  signup: {
    type: ClubSignupType.Open,
  } | {
    type: ClubSignupType.ApplicationRequired,
    formUrl: string
  }

  // visible in search results
  public: boolean
}

// only availble to officers
export interface ClubPrivate {
  // emails
  members: string[]
}

export enum OfficerPermission {
  Officers = 1,
  Members = 2,
  Meetings = 4,
  Messages = 8,
  Forms = 16,
  ClubDetails = 32
}

export interface UserClaims extends ParsedToken {
  school: string,
  role: string,
  interests?: number[],
  memberOf: string[],
  // map of club id to permission bitmask
  officerOf: Record<string, OfficerPermission>
}

export const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function minutesToTimeString(minutes: number) {
  return new Date((minutes + new Date().getTimezoneOffset()) * 60 * 1000).toLocaleTimeString();
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
export function getClubPresident(officers: Officers) {
  // if they have an item called president, return it
  return Object.entries(officers)
    .find(el => el[1].role.toLowerCase() === "president")?.[1].name ??
    // otherwise, return the first item
    Object.values(officers)[0].name;
}
