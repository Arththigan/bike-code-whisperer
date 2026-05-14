import { type OBDCode, CACHE_KEY } from "@/data/obdCodes";

export async function importCodesFromCSV(file: File): Promise<{ count: number, brand: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n");
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        
        // Basic validation of headers
        if (!headers.includes("code") || !headers.includes("brand")) {
          throw new Error("Invalid CSV format. Must include 'code' and 'brand' columns.");
        }

        const newCodes: Array<OBDCode & { brandId: string }> = [];
        let importedBrand = "";

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          
          const values = lines[i].split(",").map(v => v.trim());
          const codeObj: any = {};
          
          headers.forEach((header, index) => {
            codeObj[header] = values[index];
          });

          // Convert string lists back to arrays if needed
          if (typeof codeObj.symptoms === 'string') {
            codeObj.symptoms = codeObj.symptoms.split(";").map((s: string) => s.trim());
          }
          if (typeof codeObj.actions === 'string') {
            codeObj.actions = codeObj.actions.split(";").map((a: string) => a.trim());
          }

          if (codeObj.code && codeObj.brand) {
            const brandId = codeObj.brand.toLowerCase();
            importedBrand = codeObj.brand;
            newCodes.push({
              code: codeObj.code,
              title: codeObj.title || "Imported Fault",
              affectedPart: codeObj.affectedpart || codeObj.affectedPart || "Unknown",
              severity: codeObj.severity || "warning",
              problem: codeObj.problem || "No description provided.",
              symptoms: codeObj.symptoms || [],
              actions: codeObj.actions || [],
              location: codeObj.location || "N/A",
              brandId: brandId
            });
          }
        }

        // Save to cache
        const existingCache = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
        // Filter out any duplicates (by code and brandId)
        const updatedCache = [...existingCache];
        newCodes.forEach(newCode => {
          const index = updatedCache.findIndex(c => c.code === newCode.code && c.brandId === newCode.brandId);
          if (index > -1) {
            updatedCache[index] = newCode;
          } else {
            updatedCache.push(newCode);
          }
        });

        localStorage.setItem(CACHE_KEY, JSON.stringify(updatedCache));
        resolve({ count: newCodes.length, brand: importedBrand });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsText(file);
  });
}

export function exportCodesAsCSV() {
  const cache = JSON.parse(localStorage.getItem(CACHE_KEY) || "[]");
  if (cache.length === 0) return alert("No data to export");

  const headers = ["code", "brand", "title", "affectedPart", "severity", "problem", "symptoms", "actions", "location"];
  const csvContent = [
    headers.join(","),
    ...cache.map((c: any) => [
      c.code,
      c.brandId,
      `"${c.title}"`,
      `"${c.affectedPart}"`,
      c.severity,
      `"${c.problem}"`,
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
