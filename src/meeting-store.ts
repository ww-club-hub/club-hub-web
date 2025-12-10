import { defineStore } from "pinia";
import { getClaims, typedGetDocs, type DocWithId } from "./utils";
import type { ClubMeeting } from "./schema";
import { openDB, unwrap, type DBSchema } from "idb";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { Timestamp, collection, query, where } from "firebase/firestore";
import api from "./api";
import { unref } from "vue";

type MeetingSection = [clubId: string, month: Date];
type ClubMeetingWithId = DocWithId<ClubMeeting> & { clubId: string };

interface MeetingsDB extends DBSchema {
  meetings: {
    key: string; // id from DocWithId<ClubMeeting>
    value: ClubMeetingWithId;
    indexes: {
      lastUpdated: number;
      endTime: number;
    };
  };
  meetingAttendance: {
    key: string;
    value: boolean;
  };
  monthSyncTime: {
    key: MeetingSection;
    value: Date;
  };
}
let meetingsDBPromise: Promise<import("idb").IDBPDatabase<MeetingsDB>> | null = null;

function getDB() {
  if (!meetingsDBPromise) {
    meetingsDBPromise = openDB<MeetingsDB>("meetings-db", 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("meetings")) {
          const store = db.createObjectStore("meetings", { keyPath: "id" });
          // These are Firestore Timestamp values
          store.createIndex("lastUpdated", "lastUpdated.seconds");
          store.createIndex("endTime", "endTime.seconds");
        }
        if (!db.objectStoreNames.contains("monthSyncTime")) {
          db.createObjectStore("monthSyncTime");
        }
        if (!db.objectStoreNames.contains("meetingAttendance")) {
          db.createObjectStore("meetingAttendance");
        }
      }
    });
  }
  return meetingsDBPromise;
}

async function fetchMeetingSection(section: MeetingSection, lastUpdated: Date) {
  const claims = await getClaims(auth);
  if (!claims) return [];
  const meetingsCollection = collection(db, "schools", claims.school, "clubs", section[0], "meetings");

  // fetch meetings in this month that were updated after lastUpdated
  // Calculate start and end of the month
  const monthStart = new Date(section[1].getFullYear(), section[1].getMonth());
  // start of the next month
  const monthEnd = new Date(section[1].getFullYear(), section[1].getMonth() + 1);

  const q = query(
    meetingsCollection,
    where("startTime", ">=", monthStart),
    where("startTime", "<", monthEnd),
    where("lastUpdated", ">", lastUpdated)
  );

  return await typedGetDocs<ClubMeeting>(q);
}

/**
 * lost in IDB serialization
 */
function fixMeetingTimestamps(meeting: ClubMeeting) {
  meeting.startTime = new Timestamp(meeting.startTime.seconds, meeting.startTime.nanoseconds);
  meeting.endTime = new Timestamp(meeting.endTime.seconds, meeting.endTime.nanoseconds);
  meeting.lastUpdated = new Timestamp(meeting.lastUpdated.seconds, meeting.lastUpdated.nanoseconds);
}

