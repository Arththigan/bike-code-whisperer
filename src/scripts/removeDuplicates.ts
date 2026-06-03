import 'dotenv/config';
import { getDocs, collection, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase.ts";

/**
 * Remove duplicate DTC code documents from Firestore.
 * Rules:
 * 1. If a generic version (brandId "generic" or "global_obd2") of a code exists,
 *    delete all non‑generic entries for that same code.
 * 2. If no generic version exists, keep the earliest document (by `createdAt` if present)
 *    for each distinct `${brandId}_${code}` combination and delete the rest.
 */
async function removeDuplicates() {
  try {
    // Fetch all DTC code documents from Firestore
    const snapshot = await getDocs(collection(db, "dtc_codes"));
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // Group documents by normalized code (case‑insensitive)
    const codeGroups: Record<string, any[]> = {};
    for (const docItem of docs) {
      const codeKey = (docItem.code ?? "").toString().toUpperCase();
      if (!codeKey) continue;
      if (!codeGroups[codeKey]) codeGroups[codeKey] = [];
      codeGroups[codeKey].push(docItem);
    }

    const toDelete: string[] = [];

    // Process each group
    for (const codeKey in codeGroups) {
      const entries = codeGroups[codeKey];
      // Check for generic entry in this group
      const genericEntry = entries.find(e => e.brandId === "generic" || e.brandId === "global_obd2");
      if (genericEntry) {
        // Delete all non‑generic entries for this code
        for (const e of entries) {
          if (e.id && !(e.brandId === "generic" || e.brandId === "global_obd2")) {
            toDelete.push(e.id);
          }
        }
        continue;
      }

      // No generic entry: deduplicate by brandId + codeKey, keep earliest
      const brandMap: Record<string, any[]> = {};
      for (const e of entries) {
        const brandKey = `${e.brandId || ""}_${codeKey}`;
        if (!brandMap[brandKey]) brandMap[brandKey] = [];
        brandMap[brandKey].push(e);
      }
      for (const _key in brandMap) {
        const group = brandMap[_key];
        if (group.length <= 1) continue;
        // Sort by createdAt (oldest first). If missing, treat as newest.
        group.sort((a, b) => {
          const aTime = a.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;
          const bTime = b.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER;
          return aTime - bTime;
        });
        // Keep first, delete the rest
        const [, ...duplicates] = group;
        for (const dup of duplicates) {
          if (dup.id) toDelete.push(dup.id);
        }
      }
    }

    // Delete identified duplicates
    for (const id of toDelete) {
      await deleteDoc(doc(db, "dtc_codes", id));
      console.log(`Deleted duplicate code document ID: ${id}`);
    }
    console.log(`Duplicate cleanup complete. Deleted ${toDelete.length} document(s).`);
  } catch (e) {
    console.error("Error during duplicate removal:", e);
  }
}

removeDuplicates();
