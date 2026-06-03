// Test script to fetch all Firebase codes and log count
import { fetchAllFirebaseCodes } from '../src/lib/firebaseDb';

(async () => {
  try {
    const codes = await fetchAllFirebaseCodes();
    console.log('Fetched codes count:', codes.length);
    console.log('Sample:', codes.slice(0, 3));
  } catch (e) {
    console.error('Error fetching codes:', e);
  }
})();
