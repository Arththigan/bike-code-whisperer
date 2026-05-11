export type Severity = "critical" | "warning" | "info";

export interface OBDCode {
  code: string;
  title: string;
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

const CUSTOM_KEY = "obd-decoder-custom-codes";

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
  return [...loadCustomCodes(), ...built];
}

export interface Brand {
  id: string;
  name: string;
  tagline: string;
}

export const BRANDS: Brand[] = [
  { id: "yamaha", name: "Yamaha", tagline: "Revs Your Heart" },
  { id: "ktm", name: "KTM", tagline: "Ready to Race" },
  { id: "honda", name: "Honda", tagline: "The Power of Dreams" },
  { id: "tvs", name: "TVS", tagline: "Born Tough" },
  { id: "suzuki", name: "Suzuki", tagline: "Way of Life" },
  { id: "royalenfield", name: "Royal Enfield", tagline: "Pure Motorcycling" },
];

const c = (
  code: string,
  title: string,
  severity: Severity,
  problem: string,
  symptoms: string[],
  actions: string[],
): OBDCode => ({ code, title, severity, problem, symptoms, actions });

export const CODES: Record<string, OBDCode[]> = {
  yamaha: [
    c("12", "Crankshaft Position Sensor Fault", "critical",
      "Crank position sensor signal is missing. The ECU cannot read engine RPM.",
      ["Bike does not start", "Engine suddenly switches off", "Check engine light ON"],
      ["Check CKP sensor wiring", "Clean sensor connector", "Test sensor resistance (~200Ω–500Ω)", "Replace sensor if defective"]),
    c("13", "Intake Air Pressure Sensor Open", "warning",
      "MAP sensor open circuit. No air pressure reading available.",
      ["Rough idle", "Reduced mileage", "Weak acceleration"],
      ["Check MAP sensor connector", "Verify 5V supply", "Replace sensor"]),
    c("14", "Intake Air Pressure Sensor Stuck", "warning",
      "MAP sensor reading is stuck.",
      ["Engine jerks", "Black smoke from exhaust"],
      ["Inspect vacuum hose for cracks", "Clean or replace sensor"]),
    c("15", "Throttle Position Sensor Open", "warning",
      "TPS open circuit fault.",
      ["No throttle response", "Idle too high or too low"],
      ["Check TPS connector", "Adjust or replace TPS"]),
    c("16", "Throttle Position Sensor Stuck", "warning",
      "TPS reading does not change.",
      ["Acceleration is not smooth"],
      ["Replace TPS", "Reset ECU"]),
    c("21", "Coolant Temperature Sensor Fault", "info",
      "ECT sensor signal incorrect.",
      ["Hard cold start", "Fan continuously ON"],
      ["Check coolant level", "Test ECT sensor resistance", "Replace if faulty"]),
    c("22", "Intake Air Temp Sensor Fault", "info",
      "IAT sensor signal abnormal.",
      ["Slight mileage drop", "Minor performance loss"],
      ["Clean IAT sensor", "Check wiring", "Replace sensor"]),
    c("39", "Fuel Injector Fault", "critical",
      "Injector circuit open or shorted.",
      ["Bike does not start", "Misfire", "Smell of petrol"],
      ["Check injector connector", "Test injector resistance (~12Ω)", "Replace injector"]),
    c("41", "Lean Angle Sensor Fault", "warning",
      "Bike fall sensor signal abnormal.",
      ["Bike does not start after a fall"],
      ["Reset lean angle sensor", "Check connector", "Replace sensor"]),
    c("46", "Fuel Pump Relay Fault", "critical",
      "Fuel pump relay circuit fault.",
      ["No fuel pump prime sound", "No start"],
      ["Relay swap test", "Check wiring", "Replace relay"]),
  ],
  ktm: [
    c("P0220", "Throttle Position Sensor B Circuit", "warning",
      "Ride-by-wire 2nd TPS sensor fault.",
      ["Limp mode activates", "Power cut"],
      ["Check throttle body connector", "Replace TPS B", "ECU re-learn"]),
    c("P0230", "Fuel Pump Primary Circuit Fault", "critical",
      "Fuel pump relay or wiring problem.",
      ["No start", "Engine cuts out while riding"],
      ["Check fuel pump relay", "Verify pump fuse", "Replace pump"]),
    c("P0261", "Cylinder 1 Injector Low", "critical",
      "Injector circuit short to ground.",
      ["Misfire", "Hard start"],
      ["Check injector wiring", "Test injector resistance", "Replace injector"]),
    c("P0335", "Crankshaft Position Sensor Circuit", "critical",
      "CKP signal absent. No engine timing reference.",
      ["Bike does not start at all", "Sudden stall"],
      ["Clean CKP sensor connector", "Check air gap", "Replace sensor"]),
    c("P0351", "Ignition Coil A Primary Fault", "critical",
      "Ignition coil 1 circuit fault.",
      ["Misfire", "Power loss"],
      ["Check coil connector", "Check spark plug", "Replace coil"]),
    c("P0444", "EVAP Purge Valve Open Circuit", "info",
      "Evaporative emission valve fault.",
      ["No major issue, MIL ON"],
      ["Check purge valve wiring", "Replace valve"]),
    c("P0500", "Vehicle Speed Sensor Fault", "warning",
      "VSS signal not received.",
      ["Speedometer does not work", "ABS warning"],
      ["Check VSS connector", "Check sensor air gap", "Replace VSS"]),
    c("P0562", "System Voltage Low", "warning",
      "Battery voltage low to ECU.",
      ["Hard start", "Dim lights"],
      ["Battery test", "Check charging system (~14V)", "Replace R/R unit"]),
    c("P1601", "ECU Communication Fault", "critical",
      "CAN bus communication lost.",
      ["Multiple warnings", "Limp mode"],
      ["Check CAN wiring", "Clean connectors", "ECU diagnostics"]),
    c("P2138", "Throttle Pedal Sensor Correlation", "warning",
      "Twin TPS signals don't match.",
      ["Poor throttle response"],
      ["Replace TPS as a pair", "Reset ECU"]),
  ],
  honda: [
    c("1", "MAP Sensor Fault", "warning",
      "Manifold pressure signal abnormal.",
      ["Unstable idle", "Mileage drop"],
      ["Check MAP sensor", "Check vacuum line", "Replace sensor"]),
    c("7", "Engine Coolant Temp Sensor", "info",
      "ECT sensor abnormal reading.",
      ["Fan always ON", "Hard cold start"],
      ["ECT resistance test", "Check wiring", "Replace sensor"]),
    c("8", "Throttle Position Sensor", "warning",
      "TPS signal out of range.",
      ["Jerky throttle", "Idle issue"],
      ["Adjust or replace TPS", "Reset ECU"]),
    c("9", "Intake Air Temp Sensor", "info",
      "IAT signal incorrect.",
      ["Minor mileage drop"],
      ["Clean or replace IAT sensor"]),
    c("12", "Injector Fault", "critical",
      "Fuel injector circuit problem.",
      ["No start", "Misfire"],
      ["Check injector wiring", "Replace injector"]),
    c("21", "O2 Sensor Fault", "warning",
      "Oxygen sensor signal abnormal.",
      ["Reduced mileage", "Black smoke"],
      ["Check O2 sensor heater", "Replace sensor"]),
    c("23", "O2 Sensor Heater Fault", "info",
      "Heater circuit open.",
      ["MIL ON, mileage drop"],
      ["Check heater fuse", "Replace sensor"]),
    c("33", "ECM EEPROM Fault", "critical",
      "ECU memory error.",
      ["Random faults"],
      ["Reset ECU", "Replace ECU"]),
    c("54", "Bank Angle Sensor", "warning",
      "Tip-over sensor fault.",
      ["No start after a fall"],
      ["Reset BAS", "Replace sensor"]),
    c("86", "Serial Communication Fault", "warning",
      "ECU-Cluster communication lost.",
      ["Cluster blank or showing errors"],
      ["Check wiring", "Replace cluster"]),
  ],
  tvs: [
    c("P0030", "O2 Sensor Heater Circuit", "info",
      "Oxygen sensor heater circuit fault.",
      ["MIL ON", "Slight mileage loss"],
      ["Check heater wiring", "Replace O2 sensor"]),
    c("P0107", "MAP Sensor Low Voltage", "warning",
      "MAP sensor signal below range.",
      ["Rough idle", "Black smoke"],
      ["Check sensor connector", "Replace sensor"]),
    c("P0113", "IAT Sensor High Voltage", "info",
      "Intake air temp signal too high.",
      ["Mileage drop"],
      ["Clean or replace IAT"]),
    c("P0118", "ECT Sensor High Voltage", "warning",
      "Coolant temp signal abnormal.",
      ["Overheating warning"],
      ["Check coolant level", "Replace ECT"]),
    c("P0122", "TPS Low Voltage", "warning",
      "Throttle position too low.",
      ["No throttle response"],
      ["Check TPS connector", "Replace TPS"]),
    c("P0201", "Injector 1 Open Circuit", "critical",
      "Injector circuit open.",
      ["No start or misfire"],
      ["Check injector wiring", "Replace injector"]),
    c("P0301", "Cylinder 1 Misfire", "critical",
      "Misfire detected.",
      ["Vibration", "Power loss"],
      ["Check spark plug", "Check coil", "Compression test"]),
    c("P0480", "Cooling Fan Relay Fault", "warning",
      "Fan relay circuit fault.",
      ["Engine overheat"],
      ["Relay swap", "Check wiring"]),
    c("P0703", "Brake Switch Input", "info",
      "Brake light switch signal fault.",
      ["Cruise issues", "Brake light always on"],
      ["Adjust or replace switch"]),
    c("U0100", "Lost Comm with ECM", "critical",
      "CAN bus communication lost with ECU.",
      ["Multiple warnings", "No start"],
      ["Check CAN wiring", "Check ECU power"]),
  ],
  suzuki: [
    c("C12", "CKP Sensor No Signal", "critical",
      "Crank sensor signal missing.",
      ["No start", "Sudden stall"],
      ["Check CKP connector", "Air gap test", "Replace sensor"]),
    c("C13", "IAP Sensor Fault", "warning",
      "Intake air pressure sensor fault.",
      ["Rough idle"],
      ["Check vacuum line", "Replace sensor"]),
    c("C14", "TPS Fault", "warning",
      "Throttle position sensor abnormal.",
      ["Jerky throttle"],
      ["Adjust or replace TPS"]),
    c("C15", "ECT Sensor Fault", "info",
      "Engine coolant temp signal bad.",
      ["Fan continuously ON"],
      ["Replace ECT"]),
    c("C21", "IAT Sensor Fault", "info",
      "Intake air temp signal bad.",
      ["Slight mileage drop"],
      ["Clean or replace IAT"]),
    c("C23", "Tip-over Sensor", "warning",
      "Tip-over sensor active or faulty.",
      ["No start after a fall"],
      ["Reset or replace TO sensor"]),
    c("C24", "Ignition Signal #1", "critical",
      "Ignition coil 1 fault.",
      ["Misfire", "Hard start"],
      ["Check coil", "Check plug", "Replace coil"]),
    c("C32", "Injector Signal #1", "critical",
      "Fuel injector 1 circuit fault.",
      ["No start", "Misfire"],
      ["Check injector wiring", "Replace injector"]),
    c("C41", "Fuel Pump Relay Fault", "critical",
      "FP relay circuit problem.",
      ["No fuel prime", "No start"],
      ["Relay swap", "Check wiring"]),
    c("C44", "HO2 Sensor Fault", "warning",
      "Heated O2 sensor abnormal.",
      ["Black smoke", "Mileage drop"],
      ["Replace O2 sensor"]),
  ],
  royalenfield: [
    c("P0030", "O2 Heater Circuit Fault", "info",
      "O2 sensor heater not working.",
      ["MIL ON", "Slight mileage drop"],
      ["Heater fuse check", "O2 sensor replace"]),
    c("P0107", "MAP Sensor Low", "warning",
      "MAP signal low.",
      ["Idle hunting", "Smoke"],
      ["Connector check", "Replace MAP"]),
    c("P0117", "ECT Sensor Low", "info",
      "Coolant temp signal low.",
      ["Wrong fueling", "Cold start issue"],
      ["ECT replace"]),
    c("P0122", "TPS Low Voltage", "warning",
      "Throttle position too low.",
      ["Limp mode", "No response"],
      ["TPS connector clean", "Replace TPS"]),
    c("P0201", "Injector Circuit Open", "critical",
      "Injector circuit open.",
      ["No start", "Misfire"],
      ["Injector wiring", "Injector replace"]),
    c("P0230", "Fuel Pump Relay", "critical",
      "Fuel pump relay fault.",
      ["No prime", "No start"],
      ["Relay test", "Replace relay"]),
    c("P0335", "CKP Sensor Fault", "critical",
      "Crank position sensor fault.",
      ["No start", "Stall"],
      ["CKP wiring check", "Sensor replace"]),
    c("P0351", "Ignition Coil A Fault", "critical",
      "Coil primary circuit fault.",
      ["Misfire", "Power loss"],
      ["Coil resistance test", "Replace coil"]),
    c("P0505", "Idle Air Control", "warning",
      "IAC valve / stepper motor fault.",
      ["Idle stall", "Hunting"],
      ["IAC clean", "Replace IAC"]),
    c("P0562", "System Voltage Low", "warning",
      "Battery / charging low.",
      ["Hard start"],
      ["Battery test", "R/R replace"]),
  ],
  global_obd2: [
    c("P0100", "Mass Air Flow Circuit", "warning",
      "MAF sensor signal abnormal.",
      ["Mileage drop", "Hesitation"],
      ["MAF clean", "Replace MAF"]),
    c("P0171", "System Too Lean", "warning",
      "Fuel mixture too lean.",
      ["Hesitation", "Stalling"],
      ["Vacuum leak check", "Fuel pressure test"]),
    c("P0172", "System Too Rich", "warning",
      "Fuel mixture too rich.",
      ["Black smoke", "Mileage drop"],
      ["O2 sensor check", "Injector test"]),
    c("P0300", "Random Misfire", "critical",
      "Multiple cylinder misfire.",
      ["Rough running", "Power loss"],
      ["Plugs / coils check", "Compression test"]),
    c("P0420", "Catalyst Efficiency Low", "info",
      "Catalytic converter inefficient.",
      ["MIL ON"],
      ["O2 sensor check", "Replace catalyst"]),
    c("P0606", "ECM Processor Fault", "critical",
      "ECU internal fault.",
      ["Random misbehavior"],
      ["ECU reset", "ECU replace"]),
    c("P0700", "Transmission Control Fault", "warning",
      "TCM fault detected.",
      ["Shift issues"],
      ["TCM diagnostics"]),
  ],
};

export function lookupCode(brandId: string, query: string): OBDCode | null {
  const q = query.trim().toUpperCase();
  if (!q) return null;
  const customs = loadCustomCodes();
  const custom = customs.find(
    (c) => c.code.toUpperCase() === q && (c.brandId === brandId || c.brandId === "global_obd2"),
  );
  if (custom) return custom;
  const brandCodes = CODES[brandId] || [];
  const inBrand = brandCodes.find((c) => c.code.toUpperCase() === q);
  if (inBrand) return inBrand;
  const global = CODES.global_obd2.find((c) => c.code.toUpperCase() === q);
  return global || null;
}

