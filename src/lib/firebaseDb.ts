import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import type { OBDCode } from "@/data/obdCodes";

export interface FirebaseCode extends OBDCode {
  brandId: string;
  id?: string; // Firestore document ID
  createdAt?: any;
  isAIGenerated?: boolean;
}

const COL = "dtc_codes";

/** Subscribe to real-time updates for all Firestore codes (offline-first & instant) */
export function subscribeToFirebaseCodes(
  onUpdate: (codes: FirebaseCode[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, COL),
    (snapshot) => {
      const codes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseCode));
      onUpdate(codes);
    },
    (error) => {
      console.error("Firestore subscription error:", error);
      if (onError) onError(error);
    }
  );
}

/** Fetch all codes from Firestore */
export async function fetchAllFirebaseCodes(): Promise<FirebaseCode[]> {
  try {
    const snapshot = await getDocs(collection(db, COL));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseCode));
  } catch (e) {
    console.error("Firebase fetchAllCodes error:", e);
    return [];
  }
}

/** Lookup a specific code+brand from Firestore */
export async function lookupFirebaseCode(
  brandId: string,
  code: string
): Promise<FirebaseCode | null> {
  try {
    const q = query(
      collection(db, COL),
      where("code", "==", code.toUpperCase()),
      where("brandId", "in", [brandId, "generic", "global_obd2"])
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as FirebaseCode;
  } catch (e) {
    console.error("Firebase lookupCode error:", e);
    return null;
  }
}

/** Add a new code to Firestore with deterministic ID and smart merge conflict resolution */
export async function addFirebaseCode(code: FirebaseCode): Promise<string> {
  const docId = `${code.brandId}_${code.code.toUpperCase()}`;
  const docRef = doc(db, COL, docId);
  
  // Try to see if this code already exists to prevent duplicate/overwrite conflicts
  let existingData = {};
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      existingData = snap.data();
    }
  } catch (err) {
    console.warn("Could not check existing document (offline?), proceeding with safe merge", err);
  }

  const payload = {
    ...existingData, // Preserve any extra metadata
    ...code,
    code: code.code.toUpperCase(),
    isAIGenerated: false, // Manual save takes priority and marks it as official/human-verified
    createdAt: serverTimestamp(),
  };
  delete payload.id;

  await setDoc(docRef, payload, { merge: true });
  return docId;
}

/** Bulk import codes (used for CSV import and seeding) with smart merge, progress callback, and cancel support */
export async function bulkImportCodes(
  codes: FirebaseCode[],
  onProgress?: (current: number, total: number) => void,
  cancelRef?: { current: boolean }
): Promise<number> {
  let count = 0;
  const total = codes.length;
  for (const code of codes) {
    // Check if cancellation was requested
    if (cancelRef?.current) {
      console.warn("Bulk import cancelled by user");
      break;
    }
    try {
      const docId = `${code.brandId}_${code.code.toUpperCase()}`;
      await setDoc(doc(db, COL, docId), {
        ...code,
        code: code.code.toUpperCase(),
        isAIGenerated: code.isAIGenerated ?? false,
        createdAt: serverTimestamp(),
      }, { merge: true }); // Use merge: true to avoid breaking manually customized properties
      count++;
      if (onProgress) {
        onProgress(count, total);
      }
    } catch (e) {
      console.error("Error importing code:", code.code, e);
    }
  }
  return count;
}

/** Delete a code from Firestore by document ID */
export async function deleteFirebaseCode(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Save an AI-generated code to Firestore as cache */
export async function cacheAICode(code: FirebaseCode): Promise<void> {
  try {
    const docId = `${code.brandId}_${code.code.toUpperCase()}`;
    await setDoc(doc(db, COL, docId), {
      ...code,
      code: code.code.toUpperCase(),
      isAIGenerated: true,
      createdAt: serverTimestamp(),
    }, { merge: true });
  } catch (e) {
    console.error("Firebase cache error:", e);
  }
}
