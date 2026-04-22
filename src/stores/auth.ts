import { defineStore } from "pinia";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ref } from "vue";
import { auth } from "@/firebase";
import { getClaims, type UserClaims } from "@/utils";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(auth.currentUser);
  const claims = ref<UserClaims | null>(null);
  onAuthStateChanged(auth, async newUser => {
    user.value = newUser;
    claims.value = await getClaims(auth);
  });

  getClaims(auth).then(newClaims => {
    claims.value = newClaims;
  });

  return {
    user,
    claims
  };
});
