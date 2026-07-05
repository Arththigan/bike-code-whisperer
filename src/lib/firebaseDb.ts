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
import { db } from "./firebase.ts";
import { getAllBuiltInCodes, BRANDS, type OBDCode } from "@/data/obdCodes";

/** Check if a code is duplicate based on existing codes */
export function isDuplicateCode(existing: FirebaseCode[], newCode: FirebaseCode): boolean {
  const newCodeUpper = newCode.code.toUpperCase().trim();
  for (const code of existing) {
    const existingCodeUpper = (code.code || "").toUpperCase().trim();
    if (existingCodeUpper !== newCodeUpper) continue;
    // Same code, check brand rules
    if (code.brandId === newCode.brandId) return true;
    if (code.brandId === "generic" || newCode.brandId === "generic") return true;
    // Also handle global_obd2 alias as generic
    if (code.brandId === "global_obd2" || newCode.brandId === "global_obd2") return true;
  }
  return false;
}

export interface FirebaseCode extends OBDCode {
  brandId: string;
  id?: string; // Firestore document ID
  createdAt?: any;
  isAIGenerated?: boolean;
  isCustom?: boolean;
  language?: string;
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

/** Lookup a specific code+brand from Firestore with language support.
 *  Search order:
 *  1. Exact brand match (e.g. brandId="ktm")
 *  2. Generic / global_obd2 fallback — only if brand-specific not found
 *  Only calls AI if nothing found in either.
 */
export async function lookupFirebaseCode(
  brandId: string,
  code: string,
  language?: string
): Promise<FirebaseCode | null> {
  const codeUpper = code.toUpperCase();

  const pickBest = (docs: FirebaseCode[], lang?: string): FirebaseCode => {
    if (lang) {
      const match = docs.find((d) => d.language === lang);
      if (match) return match;
    }
    return docs.find((d) => !d.language || d.language === "english") || docs[0];
  };

  try {
    // 1. Brand-specific lookup
    const brandQ = query(
      collection(db, COL),
      where("code", "==", codeUpper),
      where("brandId", "==", brandId)
    );
    const brandSnap = await getDocs(brandQ);
    if (!brandSnap.empty) {
      const docs = brandSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseCode));
      return pickBest(docs, language);
    }

    // 2. Generic / global_obd2 fallback (skip if caller already asked for generic)
    if (brandId !== "generic" && brandId !== "global_obd2") {
      // Try both alias names in one query using 'in' operator
      const genericQ = query(
        collection(db, COL),
        where("code", "==", codeUpper),
        where("brandId", "in", ["generic", "global_obd2"])
      );
      const genericSnap = await getDocs(genericQ);
      if (!genericSnap.empty) {
        const docs = genericSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirebaseCode));
        return pickBest(docs, language);
      }
    }

    return null;
  } catch (e) {
    console.error("Firebase lookupCode error:", e);
    return null;
  }
}

