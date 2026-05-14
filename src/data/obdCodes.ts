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
}

export const SEVERITY_LABEL: Record<Severity, "Low" | "Medium" | "High"> = {
  info: "Low",
  warning: "Medium",
  critical: "High",
};

export const CUSTOM_KEY = "obd-decoder-custom-codes";

export interface CustomCode extends OBDCode {
  brandId: string;
}

export function loadCustomCodes(): CustomCode[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveCustomCodes(list: CustomCode[]) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(list));
}

export function addCustomCode(c: CustomCode) {
  const list = loadCustomCodes();
  const next = [c, ...list.filter((x) => !(x.code === c.code && x.brandId === c.brandId))];
  saveCustomCodes(next);
  return next;
}

export function deleteCustomCode(brandId: string, code: string) {
  const next = loadCustomCodes().filter((x) => !(x.code === code && x.brandId === brandId));
  saveCustomCodes(next);
  return next;
}

export function getAllCodes(): Array<OBDCode & { brandId: string }> {
  const built = Object.entries(CODES).flatMap(([brandId, list]) =>
    list.map((c) => ({ ...c, brandId })),
  );
  return [...loadCustomCodes(), ...loadCache(), ...built];
}

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
): OBDCode => ({ code, title, severity, problem, symptoms, actions, affectedPart, location });

export const CODES: Record<string, OBDCode[]> = {
  generic: [
    c("P1606", "Engine RPM Signal Switchover Malfunction", "critical", "Malfunction in the circuit responsible for switching or processing the engine RPM signal.", ["Engine stalling", "Incorrect RPM reading", "Starting issues"], ["Check RPM sensor wiring", "Inspect ECU connectors", "Verify signal with oscilloscope"], "Crankshaft Position Sensor / ECU", "Near the flywheel or alternator cover."),
    c("P1602", "Control Module Power Supply Malfunction", "critical", "The ECU detected an interruption or instability in its power supply.", ["Engine won't start", "Erratic idling", "Loss of memory settings"], ["Check main battery connections", "Inspect ECU ground points", "Test battery voltage"], "ECU / Power Supply Circuit", "Near the battery or ECU."),
    c("P1604", "Start Ability Malfunction", "critical", "The engine is failing to start under normal cranking conditions.", ["Engine cranks but won't start", "Delayed starting"], ["Check fuel system pressure", "Verify ignition spark", "Check crankshaft sensor"], "Engine Control System", "Engine bay."),
    c("P0122", "Throttle Position Sensor Signal Low", "warning", "The voltage signal from Throttle Position Sensor 'A' is lower than the expected range.", ["Poor acceleration", "Stalling at idle", "Jerking while riding"], ["Check TPS connector for corrosion", "Verify 5V reference voltage", "Adjust or replace TPS"], "Throttle Position Sensor (TPS)", "Mounted on the side of the throttle body."),
    c("P1502", "Immobilizer Communication Error", "critical", "The ECU has lost communication with the immobilizer unit.", ["Engine cuts out immediately after starting", "Immobilizer light flashing"], ["Check wiring between ECU and Immobilizer", "Resync keys", "Inspect key antenna"], "Immobilizer Control Unit", "Near the ignition switch or ECU."),
    c("P0261", "Cylinder 1 Injector Circuit Low", "critical", "The ECU detected low voltage or a short to ground in the fuel injector circuit for cylinder 1.", ["Engine misfire", "Loss of power", "Strong fuel smell"], ["Check injector wiring harness", "Test injector resistance", "Clean injector nozzle"], "Fuel Injector (Cylinder 1)", "Attached to the intake manifold, spraying into the cylinder head.")
  ]
};

export const CACHE_KEY = "obd-decoder-ai-cache";

export interface CachedCode extends OBDCode {
  brandId: string;
}

export function loadCache(): CachedCode[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveToCache(c: CachedCode) {
  const list = loadCache();
  const next = [c, ...list.filter((x) => !(x.code === c.code && x.brandId === c.brandId))];
  localStorage.setItem(CACHE_KEY, JSON.stringify(next));
}

export function lookupCode(brandId: string, query: string): OBDCode | null {
  const q = query.trim().toUpperCase();
  if (!q) return null;

  // 1. Check custom codes
  const customs = loadCustomCodes();
  const custom = customs.find(
    (c) => c.code.toUpperCase() === q && (c.brandId === brandId || c.brandId === "global_obd2"),
  );
  if (custom) return custom;

  // 2. Check AI cache
  const cache = loadCache();
  const cached = cache.find(
    (c) => c.code.toUpperCase() === q && (c.brandId === brandId || c.brandId === "global_obd2"),
  );
  if (cached) return cached;

  return null;
}

