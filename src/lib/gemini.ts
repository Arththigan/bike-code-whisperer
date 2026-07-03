import { type OBDCode, type Severity } from "@/data/obdCodes";
import { cacheAICode, getOBDTranslationCache, saveOBDTranslationCache, type OBDTranslationCache } from "./firebaseDb";
import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

function getGenAI() {
  if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not set.");
    return null;
  }
  return new GoogleGenerativeAI(API_KEY);
}

function isRateLimitOrAuthError(e: unknown): boolean {
  const msg = String((e as any)?.message || e);
  return (
    msg.includes("429") ||
    msg.includes("403") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Too Many Requests") ||
    msg.includes("leaked") ||
    msg.includes("Forbidden")
  );
}

// ─── Main OBD Code Analysis ───────────────────────────────────────────────────
export async function analyzeCodeWithAI(
  brand: string,
  brandId: string,
  code: string,
  localContext?: any,
  language: string = "english"
): Promise<OBDCode | null> {
  const genAI = getGenAI();
  if (!genAI) return null;

  const contextPrompt = localContext
    ? `Technical Context from Database: ${JSON.stringify(localContext)}`
    : "No local data found. Use your technical knowledge.";

  const prompt = `
You are an expert motorcycle diagnostic assistant.
Analyze the following OBD-II/DTC code for a ${brand} motorcycle.

CODE: ${code}
${contextPrompt}

Provide details in valid JSON with keys:
- "code", "title", "affectedPart", "severity" (critical/warning/info),
- "problem", "symptoms" (array), "actions" (array), "location", "explanation"

RESPONSE LANGUAGE: ${language.toUpperCase()}
${language === "tanglish" ? "Tanglish: Tamil words in English letters mixed with technical terms." : ""}
${language === "tamil" ? "Respond in pure Tamil script. Keep technical part names in English." : ""}
${language === "english" ? "Respond in standard technical English." : ""}

Return ONLY the JSON. No markdown.
  `.trim();

  const models = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"];
  let data: any = null;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { maxOutputTokens: 2048 } });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        data = JSON.parse(match[0]);
        break;
      }
    } catch (e) {
      if (isRateLimitOrAuthError(e)) continue;
    }
  }

  if (!data) return null;

  const obdCode: OBDCode = {
    code: data.code || code,
    title: data.title || "Diagnostic Result",
    affectedPart: data.affectedPart || "See problem description",
    severity: (data.severity as Severity) || "warning",
    problem: data.problem || "Information not available for this specific code.",
    symptoms: data.symptoms || ["Check engine light (MIL) is ON"],
    actions: data.actions || ["Consult service manual"],
    location: data.location || "Refer to service manual",
    ...(data.explanation && { explanation: data.explanation }),
  };

  cacheAICode({ ...obdCode, brandId, language }).catch(() => {});
  return obdCode;
}

// ─── Card Translation ─────────────────────────────────────────────────────────
export async function translateCardWithAI(
  brandId: string,
  code: OBDCode,
  targetLang: "tanglish" | "tamil"
): Promise<OBDTranslationCache | null> {
  const cached = await getOBDTranslationCache(brandId, code.code, targetLang);
  if (cached) return cached;

  const genAI = getGenAI();
  if (!genAI) return null;

  const langInstruction =
    targetLang === "tanglish"
      ? "Tanglish (Tamil words written in English letters mixed with English technical terms). Example: 'Indha sensor-la fault eruku, idha check pannunga. ECM signal kedaikala nu verify pannunga.'"
      : "Pure Tamil script (தமிழ்). Keep technical part names like sensor, ECM, relay in English.";

  const prompt = `
You are a motorcycle workshop assistant. Translate the following OBD fault code details into ${langInstruction}

Input JSON:
${JSON.stringify({
    title: code.title,
    problem: code.problem,
    affectedPart: code.affectedPart ?? "",
    symptoms: code.symptoms,
    actions: code.actions,
    location: code.location ?? "",
  }, null, 2)}

Return ONLY a valid JSON object with exactly these keys:
- "title": translated string
- "problem": translated string
- "affectedPart": translated string
- "symptoms": array of translated strings
- "actions": array of translated strings
- "location": translated string

No markdown. No extra text. Only JSON.
  `.trim();

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Gemini response");

    const d = JSON.parse(jsonMatch[0]);

    const translation: OBDTranslationCache = {
      code: code.code,
      brandId,
      lang: targetLang,
      title: d.title ?? code.title,
      problem: d.problem ?? code.problem,
      affectedPart: d.affectedPart ?? code.affectedPart ?? "",
      symptoms: Array.isArray(d.symptoms) ? d.symptoms : code.symptoms,
      actions: Array.isArray(d.actions) ? d.actions : code.actions,
      location: d.location ?? code.location ?? "",
    };

    saveOBDTranslationCache(translation).catch(() => {});
    return translation;
  } catch (e) {
    console.error("[translateCardWithAI] error:", e);
    return null;
  }
}

