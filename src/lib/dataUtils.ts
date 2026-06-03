import { type OBDCode, BRANDS } from "@/data/obdCodes";
import { type FirebaseCode } from "@/lib/firebaseDb";

export async function parseCSVToCodes(file: File): Promise<{ codes: FirebaseCode[], brand: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        
        if (!headers.includes("code") || !headers.includes("brand")) {
          throw new Error("Invalid CSV format. Must include 'code' and 'brand' columns.");
        }

        const newCodes: FirebaseCode[] = [];
        let importedBrand = "";
        const validBrandIds = BRANDS.map(b => b.id);

        for (let i = 1; i < lines.length; i++) {
          const lineNum = i + 1; // 1-based line number for user display
          if (!lines[i].trim()) continue;
          
          // Basic CSV parsing that handles commas inside quotes
          const values: string[] = [];
          let inQuotes = false;
          let currentVal = "";
          for (let char of lines[i]) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(currentVal.trim());
              currentVal = "";
            } else {
              currentVal += char;
            }
          }
          values.push(currentVal.trim());

          const codeObj: any = {};
          headers.forEach((header, index) => {
            codeObj[header] = values[index] || "";
          });

          // ─── VALIDATION ───
          if (!codeObj.code) {
            throw new Error(`Line ${lineNum}: 'code' column is missing or empty.`);
          }

          // Validate DTC Code format (alphanumeric, e.g. 12, P0123, 1502, C0012)
          const dtcRegex = /^[A-Z0-9-]{2,10}$/i;
          if (!dtcRegex.test(codeObj.code)) {
            throw new Error(`Line ${lineNum}: Invalid DTC format '${codeObj.code}'. Must be alphanumeric between 2-10 characters.`);
          }

          if (!codeObj.brand) {
            throw new Error(`Line ${lineNum}: 'brand' column is missing or empty.`);
          }

          const brandId = codeObj.brand.toLowerCase().replace(/[^a-z0-9]/g, "");
          if (!validBrandIds.includes(brandId) && brandId !== "generic" && brandId !== "globalobd2") {
            throw new Error(`Line ${lineNum}: Invalid brand '${codeObj.brand}'. Supported: ${BRANDS.map(b => b.name).join(", ")}`);
          }

          const mappedBrandId = (brandId === "globalobd2" || brandId === "generic") ? "generic" : brandId;

          // Severity validation
          let severity = (codeObj.severity || "warning").toLowerCase().trim();
          if (severity === "low") severity = "info";
          if (severity === "medium") severity = "warning";
          if (severity === "high") severity = "critical";

          if (!["info", "warning", "critical"].includes(severity)) {
            throw new Error(`Line ${lineNum}: Invalid severity '${codeObj.severity}'. Must be: Low, Medium, High (or info, warning, critical).`);
          }

          if (typeof codeObj.symptoms === 'string') {
            codeObj.symptoms = codeObj.symptoms.split(";").map((s: string) => s.trim()).filter(Boolean);
          }
          if (typeof codeObj.actions === 'string') {
            codeObj.actions = codeObj.actions.split(";").map((a: string) => a.trim()).filter(Boolean);
          }

          importedBrand = codeObj.brand;
          newCodes.push({
            code: codeObj.code.toUpperCase().trim(),
            title: codeObj.title || "Imported Fault",
            affectedPart: codeObj.affectedpart || codeObj.affectedPart || "Unknown",
            severity: severity as any,
            problem: codeObj.problem || "No description provided.",
            symptoms: codeObj.symptoms || [],
            actions: codeObj.actions || [],
            location: codeObj.location || "N/A",
            brandId: mappedBrandId,
            isCustom: true
          });
        }
        resolve({ codes: newCodes, brand: importedBrand });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}

export function exportCodesAsCSV(codes: Array<OBDCode & { brandId: string }>) {
  if (codes.length === 0) return alert("No data to export");

  const headers = ["code", "brand", "title", "affectedPart", "severity", "problem", "symptoms", "actions", "location"];
  const csvContent = [
    headers.join(","),
    ...codes.map((c: any) => [
      c.code,
      c.brandId,
      `"${c.title?.replace(/"/g, '""')}"`,
      `"${c.affectedPart?.replace(/"/g, '""')}"`,
      c.severity,
      `"${c.problem?.replace(/"/g, '""')}"`,
      `"${(c.symptoms || []).join("; ")}"`,
      `"${(c.actions || []).join("; ")}"`,
      `"${c.location || "N/A"}"`
    ].join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `obd_codes_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
