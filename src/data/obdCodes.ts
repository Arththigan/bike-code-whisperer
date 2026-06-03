export type Severity = "critical" | "warning" | "info";

export interface OBDCode {
  code: string;
  title: string;
  affectedPart?: string;
  severity: Severity;
  problem: string;
  symptoms: string[];
  actions: string[];
  category?: string;
  location?: string;
  causes?: string[];
  explanation?: string;
}

export const SEVERITY_LABEL: Record<Severity, "Low" | "Medium" | "High"> = {
  info: "Low",
  warning: "Medium",
  critical: "High",
};

export interface Brand {
  id: string;
  name: string;
  tagline?: string;
}

export const BRANDS: Brand[] = [
  { id: "yamaha", name: "Yamaha" },
  { id: "honda", name: "Honda" },
  { id: "tvs", name: "TVS" },
  { id: "bajaj", name: "Bajaj" },
  { id: "ktm", name: "KTM" },
  { id: "suzuki", name: "Suzuki" },
  { id: "bmw", name: "BMW" },
  { id: "royalenfield", name: "Royal Enfield" },
  { id: "kawasaki", name: "Kawasaki" },
  { id: "hero", name: "Hero" },
  { id: "piaggio", name: "Piaggio" },
  { id: "ducati", name: "Ducati" },
  { id: "triumph", name: "Triumph" },
  { id: "harleydavidson", name: "Harley-Davidson" },
  { id: "aprilia", name: "Aprilia" },
  { id: "indian", name: "Indian Motorcycle" },
  { id: "husqvarna", name: "Husqvarna" },
  { id: "ather", name: "Ather Energy" },
  { id: "generic", name: "Other / Generic" },
];

const c = (
  code: string,
  title: string,
  severity: Severity,
  problem: string,
  symptoms: string[],
  actions: string[],
  affectedPart?: string,
  location?: string,
  category?: string,
): OBDCode => ({ code, title, severity, problem, symptoms, actions, affectedPart, location, category });

// ─── Built-in DTC Code Dictionary ────────────────────────────────────────────
// These are pre-loaded codes that ship with the app.
// Additional codes added via the Code Base tab are stored in Firebase.
export const CODES: Record<string, OBDCode[]> = {};

// ─── Lookup from built-in CODES only ─────────────────────────────────────────
export function lookupCode(brandId: string, query: string): OBDCode | null {
  const q = query.trim().toUpperCase();
  if (!q) return null;

  // Try brand-specific first, then generic
  const brandList = CODES[brandId] || [];
  const genericList = CODES["generic"] || [];
  const combined = brandId === "generic" ? genericList : brandList;
  return combined.find((c) => c.code.toUpperCase() === q) || null;
}

// ─── Flatten all built-in codes ───────────────────────────────────────────────
export function getAllBuiltInCodes(): Array<OBDCode & { brandId: string }> {
  return Object.entries(CODES).flatMap(([brandId, list]) =>
    list.map((c) => ({ ...c, brandId })),
  );
}
