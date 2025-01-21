<script setup lang="ts">
import { getIdTokenResult } from "firebase/auth";
import { auth, db } from "../firebase";
import { type Club, type UserClaims } from "@/utils";
import { useRoute, useRouter } from "vue-router";
import { doc, getDoc } from "firebase/firestore";

const router = useRouter();
const route = useRoute();

const clubId = route.params.clubId as string;

const claims = (await getIdTokenResult(auth.currentUser!)).claims as UserClaims;
const stuco = claims.role == "owner" || claims.role == "admin";
const officerOrMember = clubId in claims.officerOf || claims.memberOf.includes(clubId);

const showDashboardLink = stuco || officerOrMember;

const club = (await getDoc(doc(db, "schools", claims.school, "clubs", clubId))).data() as Club;

</script>

<template>
  <section class="bg-white dark:bg-gray-900 grow">
    <div class="max-w-screen-2xl mx-auto p-4">
      <div class="pb-3 mb-3 border-b border-gray-300 dark:border-gray-700">
        <h1 class="text-2xl text-black dark:text-white font-semibold mb-2">{{ club?.name }}</h1>
      </div>
    </div>
  </section>
</template>