const meetingStore = defineStore("meetings", {
  state: () => ({
    _initialized: false,
    loadedSections: new Set<string>(), // json-stringified MeetingSection
    meetings: [] as ClubMeetingWithId[],
    meetingAttendance: new Map<string, boolean>()
  }),
  getters: {
    meetingsForClub: state => (clubId: string) => state.meetings.filter(el => el.clubId == clubId)
  },
  actions: {
    // clear loaded meetings and also wipe idb
    async clear() {
      this.loadedSections.clear();
      this.meetings = [];
      const db = await getDB();
      const tx = db.transaction(["meetings", "monthSyncTime"], "readwrite");
      await Promise.all([
        tx.objectStore("meetings").clear(),
        tx.objectStore("monthSyncTime").clear()
      ]);
      await tx.done;
    },

    async init() {
      if (this._initialized) return;
      this._initialized = true;

      // cleanup
      const db = await getDB();
      const tx = db.transaction("meetings", "readwrite");
      const store = tx.objectStore("meetings");
      const nowSeconds = Math.floor(Date.now() / 1000);
      // records older than one year ago
      const range = IDBKeyRange.upperBound(nowSeconds - 365 * 24 * 60 * 60);
      const lastUpdatedIndex = store.index("lastUpdated");

      // Delete meetings updated more than a year ago
      const oldMeetings = await lastUpdatedIndex.getAll(range);
      for (const meeting of oldMeetings) {
        await store.delete(meeting.id);
      }

      await tx.done;

      // clear db when user signs out
      if (!auth.currentUser) await this.clear();
      onAuthStateChanged(auth, async (currentUser) => {
        if (!currentUser)
          await this.clear();
      });
    },

    async loadSection(section: MeetingSection) {
      await this.loadSections([section]);
    },

    async loadSections(sections: MeetingSection[]) {
      // don't reload already loaded sections
      const sectionsToLoad = sections.filter(el => !this.loadedSections.has(JSON.stringify(el)));

      if (sectionsToLoad.length <= 0) return;

      const db = await getDB();
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const tx = db.transaction(["meetings", "monthSyncTime"], "readwrite");
      const syncTimes = tx.objectStore("monthSyncTime");
      const meetings = tx.objectStore("meetings");
      const newDocs: Promise<ClubMeetingWithId[]>[] = [];

      // Get last sync times for all sections to load
      for (const section of sectionsToLoad) {
        let lastSync = await syncTimes.get(section);
        if (!lastSync) lastSync = new Date(0);

        // more than two days ago
        if (lastSync < twoDaysAgo) {
          // fetch
          // Track clubId from section[0] through this
          newDocs.push(
            fetchMeetingSection(section, lastSync).then(meetings =>
              meetings.map(meeting => ({
                ...meeting,
                clubId: section[0]
              }))
            )
          );

          // update sync time
          await syncTimes.put(now, section);
        }

        // load old meetings
        const monthStart = new Date(section[1].getFullYear(), section[1].getMonth()).getTime() / 1000;
        // start of the next month
        const monthEnd = new Date(section[1].getFullYear(), section[1].getMonth() + 1).getTime() / 1000;
        // [monthStart, monthEnd)
        const range = IDBKeyRange.bound(monthStart, monthEnd, false, true);
        const oldMeetings = await meetings.index("endTime").getAll(range);
        oldMeetings.forEach(fixMeetingTimestamps);
        this.meetings.push(...oldMeetings);

        // Mark all loaded sections as loaded
        this.loadedSections.add(JSON.stringify(section));
      }

      await tx.done;

      const newMeetings = await Promise.all(newDocs).then(d => d.flat());

      // Add new meetings to db and append to meetings
      for (const meeting of newMeetings) {
        await db.put("meetings", meeting);
        // fix timestamp functions
        fixMeetingTimestamps(meeting);
        this.meetings.push(meeting);
      }

      // fetch and load attendance
      await this.fetchMissingAttendance();
      // Load attendance from IDB for all currently loaded meetings
      const attendanceTx = db.transaction("meetingAttendance", "readonly");
      const attendanceStore = attendanceTx.objectStore("meetingAttendance");

      // Get all meeting IDs currently loaded
      const loadedMeetingIds = this.meetings.map(meeting => meeting.id);

      // Fetch attendance for each loaded meeting and update the map
      for (const meetingId of loadedMeetingIds) {
        if (this.meetingAttendance.has(meetingId)) continue;
        const present = await attendanceStore.get(meetingId);
        if (typeof present === "boolean") {
          this.meetingAttendance.set(meetingId, present);
        }
      }

      await attendanceTx.done;
    },

    // temporarily add a meeting that was just created
    async addMeeting(meeting: DocWithId<ClubMeeting>, clubId: string) {
      // Ensure meeting has clubId properties
      const meetingWithId: ClubMeetingWithId = {
        ...meeting,
        clubId
      };
      this.meetings.push(unref(meetingWithId));
      const db = await getDB();
      await db.put("meetings", meetingWithId);
    },

    // set the attendance for a specific meeting (used when succesfully entering code)
    async setAttendance(meetingId: string, present: boolean) {
      const db = await getDB();
      await db.put("meetingAttendance", present, meetingId);
    },

    // fetch the attendance for all meetings without a fetched attendance
    async fetchMissingAttendance() {
      const db = await getDB();
      const tx1 = db.transaction(["meetings", "meetingAttendance"], "readwrite");
      const meetingsStore = tx1.objectStore("meetings");
      let attendanceStore = tx1.objectStore("meetingAttendance");

      // Only consider meetings that have ended (endTime at least 30 minutes ago)
      const nowSeconds = Math.floor(Date.now() / 1000);
      const endTimeIndex = meetingsStore.index("endTime");
      const endedMeetingIds = await endTimeIndex
        .getAll(IDBKeyRange.upperBound(Math.floor(nowSeconds - 30 * 60)))
        // get the meeting id
        .then(m => m.map(meeting => ({ id: meeting.id, clubId: meeting.clubId })));

      const meetingsWithAttendance = await attendanceStore.getAllKeys();

      await tx1.done;

      const meetingsMissingAttendance = endedMeetingIds.filter(
        meeting => !meetingsWithAttendance.includes(meeting.id)
      );
      if (meetingsMissingAttendance.length === 0) {
        // nothing to do
        return;
      }

      const { presentMeetings } = await api.club.attendance.query.query({
        meetings: meetingsMissingAttendance
      });

      // Re-create the transaction - after fetch
      const tx2 = db.transaction("meetingAttendance", "readwrite");
      attendanceStore = tx2.objectStore("meetingAttendance");

      // Mark attendance in IDB
      for (const meeting of meetingsMissingAttendance) {
        const present = presentMeetings.includes(meeting.id);
        await attendanceStore.put(present, meeting.id);
      }

      await tx2.done;
    }
  }
});

export function useMeetings() {
  const store = meetingStore(...arguments);
  store.init();
  return store;
}
