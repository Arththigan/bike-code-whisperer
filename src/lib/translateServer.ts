import { createServerFn } from "@tanstack/react-start";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OBDTranslationCache } from "./firebaseDb";
import { getOBDGuideCache, saveOBDGuideCache } from "./firebaseDb";
import { runWithKeyPool, isRateLimitOrAuthError } from "./aiKeyPool";

// ─── Server-side key pool helper ──────────────────────────────────────────────
// translateServer.ts runs on the server (Node/Cloudflare), so we read keys
// directly from process.env using the same naming schema as aiKeyPool.ts.
// We re-implement a minimal version here because import.meta.env is not
// available in all server runtimes at module-eval time.

type ServerFeature = "analysis" | "translation" | "guide";

function getServerKeys(feature: ServerFeature): string[] {
  const prefix =
    feature === "analysis"
      ? "GEMINI_ANALYSIS_KEY_"
      : feature === "translation"
        ? "GEMINI_TRANSLATE_KEY_"
        : "GEMINI_GUIDE_KEY_";

  const env = (typeof process !== "undefined" && process.env) || ({} as Record<string, string | undefined>);

  const keys: string[] = [];
  for (let i = 1; i <= 10; i++) {
    // Try both plain and VITE_ prefixed (env file uses VITE_ prefix)
    const k = env[`${prefix}${i}`] || env[`VITE_${prefix}${i}`];
    if (k) keys.push(k);
  }

  if (keys.length === 0) {
    const shared = env["GEMINI_API_KEY"] || env["VITE_GEMINI_API_KEY"];
    if (shared) keys.push(shared);
  }

  return keys;
}

const SERVER_MODEL_CHAINS: Record<ServerFeature, string[]> = {
  analysis: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"],
  translation: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  // Guide starts with flash — flash-lite often 503s on long prompts
  guide: ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.5-pro"],
};

/** Run a server-side AI call with key-pool × model-waterfall fallback */
async function runServerAI(
  feature: ServerFeature,
  run: (genAI: GoogleGenerativeAI, modelName: string) => Promise<string>
): Promise<string | null> {
  const keys = getServerKeys(feature);
  const models = SERVER_MODEL_CHAINS[feature];

  if (keys.length === 0) {
    console.error(`[ServerAI] No keys for feature: ${feature}`);
    return null;
  }

  for (const modelName of models) {
    for (const key of keys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const result = await run(genAI, modelName);
        console.log(`[ServerAI:${feature}] ✓ model=${modelName}`);
        return result;
      } catch (e) {
        if (isRateLimitOrAuthError(e)) {
          console.warn(`[ServerAI:${feature}] 429/quota on model=${modelName} — next key/model`);
          continue;
        }
        console.warn(`[ServerAI:${feature}] error on model=${modelName}:`, (e as any)?.message);
        continue;
      }
    }
  }

  console.warn(`[ServerAI:${feature}] All keys + models exhausted`);
  return null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TranslateCardInput {
  brandId: string;
  code: {
    code: string;
    title: string;
    problem: string;
    affectedPart: string;
    symptoms: string[];
    actions: string[];
    location: string;
  };
  targetLang: "tanglish" | "tamil";
}

export interface GenerateGuideInput {
  brand: string;
  brandId: string;
  code: string;
  title: string;
  problem: string;
  _ts?: number;
  variation?: string;
}

export interface AnalyzeCodeInput {
  brand: string;
  brandId: string;
  code: string;
  language: string;
  localContext?: {
    title?: string;
    problem?: string;
    symptoms?: string[];
    actions?: string[];
    affectedPart?: string;
    location?: string;
    severity?: string;
  } | null;
}

// ─── Translation Server Function ──────────────────────────────────────────────
// Uses GEMINI_TRANSLATE_KEY_1..N key pool (falls back to GEMINI_API_KEY).
// Runs on server — API keys never reach the browser.

