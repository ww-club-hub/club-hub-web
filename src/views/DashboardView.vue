<script setup lang="ts">
import { auth, db } from '@/firebase';
import type { Club, ClubUpdate } from '@/schema';
import { type DocWithId, getClaims, typedGetDocs, typedGetDoc } from '@/utils';
import { collection, doc, limit, orderBy, query } from 'firebase/firestore';

type UpdateItem = {
  update: DocWithId<ClubUpdate>,
  club: DocWithId<Club>
}

// get all messages
const claims = (await getClaims(auth))!;

const clubs = [...(claims.memberOf ?? []), ...Object.keys(claims.officerOf ?? {})];

const myClubs = await Promise.all(clubs.map(async club => {
  const clubDoc = await typedGetDoc<Club>(doc(db, "schools", claims.school, "clubs", club));
  return clubDoc;
}));

const messages = (await Promise.all(clubs.map(async club => {
  // get most recent message
  const docs = await typedGetDocs<ClubUpdate>(
    query(
      collection(db, "schools", claims.school, "clubs", club, "messages"),
      orderBy("timestamp", "desc"),
      limit(1)
    )
  );

  if (docs.length > 0) {
    return {
      update: docs[0],
      club: myClubs.find(c => c.id === club)!
    }
  } else return null;
}))).filter((m: UpdateItem | null): m is UpdateItem => !!m);
</script>

  <template>
    <div class="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">

      <section class="grid grid-cols-5 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <!-- Messages -->
       <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-2">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-semibold text-gray-700 dark:text-white">Recent Messages</h2>
              <a href="#" class="text-blue-500 dark:text-blue-300">All Messages</a>
            </div>

          <!--  Messages from club officers: placeholders -->
            <div class="space-y-4">
              <div class="bg-white dark:bg-gray-700 p-4 rounded-lg shadow" v-for="message in messages">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="flex items-center">
                      <img v-if="message.club.logoUrl" :src="message.club.logoUrl" alt="Club icon" class="w-10 h-10 rounded-full mr-4">
                      <div>
                        <!-- TODO: resolve emails to name -->
                        <h3 class="text-lg font-semibold text-gray-700 dark:text-white">{{ message.club.name }}: {{ message.update.creator }}</h3>
                        <p class="text-sm text-gray-500 dark:text-gray-400">{{ message.update.timestamp.toDate().toLocaleString() }}</p>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center space-x-2">
                    <button class=" text-gray-700 dark:text-white">
                   envelope
                    </button>
                    <button class=" text-gray-700 dark:text-white">
                       X
                    </button>
                  </div>
                </div>
                <p class="text-gray-600 dark:text-gray-300 mt-2">{{ message.update.description }}</p>
              </div>
            </div>
        </div>

        <!--  My Clubs -->
        <div class="bg-white dark:bg-gray-800 p-6 rounded-lg shadow col-span-3">
          <h2 class="text-xl font-semibold text-gray-700 dark:text-white">My Clubs</h2>
          <div class="bg-white dark:bg-gray-800 p-6 rounded-lg col-span-3 grid grid-cols-2 grid-rows-2 gap-6">

            <!-- TODO: links/club icons -->
          <div class="bg-white dark:bg-gray-700 p-6 rounded-lg shadow" v-for="club in myClubs">
            <h3 class="text-xl font-semibold text-gray-700 dark:text-white">{{ club.name }}</h3>
          </div>
        </div>
        </div>

      </section>
    </div>
  </template>
