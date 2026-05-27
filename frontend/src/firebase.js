import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { getFirestore, doc, serverTimestamp, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const requiredConfig = {
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  messagingSenderId: firebaseConfig.messagingSenderId,
  appId: firebaseConfig.appId,
};

const missingKeys = Object.entries(requiredConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

export const firebaseReady = missingKeys.length === 0;
export const firebaseMissingKeys = missingKeys;

export const firebaseApp = firebaseReady ? initializeApp(firebaseConfig) : null;
export const auth = firebaseReady ? getAuth(firebaseApp) : null;
export const db = firebaseReady ? getFirestore(firebaseApp) : null;
export const googleProvider = new GoogleAuthProvider();
export const analyticsPromise = firebaseReady && firebaseConfig.measurementId
  ? isSupported().then((supported) => (supported ? getAnalytics(firebaseApp) : null))
  : Promise.resolve(null);

export async function ensureUserProfile(user, name = "") {
  if (!db || !user) return;
  const ref = doc(db, "users", user.uid);
  await setDoc(ref, {
    uid: user.uid,
    name: name || user.displayName || "",
    email: user.email || "",
    createdAt: serverTimestamp(),
  }, { merge: true });
}

export function createRecaptcha(containerId) {
  if (!auth) return null;
  return new RecaptchaVerifier(auth, containerId, {
    size: "normal",
  });
}

export async function sendPhoneOtp(phoneNumber, verifier) {
  return signInWithPhoneNumber(auth, phoneNumber, verifier);
}
