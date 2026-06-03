import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, limit, query } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Manually parse .env file
const envPath = path.resolve(process.cwd(), ".env");
const envConfig = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join("=").trim().replace(/(^['"]|['"]$)/g, "");
      envConfig[key] = val;
    }
  });
}

const firebaseConfig = {
  apiKey: envConfig.VITE_FIREBASE_API_KEY,
  authDomain: envConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: envConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: envConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: envConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: envConfig.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function inspect() {
  console.log("Fetching all codes from Firestore...");
  const snap = await getDocs(collection(db, "dtc_codes"));
  console.log("Total fetched from Firestore:", snap.size);
  
  const brandCounts = {};
  const severityCounts = {};
  snap.forEach(doc => {
    const data = doc.data();
    const brand = data.brandId || "unknown";
    brandCounts[brand] = (brandCounts[brand] || 0) + 1;
    
    const severity = data.severity || "undefined";
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;
  });
  console.log("\nCounts by brandId in Firestore:", brandCounts);
  console.log("Counts by severity in Firestore:", severityCounts);
  
  if (snap.size > 0) {
    console.log("\nSample documents (up to 5):");
    snap.docs.slice(0, 5).forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id}, Brand: ${data.brandId}, Code: ${data.code}, Title: ${data.title}, Severity: ${data.severity}`);
    });
  }
  process.exit(0);
}

inspect().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
