/**
 * Google sign-in (Firebase Authentication client only -- no Firestore/other
 * Firebase products). Cloud save/load itself goes through the separate
 * Cloudflare Worker in cloud/ (see cloudSync.ts), keyed by this module's
 * verified uid; Firebase here is purely the identity provider.
 *
 * The apiKey below is a public client identifier, not a secret -- Firebase's
 * own docs are explicit about this; access is actually controlled by
 * Authorized Domains (Firebase Console -> Authentication -> Settings) and
 * the Worker's own ID-token verification, not by hiding this value.
 */
import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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

/** Resolves once any pending redirect-based sign-in has been picked up --
 * call once on app start (before relying on auth.currentUser being settled). */
export function consumePendingRedirectResult(): Promise<void> {
  return getRedirectResult(auth)
    .then(() => undefined)
    .catch((error: { code?: string }) => {
      const code = error?.code ?? "";
      if (code && code !== "auth/null" && !code.includes("cancelled") && !code.includes("popup-closed")) {
        console.warn("Google sign-in redirect failed:", code);
      }
    });
}

/** Picks popup vs. redirect based on the environment, mirroring the pattern
 * from the earlier DiceHeroSpriteIntegratedGame_v2 project: PWA standalone
 * and desktop use popup (redirect would exit and not return to a standalone
 * PWA); in-app browsers (LINE/FB/IG webviews) and non-standalone iOS Safari
 * must use redirect since those environments block the popup outright. */
export async function signInWithGoogle(): Promise<void> {
  const ua = navigator.userAgent;
  const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
  const isInAppBrowser = /FBAN|FBAV|Line\/|Instagram/i.test(ua);
  const iosNeedsRedirect = !isStandalone && !isInAppBrowser && /iPhone|iPad|iPod/i.test(ua);

  if (isInAppBrowser || iosNeedsRedirect) {
    await signInWithRedirect(auth, googleProvider);
    return;
  }

  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    const code = (error as { code?: string })?.code ?? "";
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment" || code === "auth/web-storage-unsupported") {
      await signInWithRedirect(auth, googleProvider);
    } else if (code !== "auth/popup-closed-by-user" && code !== "auth/cancelled-popup-request") {
      throw error;
    }
  }
}

export function signOutOfGoogle(): Promise<void> {
  return firebaseSignOut(auth);
}
