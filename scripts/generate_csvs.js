import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const env = fs.readFileSync('.env', 'utf-8');
const key = env.split('\n').find(line => line.startsWith('VITE_GEMINI_API_KEY=')).split('=')[1].trim();

const genAI = new GoogleGenerativeAI(key);

const brands = [
  "Yamaha", "Honda", "TVS", "Bajaj", "KTM", "Suzuki", "BMW Motorrad", 
  "Royal Enfield", "Kawasaki", "Hero MotoCorp", "Piaggio", 
  "Ducati", "Triumph", "Harley-Davidson", "Aprilia", "Indian Motorcycle", 
  "Husqvarna", "Ather Energy", "Generic Motorcycle OBD2"
];

async function generateCSVForBrand(brand) {
  console.log(`Generating CSV for ${brand}...`);
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  
  const prompt = `
    You are an expert motorcycle diagnostic mechanic.
    Generate a highly comprehensive list of at least 30 to 50 known Diagnostic Trouble Codes (DTCs / Error Codes / Blink Codes) specifically for ${brand} motorcycles/scooters.
    
    If the brand uses standard P-codes (OBD2), include them but make them specific to how they manifest on ${brand}. If they use proprietary blink codes (like Honda MIL 12, Yamaha Er-1, Royal Enfield flash codes), include those.

    Output the result STRICTLY in CSV format with a header row. Do NOT wrap it in markdown blockquotes like \`\`\`csv. Just output raw text.
    
    The CSV must have EXACTLY these columns in this order:
    code,title,affectedPart,severity,problem,symptoms,actions,location

    Guidelines for columns:
    - code: The exact fault code (e.g., P0108, 12, Er-1)
    - title: Short description (e.g., Manifold Absolute Pressure Circuit High Input)
    - affectedPart: E.g., MAP Sensor, Fuel Injector, Throttle Body
    - severity: MUST be one of "info", "warning", or "critical"
    - problem: 1-2 sentence description of what the code means.
    - symptoms: 2-3 symptoms separated by a semicolon (;). Example: Engine stall; Poor idle; High RPM
    - actions: 2-3 step-by-step actions separated by a semicolon (;). Example: Check sensor wiring; Clean sensor; Replace if necessary
    - location: Where the part is located on the bike.

    Ensure proper escaping if you use commas inside values (wrap in double quotes).
  `;

  try {
    const result = await model.generateContent(prompt);
    const text = await result.response.text();
    
    const cleanText = text.replace(/```csv/g, '').replace(/```/g, '').trim();
    
    const filename = `csv_imports/${brand.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_codes.csv`;
    if (!fs.existsSync('csv_imports')) {
      fs.mkdirSync('csv_imports');
    }
    fs.writeFileSync(filename, cleanText);
    console.log(`✅ Saved ${filename}`);
  } catch (err) {
    console.error(`❌ Error generating for ${brand}: `, err.message);
  }
}

async function run() {
  for (const brand of brands) {
    await generateCSVForBrand(brand);
    // Wait a few seconds to avoid rate limits
    await new Promise(r => setTimeout(r, 4000));
  }
}

run();
