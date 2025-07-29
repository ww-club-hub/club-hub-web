import type { Timestamp } from "firebase/firestore";

export interface School {
  name: string,
  nameLowercase: string,
  domainRestriction?: string,
  website: string,

  // emails
  owner: string,
  admins: string[],
  members: string[]
}

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
  // club is not public yet
  Private,
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
  numMembers: number;
  attendanceRequirements: {
    memberPercentage: number;
    officerPercentage: number;
  };
  contact: {
    // Contact email
    email?: string,
    sponsor: string
  },
  signup: {
    type: ClubSignupType.Private
  } | {
    type: ClubSignupType.Open,
  } | {
    type: ClubSignupType.ApplicationRequired,
    formUrl: string
  }
}

// only availble to officers
export interface ClubPrivate {
  // emails
  members: string[],
}

export enum OfficerPermission {
  Officers = 1, // bit 0
  Members = 2, // bit 1
  Meetings = 4, // bit 2
  Messages = 8, // bit 3
  Forms = 16, // bit 4
  ClubDetails = 32, // bit 5
  All = ~(~0 << 6)
}

export interface ClubRole {
  stuco: boolean,
  officer: OfficerPermission,
  member: boolean
}

// /messages/{id}
export interface ClubUpdate {
  // email
  creator: string,
  title: string,
  description: string,
  timestamp: Timestamp,
  // map of url to title
  links: Record<string, string>
};

// /meetings/{id}
export interface ClubMeeting {
  location: string,
  startTime: Timestamp,
  endTime: Timestamp,
  description?: string,
  slides?: string,

  // used for only fetching meetings updated since a certain time
  lastUpdated: Timestamp
}

// /meeting_attendance/{id}
// cannot be read  by members
export interface ClubMeetingAttendance {
  // current code
  code: string,
  // lists of email
  membersPresent:string[],
  membersAttending: string[]
}

export interface ClubForm {
  formId: string,
  description: string,
  // ID of officer who manages this form
  // used for determining which OAuth key to use
  officerId: string
}
