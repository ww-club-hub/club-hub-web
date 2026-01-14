import { defineStore } from "pinia";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ref } from "vue";
import { auth } from "./firebase";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<User | null>(auth.currentUser);

  onAuthStateChanged(auth, newUser => {
    user.value = newUser;
  });

  return { user };
});