export const translateCardViaServer = createServerFn({ method: "POST" })
  .inputValidator((d: TranslateCardInput) => d)
  .handler(async (ctx): Promise<OBDTranslationCache> => {
    const { brandId, code, targetLang } = ctx.data;

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

    const raw = await runServerAI("translation", async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    if (!raw) throw new Error("Translation failed — all keys and models exhausted");

    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Gemini translation response");

    const d = JSON.parse(jsonMatch[0]);

    return {
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
  });

// ─── Diagnostic Guide Server Function ────────────────────────────────────────
// Uses GEMINI_GUIDE_KEY_1..N key pool (falls back to GEMINI_API_KEY).
// NOW WITH FIREBASE CACHE:
//   1. Check obd_guides collection first → return instantly if found
//   2. If not cached → call AI → save to obd_guides → return
//   Same popular code searched by 100 users = 1 AI call total.

export const generateGuideViaServer = createServerFn({ method: "POST" })
  .inputValidator((d: GenerateGuideInput) => d)
  .handler(async (ctx): Promise<string> => {
    const { brand, brandId, code, title, problem, variation } = ctx.data;

    // 1. Check Firebase guide cache first
    try {
      const cached = await getOBDGuideCache(brandId, code);
      if (cached?.guide) {
        console.log(`[GuideServer] Cache hit: ${brandId}_${code}`);
        return cached.guide;
      }
    } catch (e) {
      console.warn("[GuideServer] Cache lookup failed, proceeding to AI:", (e as any)?.message);
    }

    // 2. Generate via AI with key-pool × model-waterfall
    const prompt = buildGuidePrompt(brand, code, title, problem, variation);

    const guide = await runServerAI("guide", async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { maxOutputTokens: 4096, temperature: 2.0 },
      });
      const result = await model.generateContent(prompt);
      return result.response.text();
    });

    if (!guide) {
      console.warn("[GuideServer] All keys + models exhausted — static fallback");
      return buildStaticFallback(brand, code, title);
    }

    // 3. Save to Firebase cache (fire-and-forget)
    saveOBDGuideCache({ code, brandId, brand, guide }).catch((e) =>
      console.warn("[GuideServer] Guide cache save failed:", (e as any)?.message)
    );

    return guide;
  });

// ─── Analyze Code Server Function ────────────────────────────────────────────
// Uses GEMINI_ANALYSIS_KEY_1..N key pool (falls back to GEMINI_API_KEY).
// Result is cached to dtc_codes collection by the caller (index.tsx).

export const analyzeCodeViaServer = createServerFn({ method: "POST" })
  .inputValidator((d: AnalyzeCodeInput) => d)
  .handler(async (ctx): Promise<{
    code: string; title: string; affectedPart: string; severity: string;
    problem: string; symptoms: string[]; actions: string[];
    location: string; explanation?: string;
  } | null> => {
    const { brand, code, language, localContext } = ctx.data;

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

    const raw = await runServerAI("analysis", async (genAI, modelName) => {
      const model = genAI.getGenerativeModel({ model: modelName, generationConfig: { maxOutputTokens: 2048 } });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON in response");
      return match[0];
    });

    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

// ─── Prompt Builders ──────────────────────────────────────────────────────────

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
- NO phrases like "romba varsham ah", "ungaluku theriyum", "nalla theriyum", "experience irukku"
- NO storytelling or personal introductions
- NO filler sentences — every sentence must be a technical instruction or fact
- Write like a technical manual, NOT like a person talking to an audience
- First word of every section must be a technical term or action word

Use EXACTLY this format:

## Enna Problem Irukkunu

[3-4 sentences explaining what this code means technically, what the ECM detects, why it triggers. Be specific about the circuit/sensor involved.]

## Possible Causes

- **[Cause 1 name]:** [Detailed explanation in Tanglish]
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

- **Multimeter:** [What to measure for this code]
- **OBD Scanner:** [What to check]
- **[Other tool if needed]:** [Purpose]

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

**Step 7: [Additional step specific to this code]**
[Details]

**Step 8: [Additional step if needed]**
[Details]

## Repair Procedure

**Option 1: [Most common fix]**
[Detailed repair steps]

**Option 2: [Second fix]**
[Detailed repair steps]

**Option 3: Wiring Repair**
[If wiring is the cause]

## Code Clear Panna

[Steps to clear the DTC and verify the fix worked — include scan tool steps]

## Pro Tips — ${brand} Specific

- [Tip 1 specific to this brand and code]
- [Tip 2]
- [Tip 3]

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
