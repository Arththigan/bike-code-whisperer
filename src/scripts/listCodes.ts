import 'dotenv/config';
import { getDocs, collection } from "firebase/firestore";
import { db } from "../lib/firebase.ts";

async function listCodes() {
  try {
    console.log("Fetching codes from Firestore 'dtc_codes' collection...");
    const snapshot = await getDocs(collection(db, "dtc_codes"));
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
    console.log(`Successfully fetched ${docs.length} documents.`);
    if (docs.length > 0) {
      console.log("Sample documents (up to 10):");
      docs.slice(0, 10).forEach(doc => {
        console.log(`- ID: ${doc.id}, Brand: ${doc.brandId}, Code: ${doc.code}, Title: ${doc.title || doc.description || doc.meaning}`);
      });
      
      // Count by brandId
      const brandCounts: Record<string, number> = {};
      docs.forEach(doc => {
        const brand = doc.brandId || "unknown";
        brandCounts[brand] = (brandCounts[brand] || 0) + 1;
      });
      console.log("\nCounts by brandId:", brandCounts);
    }
  } catch (e) {
    console.error("Error during listing codes:", e);
  }
}

listCodes();
