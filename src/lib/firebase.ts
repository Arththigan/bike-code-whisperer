import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, type Analytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

// Firebase config uses Vite environment variables with Node fallback for scripts
const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID"),
  measurementId: getEnv("VITE_FIREBASE_MEASUREMENT_ID"),
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export let analytics: Analytics | undefined;

if (typeof window !== "undefined") {
  console.log("🔥 [Firebase Client] Config resolved:", {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 5)}...` : "UNDEFINED",
    projectId: firebaseConfig.projectId ?? "UNDEFINED",
    appId: firebaseConfig.appId ?? "UNDEFINED",
    authDomain: firebaseConfig.authDomain ?? "UNDEFINED",
    measurementId: firebaseConfig.measurementId ?? "UNDEFINED",
  });
  if (firebaseConfig.measurementId) {
    try {
      analytics = getAnalytics(app);
    } catch (e) {
      console.warn("Analytics initialization failed:", e);
    }
  }
} else {
  console.log("🔥 [Firebase Server SSR] Config resolved:", {
    apiKey: firebaseConfig.apiKey ? `${firebaseConfig.apiKey.slice(0, 5)}...` : "UNDEFINED",
    projectId: firebaseConfig.projectId ?? "UNDEFINED",
    appId: firebaseConfig.appId ?? "UNDEFINED",
  });
}

// Export Firestore and Auth instances
export const db = getFirestore(app);
export const auth = getAuth(app);
