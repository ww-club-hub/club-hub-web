import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type DocumentData, type DocumentReference, type DocumentSnapshot, getDocFromCache, getDocFromServer } from "firebase/firestore";

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
export const auth = getAuth(app);
export const db = getFirestore(app);

// setup emulators
if (import.meta.env.DEV) {
  connectAuthEmulator(auth, AUTH_EMULATOR, {
    disableWarnings: true
  });
  connectFirestoreEmulator(db, ...FIRESTORE_EMULATOR);
}

export async function tryGetDocFromCache<A, D extends DocumentData>(ref: DocumentReference<A, D>): Promise<DocumentSnapshot<A, D>> {
  try {
    return await getDocFromCache(ref);
  } catch {
    return await getDocFromServer(ref);
  }
}