// ─── Diagnostic Guide ─────────────────────────────────────────────────────────
function buildGuidePrompt(brand: string, code: string, title: string, problem: string, clientVariation?: string): string {
  const variations = [
    "Focus more on electrical testing procedures this time.",
    "Focus more on mechanical inspection steps this time.",
    "Focus more on sensor replacement procedure this time.",
    "Focus more on wiring harness diagnosis this time.",
    "Focus more on ECM/ECU verification steps this time.",
    "Focus more on connector and ground point checks this time.",
    "Focus more on step-by-step multimeter readings this time.",
    "Focus more on visual inspection techniques this time.",
  ];
  const variation = clientVariation || variations[Math.floor(Math.random() * variations.length)];

  return `
You are a SENIOR motorcycle ECU diagnostic engineer with 20+ years of experience. Write a COMPREHENSIVE diagnostic guide for a workshop mechanic.

Bike Brand: ${brand}
Fault Code: ${code}
Fault Title: ${title}
Problem: ${problem}
Variation Focus: ${variation}

Write ENTIRELY in TANGLISH (Tamil words written in English letters, mixed with English technical terms).
NO Tamil script. NO pure English paragraphs.

Use EXACTLY this format:

## Enna Problem Irukkunu

[3-4 sentences explaining what this code means technically, what the ECM detects, why it triggers. Be specific about the circuit/sensor involved.]

## Possible Causes

- **[Cause 1 name]:** [Detailed explanation in Tanglish]
- **[Cause 2 name]:** [Detailed explanation]
- **[Cause 3 name]:** [Detailed explanation]
- **[Cause 4 name]:** [Detailed explanation]

## Symptoms — Bike-la Enna Therium

- [Symptom 1 — what mechanic will observe]
- [Symptom 2]
- [Symptom 3]

## Tools Vennum

- **Multimeter:** [What to measure for this code]
- **OBD Scanner:** [What to check]

## Step-by-Step Diagnosis

**Step 1: Visual Inspection**
[Detailed steps — what exactly to look for]

**Step 2: Connector Check**
[How to check connectors, cleaning procedure]

**Step 3: Voltage/Resistance Test**
[Exact multimeter readings — specify exact values like "5V reference vennum", "0.5-2 ohm resistance irukanum"]

**Step 4: Sensor Test**
[How to test the specific sensor/component]

**Step 5: Wiring Continuity**
[How to test wiring harness]

**Step 6: ECM Signal Test**
[How to verify ECM signal]

## Repair Procedure

**Option 1: [Most common fix]**
[Detailed repair steps]

**Option 2: Wiring Repair**
[If wiring is the cause]

## Code Clear Panna

[Steps to clear the DTC and verify the fix worked — include scan tool steps]

## Pro Tips — ${brand} Specific

- [Tip 1 specific to this brand and code]
- [Tip 2]

Write every section with maximum detail. Each step must be complete enough to follow without any other reference.
  `.trim();
}

function buildStaticFallback(brand: string, code: string, title: string): string {
  return `## ${code} — ${title}

**Indha code varudhu endha ${title.toLowerCase()} related-a problem irukkunu indicate pannuthu.**

## Basic Checks Pannunga

- **Wiring Inspection:** Harness-ai visually inspect pannunga — chafing, melting, loose connections ellam check pannunga
- **Connector Check:** Related connector-ai disconnect panni corrosion, bent pins, moisture ellam parunga — WD40 spray panni reconnect pannunga
- **Battery Voltage:** Multimeter use panni battery voltage check pannunga — 12.5V+ irukanum, engine running-la 13.8-14.4V irukanum
- **Ground Points:** Engine earth straps tight-a irukka nu verify pannunga
- **Related Sensor Resistance:** Service manual-la spec parunga, multimeter-la measure pannunga

## Next Steps

**${brand} service manual-ai refer pannunga** — specific torque values, wiring diagrams, component locations ellam anga irukku.

Thoda detailed analysis-ku sila minutes wait panni "Refresh" click pannunga.`;
}

export async function generateDiagnosticGuide(
  brand: string,
  code: string,
  title: string,
  problem: string
): Promise<string | null> {
  const genAI = getGenAI();
  if (!genAI) return buildStaticFallback(brand, code, title);

  const prompt = buildGuidePrompt(brand, code, title, problem);
  const GUIDE_MODEL_CHAIN = ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"];

  for (const modelName of GUIDE_MODEL_CHAIN) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 4096, temperature: 2.0 },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (e) {
      if (isRateLimitOrAuthError(e)) continue;
    }
  }

  return buildStaticFallback(brand, code, title);
}
