import { GoogleGenerativeAI } from "@google/generative-ai";

// ─── Per-Feature Key Pool ─────────────────────────────────────────────────────
//
// Each feature (analysis, translation, guide) has its own pool of API keys.
// Keys are tried in order. On 429/403/quota error, next key is tried.
// After all keys exhausted on a model, next model in waterfall is tried.
//
// ENV VAR SCHEMA:
//   Analysis:    GEMINI_ANALYSIS_KEY_1, GEMINI_ANALYSIS_KEY_2, ...
//   Translation: GEMINI_TRANSLATE_KEY_1, GEMINI_TRANSLATE_KEY_2, ...
//   Guide:       GEMINI_GUIDE_KEY_1, GEMINI_GUIDE_KEY_2, ...
//
//   Fallback (if feature-specific keys not set):
//   GEMINI_API_KEY or VITE_GEMINI_API_KEY
//
// Currently you only have 1 key — set GEMINI_API_KEY and all 3 features
// will share it. When ready to add more keys, add feature-specific vars.
// ─────────────────────────────────────────────────────────────────────────────

export type AIFeature = "analysis" | "translation" | "guide";

/**
 * Read env var — tries both plain and VITE_ prefixed versions.
 * Vite only exposes VITE_-prefixed vars to the browser bundle,
 * so GEMINI_ANALYSIS_KEY_1 must also be tried as VITE_GEMINI_ANALYSIS_KEY_1.
 */
function readEnv(key: string): string {
  // Try plain key first (works in Node/server, and Vite SSR with process.env)
  if (typeof import.meta !== "undefined" && import.meta.env?.[key]) {
    return import.meta.env[key] as string;
  }
  // Try VITE_ prefixed version (required for browser-side Vite bundles)
  const viteKey = key.startsWith("VITE_") ? key : `VITE_${key}`;
  if (typeof import.meta !== "undefined" && import.meta.env?.[viteKey]) {
    return import.meta.env[viteKey] as string;
  }
  // Node fallback (scripts, server functions)
  if (typeof process !== "undefined" && process.env?.[key]) {
    return process.env[key] as string;
  }
  if (typeof process !== "undefined" && process.env?.[viteKey]) {
    return process.env[viteKey] as string;
  }
  return "";
}

/** Collect all keys for a feature. Falls back to shared key if none set. */
export function getKeysForFeature(feature: AIFeature): string[] {
  const prefix =
    feature === "analysis"
      ? "GEMINI_ANALYSIS_KEY_"
      : feature === "translation"
        ? "GEMINI_TRANSLATE_KEY_"
        : "GEMINI_GUIDE_KEY_";

  const keys: string[] = [];

  // Collect up to 10 numbered keys — tries both plain and VITE_ prefixed
  for (let i = 1; i <= 10; i++) {
    const k = readEnv(`${prefix}${i}`);
    if (k) keys.push(k);
  }

  // If no feature-specific keys found, fall back to shared key
  if (keys.length === 0) {
    const shared =
      readEnv("GEMINI_API_KEY") ||
      readEnv("VITE_GEMINI_API_KEY");
    if (shared) keys.push(shared);
  }

  return keys;
}

/** Check if error is a rate-limit / auth / quota / server error worth retrying */
export function isRateLimitOrAuthError(e: unknown): boolean {
  const msg = String((e as any)?.message || e);
  return (
    msg.includes("429") ||
    msg.includes("403") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("Too Many Requests") ||
    msg.includes("Service Unavailable") ||
    msg.includes("overloaded") ||
    msg.includes("leaked") ||
    msg.includes("Forbidden")
  );
}

// ─── Model Chains per Feature ─────────────────────────────────────────────────
// Each feature uses a different model priority.
// Analysis & Guide: need best quality → pro as last resort
// Translation: flash is enough, no need for pro

const MODEL_CHAINS: Record<AIFeature, string[]> = {
  analysis: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"],
  translation: ["gemini-2.5-flash", "gemini-2.5-flash-lite"],
  guide: ["gemini-2.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-pro"],
};

export interface RunWithPoolOptions {
  feature: AIFeature;
  /** Called with a ready GoogleGenerativeAI instance + model name. Return result or throw. */
  run: (genAI: GoogleGenerativeAI, modelName: string) => Promise<string>;
  /** Optional extra generation config overrides per model (applied inside run if needed) */
}

/**
 * Run an AI call with full key-pool × model-waterfall fallback.
 *
 * Strategy:
 *   for each model in chain:
 *     for each key in pool:
 *       try → return on success
 *       on 429/quota → try next key
 *     all keys exhausted → try next model
 *   all models exhausted → return null
 */
export async function runWithKeyPool(options: RunWithPoolOptions): Promise<string | null> {
  const { feature, run } = options;
  const keys = getKeysForFeature(feature);
  const models = MODEL_CHAINS[feature];

  if (keys.length === 0) {
    console.error(`[aiKeyPool] No API keys found for feature: ${feature}`);
    return null;
  }

  for (const modelName of models) {
    for (const key of keys) {
      try {
        const genAI = new GoogleGenerativeAI(key);
        const result = await run(genAI, modelName);
        console.log(`[aiKeyPool:${feature}] ✓ model=${modelName}`);
        return result;
      } catch (e) {
        if (isRateLimitOrAuthError(e)) {
          console.warn(`[aiKeyPool:${feature}] 429/quota on model=${modelName} — trying next key/model`);
          continue;
        }
        // Non-rate-limit error (bad response, parse error, etc.) — try next key anyway
        console.warn(`[aiKeyPool:${feature}] error on model=${modelName}:`, (e as any)?.message);
        continue;
      }
    }
  }

  console.warn(`[aiKeyPool:${feature}] All keys + models exhausted → fallback`);
  return null;
}
