import { GoogleGenerativeAI } from "@google/generative-ai";
import { type OBDCode, type Severity } from "@/data/obdCodes";
import { cacheAICode } from "./firebaseDb";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export async function analyzeCodeWithAI(brand: string, code: string, localContext?: any, language: string = "english"): Promise<OBDCode | null> {
  const maskedKey = API_KEY ? `${API_KEY.slice(0, 4)}...${API_KEY.slice(-4)}` : "MISSING";
  console.log(`Analyzing ${code} for ${brand} using Gemini AI (Key: ${maskedKey})...`);
  
  if (!API_KEY) {
    console.error("VITE_GEMINI_API_KEY is not defined in .env");
    return null;
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    const response = await result.response;
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

      // Cache the AI result in Firebase for future lookups
      const brandId = brand.toLowerCase().replace(/\s+/g, "");
      cacheAICode({ ...obdCode, brandId }).catch(() => {});

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
