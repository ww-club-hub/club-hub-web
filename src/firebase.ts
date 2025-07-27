import { FirebaseError, initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator, type DocumentData, type DocumentReference, type DocumentSnapshot, getDocFromCache, getDocFromServer, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, enablePersistentCacheIndexAutoCreation, getPersistentCacheIndexManager } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDxJBMjG56CZmrfpSzyAxS7OWGaUwzwJ0w",
  authDomain: "ww-club-hub.firebaseapp.com",
  projectId: "ww-club-hub",
  storageBucket: "ww-club-hub.firebasestorage.app",
  messagingSenderId: "77266016451",
  appId: "1:77266016451:web:caedaaced91a1136486a76"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

// setup emulators
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, AUTH_EMULATOR, {
    disableWarnings: true
  });
  connectFirestoreEmulator(db, ...FIRESTORE_EMULATOR);
}

enablePersistentCacheIndexAutoCreation(getPersistentCacheIndexManager(db)!);

export async function tryGetDocFromCache<A, D extends DocumentData>(ref: DocumentReference<A, D>): Promise<DocumentSnapshot<A, D>> {
  try {
    return await getDocFromCache(ref);
  } catch {
    return await getDocFromServer(ref);
  }
}

export function parseError(e: unknown): string {
  switch ((e as FirebaseError).code) {
    case "auth/email-already-in-use":
      return "The entered email is already in use";
    case "auth/weak-password":
      return "Password should be at least 6 characters";
    case "auth/user-not-found":
      return "A user with that email address does not exist";
    case "auth/wrong-password":
      return "Invalid password";
    default:
      return `An unknown error has occurred (${(e as Error).message})`;
  }
}
