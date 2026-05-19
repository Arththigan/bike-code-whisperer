import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BrandSelector } from "@/components/BrandSelector";
import { SearchBar } from "@/components/SearchBar";
import { NoResultCard, ResultCard } from "@/components/ResultCard";
import { HistoryItem, RecentHistory, loadHistory, saveHistory } from "@/components/RecentHistory";
import { BRANDS, lookupCode, type OBDCode } from "@/data/obdCodes";
import { lookupFirebaseCode } from "@/lib/firebaseDb";
import { analyzeCodeWithAI } from "@/lib/gemini";
import { useAuth } from "@/components/AuthProvider";
import { translations } from "@/lib/translations";

export const Route = createFileRoute("/")({
  component: Index,
});

interface AnalysisState {
  query: string;
  brandId: string;
  result: OBDCode | null;
}

function Index() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { language } = useAuth();

  useEffect(() => {
    setHistory(loadHistory());
    const last = localStorage.getItem("obd-decoder-last-brand");
    if (last && BRANDS.some((b) => b.id === last)) setBrandId(last);
  }, []);

  useEffect(() => {
    if (brandId) localStorage.setItem("obd-decoder-last-brand", brandId);
  }, [brandId]);

  const t = (key: string) => translations[key]?.[language] || translations[key]?.["english"] || key;

  const brandName = useMemo(
    () => BRANDS.find((b) => b.id === brandId)?.name ?? "",
    [brandId],
  );

  const runAnalysis = async (q: string, bId: string) => {
    setIsAnalyzing(true);
    setAnalysis(null);
    
    // 1. Check Firebase first (custom/imported codes have priority)
    let dbResult: OBDCode | null = await lookupFirebaseCode(bId, q);
    
    // 2. Fallback to built-in local static codes
    if (!dbResult) {
      dbResult = lookupCode(bId, q);
    }

    let result = dbResult;

    // 3. Fallback to AI generation if still not found, or if we need translation/explanation
    // Call AI if:
    // - No database result was found
    // - OR the database result doesn't have our detailed AI 'explanation' field
    // - OR the user language is Tamil/Tanglish (requiring translation of existing English records)
    const needsAI = !dbResult || !dbResult.explanation || language === "tamil" || language === "tanglish";

    if (needsAI) {
      const bName = BRANDS.find((b) => b.id === bId)?.name ?? bId;
      const aiResult = await analyzeCodeWithAI(bName, q, dbResult, language);
      if (aiResult) {
        result = aiResult;
      }
    }

    setAnalysis({ query: q, brandId: bId, result });

    if (result) {
      const bName = BRANDS.find((b) => b.id === bId)?.name ?? "";
      const item: HistoryItem = { code: result.code, brandId: bId, brandName: bName, ts: Date.now() };
      const next = [item, ...history.filter((h) => !(h.code === item.code && h.brandId === item.brandId))].slice(0, 5);
      setHistory(next);
      saveHistory(next);
    }
    
    setIsAnalyzing(false);
    
    setTimeout(() => {
      document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <>
      <main className="w-full px-10 pb-16 pt-8 max-w-[1400px]">
        
        {/* Brand selector */}
        <section className="mb-7">
          <div className="mb-3 px-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors">
              {t("selectBrand")}
            </label>
          </div>
          <BrandSelector selected={brandId} onSelect={setBrandId} />
        </section>

        {/* Search */}
        <section className="mb-7">
          <SearchBar
            disabled={!brandId}
            onAnalyze={(q) => brandId && runAnalysis(q, brandId)}
            label={t("searchPlaceholder")}
            buttonText={t("analyze")}
          />
        </section>

        {/* History */}
        <section className="mb-7">
          <div className="mb-3 px-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors">
              {t("history")}
            </label>
          </div>
          <RecentHistory
            items={history}
            onClear={() => {
              setHistory([]);
              saveHistory([]);
            }}
            onPick={(it) => {
              setBrandId(it.brandId);
              runAnalysis(it.code, it.brandId);
            }}
          />
        </section>

        {/* Result */}
        <section id="result-anchor">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-medium text-muted-foreground">Gemini AI is analyzing the code...</p>
            </div>
          )}
          {analysis && !isAnalyzing && (
            analysis.result ? (
              <ResultCard
                result={analysis.result}
                brandName={BRANDS.find((b) => b.id === analysis.brandId)?.name ?? ""}
              />
            ) : (
              <NoResultCard query={analysis.query} brandName={brandName || "this brand"} />
            )
          )}
        </section>

        <footer className="mt-12 text-center text-[11px] text-muted-foreground">
          MRP PARTS · Built for workshop mechanics · Data is reference only
        </footer>
      </main>
    </>
  );
}
