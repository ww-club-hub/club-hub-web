import { defineStore } from "pinia";
import { getClaims, typedGetDocs, type DocWithId } from "./utils";
import type { ClubMeeting } from "./schema";
import { openDB, type DBSchema } from "idb";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase";
import { collection, query, where } from "firebase/firestore";

type MeetingSection = [clubId: string, month: Date];

interface MeetingsDB extends DBSchema {
  meetings: {
    key: string; // id from DocWithId<ClubMeeting>
    value: DocWithId<ClubMeeting>;
    indexes: {
      lastUpdated: number;
      startTime: number;
    };
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
          store.createIndex("lastUpdated", ["lastUpdated", "seconds"]);
          store.createIndex("startTime", ["startTime", "seconds"]);
        }
        if (!db.objectStoreNames.contains("monthSyncTime")) {
          db.createObjectStore("monthSyncTime");
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

  // fetch meetings in this month that were updated after lastUpdated// fetch meetings in this month that were updated after lastUpdated
  // Calculate start and end of the month
  const monthStart = new Date(section[1].getFullYear(), section[1].getMonth(), 1);
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

const meetingStore = defineStore("meetings", {
  state: () => ({
    _initialized: false,
    loadedSections: new Set<MeetingSection>(),
    meetings: [] as DocWithId<ClubMeeting>[]
  }),
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
      const range = IDBKeyRange.upperBound([nowSeconds - 365 * 24 * 60 * 60]);
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
      const sectionsToLoad = sections.filter(el => !this.loadedSections.has(el));

      if (sectionsToLoad.length <= 0) return;

      const db = await getDB();
      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

      const tx = db.transaction(["meetings", "monthSyncTime"], "readwrite");
      const syncTimes = tx.objectStore("monthSyncTime");
      const newDocs: Promise<DocWithId<ClubMeeting>[]>[] = [];

      // Get last sync times for all sections to load
      for (const section of sectionsToLoad) {
        let lastSync = await syncTimes.get(section);
        if (!lastSync) lastSync = new Date(0);

        // more than two days ago
        if (lastSync < twoDaysAgo) {
          // fetch
          newDocs.push(fetchMeetingSection(section, lastSync));

          // update sync time
          await syncTimes.put(now, section);
        }

        // Mark all loaded sections as loaded
        this.loadedSections.add(section);
      }

      const newMeetings = await Promise.all(newDocs).then(d => d.flat());

      // Add new meetings to db and append to meetings
      for (const meeting of newMeetings) {
        await db.put("meetings", meeting);
        this.meetings.push(meeting);
      }
    },

    // temporarily add a meeting that was just created
    async addMeeting(meeting: DocWithId<ClubMeeting>) {
      this.meetings.push(meeting);
      const db = await getDB();
      await db.put("meetings", meeting);
    }
  }
});

export function useMeetings() {
  const store = meetingStore(...arguments);
  store.init();
  return store;
}