/** Add a new code to Firestore with deterministic ID and smart merge conflict resolution */
export async function addFirebaseCode(code: FirebaseCode): Promise<string> {
  // Fetch all existing codes (Firebase + built‑in) for duplicate detection
  const [firebaseCodes, builtInCodes] = await Promise.all([
    fetchAllFirebaseCodes(),
    Promise.resolve(getAllBuiltInCodes().map((c) => ({ ...c, isCustom: false, isEditable: false } as FirebaseCode)))
  ]);
  const existing = [...firebaseCodes, ...builtInCodes];

  if (isDuplicateCode(existing, code)) {
    const brandName = BRANDS.find((b) => b.id === code.brandId)?.name ?? code.brandId;
    throw new Error(`Duplicate code: ${code.code.toUpperCase()} already exists for ${brandName}`);
  }

  const docId = `${code.brandId}_${code.code.toUpperCase()}`;
  const docRef = doc(db, COL, docId);
  
  // Preserve any existing document data (merge)
  let existingData = {};
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) existingData = snap.data();
  } catch (err) {
    console.warn("Could not check existing document (offline?), proceeding with safe merge", err);
  }

  const payload = {
    ...existingData,
    ...code,
    code: code.code.toUpperCase(),
    isAIGenerated: false,
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
  // Fetch existing codes once for duplicate detection (Firebase + built‑in)
  const [firebaseCodes, builtInCodes] = await Promise.all([
    fetchAllFirebaseCodes(),
    Promise.resolve(getAllBuiltInCodes().map((c) => ({ ...c, isCustom: false, isEditable: false } as FirebaseCode)))
  ]);
  const existing = [...firebaseCodes, ...builtInCodes];

  // Track codes processed in this batch to avoid intra‑batch duplicates
  const processedKeys = new Set<string>();

  let count = 0;
  const total = codes.length;
  for (const code of codes) {
    if (cancelRef?.current) {
      console.warn("Bulk import cancelled by user");
      break;
    }
    const key = `${code.brandId}_${code.code.toUpperCase()}`;
    // Skip if duplicate already exists in DB or within the current batch
    if (processedKeys.has(key) || isDuplicateCode(existing, code)) {
      console.warn(`Skipping duplicate code ${code.code} for brand ${code.brandId}`);
      continue;
    }
    processedKeys.add(key);
    try {
      await setDoc(doc(db, COL, key), {
        ...code,
        code: code.code.toUpperCase(),
        isAIGenerated: code.isAIGenerated ?? false,
        createdAt: serverTimestamp(),
      }, { merge: true });
      count++;
      if (onProgress) onProgress(count, total);
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

/** Remove duplicate codes from Firestore */
export async function removeDuplicateCodes(): Promise<number> {
  try {
    // Fetch all DTC code documents
    const snapshot = await getDocs(collection(db, COL));
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    // Group by normalized code (case‑insensitive)
    const groups: Record<string, any[]> = {};
    for (const docItem of docs) {
      const codeKey = (docItem.code ?? "").toString().toUpperCase();
      if (!codeKey) continue;
      if (!groups[codeKey]) groups[codeKey] = [];
      groups[codeKey].push(docItem);
    }
    const toDelete: string[] = [];
    for (const codeKey in groups) {
      const entries = groups[codeKey];
      const generic = entries.find(e => e.brandId === "generic" || e.brandId === "global_obd2");
      if (generic) {
        // Delete all non‑generic for this code
        for (const e of entries) {
          if (e.id && !(e.brandId === "generic" || e.brandId === "global_obd2")) {
            toDelete.push(e.id);
          }
        }
        continue;
      }
      // No generic: dedupe by brandId+code, keep earliest (by createdAt if present)
      const brandMap: Record<string, any[]> = {};
      for (const e of entries) {
        const brandKey = `${e.brandId || ""}_${codeKey}`;
        if (!brandMap[brandKey]) brandMap[brandKey] = [];
        brandMap[brandKey].push(e);
      }
      for (const _k in brandMap) {
        const group = brandMap[_k];
        if (group.length <= 1) continue;
        group.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;
          const bTime = b.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });
        const [, ...dups] = group;
        for (const dup of dups) if (dup.id) toDelete.push(dup.id);
      }
    }
    // Delete
    for (const id of toDelete) await deleteDoc(doc(db, COL, id));
    return toDelete.length;
  } catch (e) {
    console.error("Error removing duplicate codes", e);
    return 0;
  }
}

/** Save an AI-generated code to Firestore as cache (language-specific) */
export async function cacheAICode(code: FirebaseCode & { language?: string }): Promise<void> {
  try {
    const langSuffix = code.language && code.language !== "english" ? `_${code.language}` : "";
    const docId = `${code.brandId}_${code.code.toUpperCase()}${langSuffix}`;
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

// ─── obd_translations collection ─────────────────────────────────────────────
// Stores Gemini-translated OBD card content, keyed by brandId_code_lang
// So Gemini is only called once per code+language — all future reads hit cache.

export interface OBDTranslationCache {
  code: string;
  brandId: string;
  lang: string;
  title: string;
  problem: string;
  affectedPart: string;
  symptoms: string[];
  actions: string[];
  location: string;
  cachedAt?: any;
}

const TRANS_COL = "obd_translations";

/** Get cached translation from obd_translations collection */
export async function getOBDTranslationCache(
  brandId: string,
  code: string,
  lang: string
): Promise<OBDTranslationCache | null> {
  try {
    const docId = `${brandId}_${code.toUpperCase()}_${lang}`;
    const snap = await getDoc(doc(db, TRANS_COL, docId));
    if (!snap.exists()) return null;
    return snap.data() as OBDTranslationCache;
  } catch (e) {
    console.error("obd_translations get error:", e);
    return null;
  }
}

/** Save translated content to obd_translations collection */
export async function saveOBDTranslationCache(
  data: OBDTranslationCache
): Promise<void> {
  try {
    const docId = `${data.brandId}_${data.code.toUpperCase()}_${data.lang}`;
    await setDoc(doc(db, TRANS_COL, docId), {
      ...data,
      code: data.code.toUpperCase(),
      cachedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("obd_translations save error:", e);
  }
}

// ─── obd_guides collection ────────────────────────────────────────────────────
// Stores AI-generated diagnostic guides, keyed by brandId_code
// First user triggers AI generation → saved to Firestore
// All subsequent users get instant cached response → ZERO AI calls

const GUIDES_COL = "obd_guides";

export interface OBDGuideCache {
  code: string;
  brandId: string;
  brand: string;
  guide: string;
  cachedAt?: any;
}

/** Get cached diagnostic guide from obd_guides collection */
export async function getOBDGuideCache(
  brandId: string,
  code: string
): Promise<OBDGuideCache | null> {
  try {
    const docId = `${brandId}_${code.toUpperCase()}`;
    const snap = await getDoc(doc(db, GUIDES_COL, docId));
    if (!snap.exists()) return null;
    return snap.data() as OBDGuideCache;
  } catch (e) {
    console.error("obd_guides get error:", e);
    return null;
  }
}

/** Save AI-generated guide to obd_guides collection */
export async function saveOBDGuideCache(
  data: OBDGuideCache
): Promise<void> {
  try {
    const docId = `${data.brandId}_${data.code.toUpperCase()}`;
    await setDoc(doc(db, GUIDES_COL, docId), {
      ...data,
      code: data.code.toUpperCase(),
      cachedAt: serverTimestamp(),
    });
  } catch (e) {
    console.error("obd_guides save error:", e);
  }
}
