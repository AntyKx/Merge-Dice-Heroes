/**
 * Same Firebase project as the game client (client/src/game/firebase.ts) --
 * this panel only needs Google sign-in as an identity provider. Whether the
 * signed-in uid is actually an admin is enforced server-side by the Worker
 * (ADMIN_UIDS secret), not here; this file just gets a verified ID token.
 */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from "firebase/auth";
import type { User } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyApfZ7jmTr1LCozcBId33NNnR0sJYvcwm8",
  authDomain: "merge-dice-heroes.firebaseapp.com",
  projectId: "merge-dice-heroes",
  storageBucket: "merge-dice-heroes.firebasestorage.app",
  messagingSenderId: "615214188779",
  appId: "1:615214188779:web:47783a03efb38da3bc16ae",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export type { User };
export { onAuthStateChanged };

export function signIn(): Promise<unknown> {
  return signInWithPopup(auth, googleProvider);
}

export function signOutUser(): Promise<void> {
  return firebaseSignOut(auth);
}
