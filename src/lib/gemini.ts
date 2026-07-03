// ─── gemini.ts ────────────────────────────────────────────────────────────────
// NO API key in this file — all Gemini calls go through server functions.
// Key stays server-side only (translateServer.ts).

import { type OBDCode, type Severity } from "@/data/obdCodes";
import { cacheAICode, getOBDTranslationCache, saveOBDTranslationCache, type OBDTranslationCache } from "./firebaseDb";
import { translateCardViaServer, generateGuideViaServer, analyzeCodeViaServer } from "./translateServer";

// ─── Main OBD Code Analysis ───────────────────────────────────────────────────
export async function analyzeCodeWithAI(
  brand: string,
  brandId: string,
  code: string,
  localContext?: any,
  language: string = "english"
): Promise<OBDCode | null> {
  try {
    const data = await (analyzeCodeViaServer as any)({
      data: {
        brand,
        brandId,
        code,
        language,
        localContext: localContext ? {
          title: localContext.title,
          problem: localContext.problem,
          symptoms: localContext.symptoms,
          actions: localContext.actions,
          affectedPart: localContext.affectedPart,
          location: localContext.location,
          severity: localContext.severity,
        } : null,
      },
    });

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
      explanation: data.explanation || undefined,
    };

    cacheAICode({ ...obdCode, brandId, language }).catch(() => {});
    return obdCode;
  } catch (e) {
    console.error("[analyzeCodeWithAI] error:", e);
    return null;
  }
}

// ─── Card Translation ─────────────────────────────────────────────────────────
export async function translateCardWithAI(
  brandId: string,
  code: OBDCode,
  targetLang: "tanglish" | "tamil"
): Promise<OBDTranslationCache | null> {
  const cached = await getOBDTranslationCache(brandId, code.code, targetLang);
  if (cached) return cached;

  try {
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

    saveOBDTranslationCache(translation).catch(() => {});
    return translation;
  } catch (e) {
    console.error("[translateCardWithAI] error:", e);
    return null;
  }
}

// ─── Diagnostic Guide ─────────────────────────────────────────────────────────
const GUIDE_VARIATIONS = [
  "Focus more on electrical testing procedures this time.",
  "Focus more on mechanical inspection steps this time.",
  "Focus more on sensor replacement procedure this time.",
  "Focus more on wiring harness diagnosis this time.",
  "Focus more on ECM/ECU verification steps this time.",
  "Focus more on connector and ground point checks this time.",
  "Focus more on step-by-step multimeter readings this time.",
  "Focus more on visual inspection techniques this time.",
];

export async function generateDiagnosticGuide(
  brand: string,
  code: string,
  title: string,
  problem: string
): Promise<string | null> {
  const variation = GUIDE_VARIATIONS[Math.floor(Math.random() * GUIDE_VARIATIONS.length)];

  try {
    const result = await (generateGuideViaServer as any)({
      data: { brand, code, title, problem, _ts: Date.now(), variation },
    }) as string;
    return result || null;
  } catch (e) {
    console.error("[generateDiagnosticGuide] error:", e);
    return `## ${code} — ${title}\n\n**Basic checks pannunga:**\n- Wiring connections-ai inspect pannunga\n- Connector corrosion check pannunga\n- Battery voltage verify pannunga (12.5V+)\n- Service manual refer pannunga`;
  }
}
