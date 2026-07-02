import { GoogleGenerativeAI } from "@google/generative-ai";
import { type OBDCode, type Severity } from "@/data/obdCodes";
import { cacheAICode, getOBDTranslationCache, saveOBDTranslationCache, type OBDTranslationCache } from "./firebaseDb";

const getEnv = (key: string): string | undefined => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return import.meta.env[key];
  }
  if (typeof process !== "undefined" && process.env) {
    return process.env[key];
  }
  return undefined;
};

const API_KEY = getEnv("VITE_GEMINI_API_KEY") || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeCodeWithAI(brand: string, brandId: string, code: string, localContext?: any, language: string = "english"): Promise<OBDCode | null> {
  const maskedKey = API_KEY ? `${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)}` : "MISSING";
  console.log(`Analyzing ${code} for ${brand} (${brandId}) using Gemini AI (Key: ${maskedKey})...`);
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not defined in .env");
    return null;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  const contextPrompt = localContext 
    ? `Technical Context from Database: ${JSON.stringify(localContext)}`
    : "No local data found. Please use your technical knowledge and web search if needed.";

  const prompt = `
    You are an expert motorcycle diagnostic assistant. 
    Analyze the following OBD-II/DTC code for a ${brand} motorcycle.
    
    CODE: ${code}
    ${contextPrompt}

    Provide the details in a valid JSON format with the following keys:
    - "code": The code searched.
    - "title": A short title for the fault.
    - "affectedPart": The specific part of the bike affected.
    - "severity": One of "critical", "warning", or "info".
    - "problem": A concise description of the issue.
    - "symptoms": An array of strings describing symptoms.
    - "actions": An array of strings describing steps to fix it.
    - "location": A short description of where the part is usually located on a ${brand} bike.
    - "explanation": A detailed, easy-to-understand, step-by-step breakdown explaining what this fault means, what causes it, and how a mechanic should safely approach diagnosing and fixing it.

    IMPORTANT: Most modern motorcycles use standard OBD2 P-codes (e.g., P0444, P0300). Use the provided localContext first. If not found, use your expert knowledge.
    
    TRANSLATION RULE:
    Translate ALL text fields ("title", "affectedPart", "problem", "symptoms", "actions", "location", "explanation") into the target RESPONSE LANGUAGE.
    
    RESPONSE LANGUAGE: ${language.toUpperCase()}
    ${language === "tanglish" ? "Tanglish means writing Tamil words using English letters (e.g., 'Enjinil prachinai P0123 erpatullaathu. Idhu Throttle Position Sensor-ai baadhikkum...')." : ""}
    ${language === "tamil" ? "Respond ONLY in pure Tamil script (தமிழ்). Do not mix English words unless they are technical part names (e.g., 'திறன் குறைபாடு', 'வயரிங் செக் செய்யவும்')." : ""}
    ${language === "english" ? "Respond ONLY in standard technical English. Do not mix Tamil or Tanglish words." : ""}
    
    Return ONLY the JSON. Do not include markdown wraps or trailing text.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log("Gemini Raw Response:", text);
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("No JSON found in Gemini response");
      return null;
    }
    
    try {
      const data = JSON.parse(jsonMatch[0]);
      console.log("Parsed Gemini Data:", data);
      
      const obdCode: OBDCode = {
        code: data.code || code,
        title: data.title || "Diagnostic Result",
        affectedPart: data.affectedPart || "See problem description",
        severity: (data.severity as Severity) || "warning",
        problem: data.problem || "Information not available for this specific code.",
        symptoms: data.symptoms || ["Check engine light (MIL) is ON"],
        actions: data.actions || ["Consult service manual"],
        location: data.location || "Refer to service manual",
        explanation: data.explanation || undefined,
      };

      // Cache the AI result in Firebase for future lookups using the correct passed brandId
      cacheAICode({ ...obdCode, brandId, language }).catch(() => {});

      return obdCode;
    } catch (parseError) {
      console.error("Error parsing Gemini JSON:", parseError);
      return null;
    }
  } catch (error) {
    console.error("Gemini AI error:", error);
    return null;
  }
}

// ─── Card Translation ─────────────────────────────────────────────────────────
// Uses a server function so the Gemini API key stays server-side (never in browser).
// Result is stored in obd_translations collection for cache-first future reads.

import { translateCardViaServer } from "./translateServer";

export async function translateCardWithAI(
  brandId: string,
  code: OBDCode,
  targetLang: "tanglish" | "tamil"
): Promise<OBDTranslationCache | null> {
  console.log(`[translateCardWithAI] called for ${brandId}_${code.code}_${targetLang}`);

  // 1. Firestore cache check first — zero tokens used
  const cached = await getOBDTranslationCache(brandId, code.code, targetLang);
  if (cached) {
    console.log(`[translateCardWithAI] cache HIT — returning from obd_translations`);
    return cached;
  }
  console.log(`[translateCardWithAI] cache MISS — calling server function...`);

  try {
    // 2. Call server function — pass only plain serializable fields
    const translation = await (translateCardViaServer as any)({
      data: {
        brandId,
        targetLang,
        code: {
          code: code.code,
          title: code.title,
          problem: code.problem,
          affectedPart: code.affectedPart ?? "",
          symptoms: code.symptoms,
          actions: code.actions,
          location: code.location ?? "",
        },
      },
    }) as OBDTranslationCache;

    // 3. Save to obd_translations — future reads skip server call entirely
    saveOBDTranslationCache(translation).catch(() => {});

    return translation;
  } catch (e) {
    console.error("translateCardWithAI error:", e);
    return null;
  }
}

// ─── Diagnostic Guide ─────────────────────────────────────────────────────────
// Model waterfall fallback chain — tries each model silently on 429/error.
// Never cached, always fresh Tanglish. Mechanic never sees a failure.

// Model priority: highest quota first → fallback to next on rate limit
const GUIDE_MODEL_CHAIN = [
  "gemini-2.5-flash-lite", // 1,000 RPD free — primary
  "gemini-2.5-flash",      // 250 RPD free  — fallback 1
  "gemini-2.5-pro",        // 100 RPD free  — fallback 2
];

function isRateLimitError(e: unknown): boolean {
  if (!e) return false;
  const msg = String((e as any)?.message || e);
  return msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Too Many Requests");
}

export async function generateDiagnosticGuide(
  brand: string,
  code: string,
  title: string,
  problem: string
): Promise<string | null> {
  if (!API_KEY) return null;

  const prompt = `
You are a SENIOR motorcycle ECU diagnostic engineer with 20+ years of experience. Write a COMPREHENSIVE diagnostic guide for a workshop mechanic.

Bike Brand: ${brand}
Fault Code: ${code}
Fault Title: ${title}
Problem: ${problem}

Write ENTIRELY in TANGLISH (Tamil words written in English letters, mixed with English technical terms).
NO Tamil script. NO pure English paragraphs.

Use EXACTLY this format with these section headers and structure:

## Enna Problem Irukkunu

[3-4 sentences explaining what this code means technically, what the ECM detects, why it triggers. Be specific about the circuit/sensor involved.]

## Possible Causes

- **[Cause 1 name]:** [Detailed explanation of this cause in Tanglish]
- **[Cause 2 name]:** [Detailed explanation]
- **[Cause 3 name]:** [Detailed explanation]
- **[Cause 4 name]:** [Detailed explanation]
- **[Cause 5 name]:** [Detailed explanation]
- **[Cause 6 name]:** [Detailed explanation]

## Symptoms — Bike-la Enna Therium

- [Symptom 1 — what mechanic will observe]
- [Symptom 2]
- [Symptom 3]
- [Symptom 4]
- [Symptom 5]

## Tools Vennum

- **Multimeter:** [What to measure with it for this code]
- **OBD Scanner:** [What to check]
- **[Other tool if needed]:** [Purpose]

## Step-by-Step Diagnosis

**Step 1: Visual Inspection**
[Detailed steps for visual check — what exactly to look for]

**Step 2: Connector Check**
[How to check connectors, what to look for, cleaning procedure]

**Step 3: Voltage/Resistance Test**
[Exact multimeter readings — specify exact values like "5V reference vennum", "0.5-2 ohm resistance irukanum"]

**Step 4: Sensor Test**
[How to test the specific sensor/component for this code]

**Step 5: Wiring Continuity**
[How to test wiring harness for this code]

**Step 6: ECM Signal Test**
[How to verify ECM is sending/receiving correct signal]

[Add more steps as needed — minimum 8 steps total]

## Repair Procedure

**Option 1: [Most common fix]**
[Detailed repair steps]

**Option 2: [Second most common fix]**
[Detailed repair steps]

**Option 3: [Wiring repair if applicable]**
[Detailed repair steps]

## Code Clear Panna

[Steps to clear the DTC and verify the fix worked]

## Pro Tips — ${brand} Specific

- [Tip 1 specific to this brand/code combination]
- [Tip 2]
- [Tip 3]

Write every section FULLY with maximum detail. Each step must have enough detail for a mechanic to follow without any other reference.
  `.trim();

  for (const modelName of GUIDE_MODEL_CHAIN) {
    try {
      console.log(`[DiagnosticGuide] Trying model: ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          maxOutputTokens: 4096,
          temperature: 0.7,
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      console.log(`[DiagnosticGuide] Success with: ${modelName}`);
      return text;
    } catch (e) {
      if (isRateLimitError(e)) {
        console.warn(`[DiagnosticGuide] ${modelName} rate limited — trying next model...`);
        continue; // silently try next model
      }
      // Non-rate-limit error (network, auth, etc.) — still try next model
      console.warn(`[DiagnosticGuide] ${modelName} failed (${(e as any)?.message}) — trying next model...`);
      continue;
    }
  }

  // All models exhausted — return a helpful static fallback so mechanic is not stuck
  console.error("[DiagnosticGuide] All models exhausted — returning static fallback");
  return `**${code} - ${title}**\n\nIndha fault code ${brand} bike-la ${title.toLowerCase()} indicate panudhu.\n\n**Basic checks pannunga:**\n- Wiring connections-ai inspect pannunga\n- Connector corrosion check pannunga\n- Battery voltage verify pannunga (12.5V+ irukanum)\n- Related sensor resistance multimeter-la measure pannunga\n\n**Service manual-ai refer pannunga** — ${brand} specific procedures-ku manufacturer documentation paarunga.\n\nThoda detailed analysis-ku sila minutes wait panni retry pannunga.`;
}
