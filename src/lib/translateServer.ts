import { createServerFn } from "@tanstack/react-start";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OBDTranslationCache } from "./firebaseDb";

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

// ─── Server Function ──────────────────────────────────────────────────────────
// Runs on the server — API key never sent to browser.

export const translateCardViaServer = createServerFn({ method: "POST" })
  .inputValidator((d: TranslateCardInput) => d)
  .handler(async (ctx): Promise<OBDTranslationCache> => {
    const { brandId, code, targetLang } = ctx.data;

    const API_KEY =
      (typeof process !== "undefined" && process.env["VITE_GEMINI_API_KEY"]) || "";

    if (!API_KEY) throw new Error("GEMINI_API_KEY not configured on server");

    const genAI = new GoogleGenerativeAI(API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in Gemini response");

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
