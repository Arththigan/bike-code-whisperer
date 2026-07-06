import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  cacheAICode,
  getOBDTranslationCache,
  saveOBDTranslationCache,
  getOBDGuideCache,
  saveOBDGuideCache,
  type OBDTranslationCache,
} from "./firebaseDb";
import { getKeysForFeature, runWithKeyPool } from "./aiKeyPool";
import type { OBDCode, Severity } from "@/data/obdCodes";

// ─── gemini.ts — Client-side AI calls ─────────────────────────────────────────
// Runs directly in the browser using VITE_GEMINI_* keys from import.meta.env.
// Firebase cache is checked first on every call — AI is only called on cache miss.
// ─────────────────────────────────────────────────────────────────────────────

// ─── OBD Code Analysis ────────────────────────────────────────────────────────
export async function analyzeCodeWithAI(
  brand: string,
  brandId: string,
  code: string,
  language = "english"
): Promise<OBDCode | null> {
  const prompt = `
You are an expert motorcycle diagnostic assistant.
Analyze the following OBD-II/DTC code for a ${brand} motorcycle.

CODE: ${code}

Provide details in valid JSON with keys:
- "code", "title", "affectedPart", "severity" (critical/warning/info),
- "problem", "symptoms" (array), "actions" (array), "location", "explanation"

RESPONSE LANGUAGE: ${language.toUpperCase()}
${language === "tanglish" ? "Tanglish: Tamil words in English letters mixed with technical terms." : ""}
${language === "tamil" ? "Respond in pure Tamil script. Keep technical part names in English." : ""}
${language === "english" ? "Respond in standard technical English." : ""}

Return ONLY the JSON. No markdown.
  `.trim();

  const raw = await runWithKeyPool({
    feature: "analysis",
    run: async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 2048 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      return match[0];
    },
  });

  if (!raw) return null;

  let data: any;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }

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

  // Cache to Firestore so next search skips AI entirely
  cacheAICode({ ...obdCode, brandId, language, isAIGenerated: true }).catch(() => {});
  return obdCode;
}

// ─── Card Translation ─────────────────────────────────────────────────────────
export async function translateCardWithAI(
  brandId: string,
  code: OBDCode,
  targetLang: "tanglish" | "tamil"
): Promise<OBDTranslationCache | null> {
  // 1. Firebase cache check — only call AI on miss
  const cached = await getOBDTranslationCache(brandId, code.code, targetLang);
  if (cached) return cached;

  const langInstruction =
    targetLang === "tanglish"
      ? "Tanglish (Tamil words written in English letters mixed with English technical terms). Example: 'Indha sensor-la fault eruku, idha check pannunga. ECM signal kedaikala nu verify pannunga.'"
      : "Pure Tamil script (தமிழ்). Keep technical part names like sensor, ECM, relay in English.";

  const prompt = `
You are a motorcycle workshop assistant. Translate the following OBD fault code details into ${langInstruction}

Input JSON:
${JSON.stringify(
    {
      title: code.title,
      problem: code.problem,
      affectedPart: code.affectedPart ?? "",
      symptoms: code.symptoms,
      actions: code.actions,
      location: code.location ?? "",
    },
    null,
    2
  )}

Return ONLY a valid JSON object with exactly these keys:
- "title": translated string
- "problem": translated string
- "affectedPart": translated string
- "symptoms": array of translated strings
- "actions": array of translated strings
- "location": translated string

No markdown. No extra text. Only JSON.
  `.trim();

  const raw = await runWithKeyPool({
    feature: "translation",
    run: async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in translation response");
      return match[0];
    },
  });

  if (!raw) return null;

  let d: any;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }

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

  // Save to Firebase cache (fire-and-forget)
  saveOBDTranslationCache(translation).catch(() => {});
  return translation;
}

// ─── Diagnostic Guide ─────────────────────────────────────────────────────────
export async function generateDiagnosticGuide(
  brand: string,
  brandId: string,
  code: string,
  title: string,
  problem: string,
  forceRefresh = false
): Promise<string | null> {
  // 1. Firebase cache check — skip on forceRefresh
  if (!forceRefresh) {
    try {
      const cached = await getOBDGuideCache(brandId, code);
      if (cached?.guide) return cached.guide;
    } catch {}
  }

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
  const variation = variations[Math.floor(Math.random() * variations.length)];

  const prompt = `
You are a SENIOR motorcycle ECU diagnostic engineer. Write a TECHNICAL diagnostic guide for a workshop mechanic.

Bike Brand: ${brand}
Fault Code: ${code}
Fault Title: ${title}
Problem: ${problem}
Variation Focus: ${variation}

Write ENTIRELY in TANGLISH (Tamil words written in English letters, mixed with English technical terms).
NO Tamil script. NO pure English paragraphs.

STRICT TONE RULES — NEVER violate these:
- NO greetings like "Nanbargale", "Vanakkam", "Friends", "Vaanga" — start directly with technical content
- NO filler sentences — every sentence must be a technical instruction or fact
- Write like a technical manual, NOT like a person talking to an audience

Use EXACTLY this format:

## Enna Problem Irukkunu
[3-4 sentences explaining what this code means technically.]

## Possible Causes
- **[Cause 1]:** [explanation]
- **[Cause 2]:** [explanation]
- **[Cause 3]:** [explanation]
- **[Cause 4]:** [explanation]
- **[Cause 5]:** [explanation]

## Symptoms — Bike-la Enna Therium
- [Symptom 1]
- [Symptom 2]
- [Symptom 3]

## Tools Vennum
- **Multimeter:** [what to measure]
- **OBD Scanner:** [what to check]

## Step-by-Step Diagnosis
**Step 1: Visual Inspection** [details]
**Step 2: Connector Check** [details]
**Step 3: Voltage/Resistance Test** [exact values]
**Step 4: Sensor Test** [details]
**Step 5: Wiring Continuity** [details]

## Repair Procedure
**Option 1:** [most common fix]
**Option 2:** [second fix]

## Code Clear Panna
[steps to clear DTC]

## Pro Tips — ${brand} Specific
- [tip 1]
- [tip 2]
  `.trim();

  const guide = await runWithKeyPool({
    feature: "guide",
    run: async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 8192, temperature: 0.9 },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text || text.trim().length < 50) throw new Error("Empty response");
      return text;
    },
  });

  if (!guide) return null;

  // Save to Firebase cache (fire-and-forget, skip on forceRefresh)
  if (!forceRefresh) {
    saveOBDGuideCache({ code, brandId, brand, guide }).catch(() => {});
  }

  return guide;
}
