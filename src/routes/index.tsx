import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { BrandSelector } from "@/components/BrandSelector";
import { SearchBar } from "@/components/SearchBar";
import { NoResultCard, ResultCard } from "@/components/ResultCard";
import { HistoryItem, RecentHistory, loadHistory, saveHistory } from "@/components/RecentHistory";
import { PinnedCodes, PinnedItem, loadPinned, savePinned, togglePin } from "@/components/PinnedCodes";
import { TipCard } from "@/components/TipCard";
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

const SESSION_KEY = "obd-last-analysis";

function saveSession(state: AnalysisState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch {}
}

function loadSession(): AnalysisState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function Index() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pinned, setPinned] = useState<PinnedItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { language } = useAuth();

  useEffect(() => {
    setHistory(loadHistory());
    setPinned(loadPinned());
    const last = localStorage.getItem("obd-decoder-last-brand");
    if (last && BRANDS.some((b) => b.id === last)) setBrandId(last);
    // Restore last analysis result from session
    const saved = loadSession();
    if (saved) {
      setAnalysis(saved);
      setBrandId(saved.brandId);
    }
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

    // Validate DTC code format before doing anything
    // Valid formats: P0123, C1234, B0001, U0100, or numeric blink codes like 11, 23 etc.
    const cleaned = q.trim().toUpperCase();
    const isValidDTC = /^[PCBU][0-9]{4}$/.test(cleaned);       // Standard OBD2: P0351, C1234
    const isValidBlink = /^[0-9]{1,3}$/.test(cleaned);          // Blink codes: 11, 23, 111
    const isValidManuf = /^[A-Z][0-9A-Z]{2,7}$/.test(cleaned);  // Manufacturer: ER01, FI01

    if (!isValidDTC && !isValidBlink && !isValidManuf) {
      // Invalid code — skip AI, show no result immediately
      setAnalysis({ query: q, brandId: bId, result: null });
      saveSession({ query: q, brandId: bId, result: null });
      setIsAnalyzing(false);
      setTimeout(() => {
        document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
      return;
    }

    // 1. Check Firestore first — brand-specific, then generic fallback
    let dbResult: OBDCode | null = await lookupFirebaseCode(bId, cleaned, language);

    // 2. Fallback to built-in local static codes
    if (!dbResult) {
      dbResult = lookupCode(bId, cleaned);
    }

    let result = dbResult;

    // 3. Call AI only for valid DTC codes not found anywhere in DB
    if (!dbResult && isValidDTC) {
      const bName = BRANDS.find((b) => b.id === bId)?.name ?? bId;
      try {
        const aiResult = await analyzeCodeWithAI(bName, bId, cleaned, language);
        if (aiResult) {
          result = aiResult;
        }
      } catch (err: any) {
        console.error("Analysis error:", err.message);
      }
    }

    setAnalysis({ query: q, brandId: bId, result });
    saveSession({ query: q, brandId: bId, result });

    if (result) {
      const bName = BRANDS.find((b) => b.id === bId)?.name ?? "";
      const item: HistoryItem = { code: result.code, brandId: bId, brandName: bName, ts: Date.now() };
      // Functional update — avoids stale closure on rapid searches
      setHistory((prev) => {
        const next = [item, ...prev.filter((h) => !(h.code === item.code && h.brandId === item.brandId))].slice(0, 5);
        saveHistory(next);
        return next;
      });
    }
    
    setIsAnalyzing(false);
    
    setTimeout(() => {
      document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const clearAnalysis = () => {
    setAnalysis(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
    // Scroll back to top smoothly
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
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

        {/* Pinned Codes */}
        {pinned.length > 0 && (
          <section className="mb-7">
            <PinnedCodes
              items={pinned}
              onPick={(it) => {
                setBrandId(it.brandId);
                runAnalysis(it.code, it.brandId);
              }}
              onUnpin={(it) => {
                const next = togglePin(pinned, it);
                setPinned(next);
                savePinned(next);
              }}
            />
          </section>
        )}

        {/* History */}
        <section className="mb-7">
          <div className="mb-3 px-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground transition-colors">
              {t("history")}
            </label>
          </div>
          <RecentHistory
            items={history}
            pinned={pinned}
            onTogglePin={(it) => {
              const next = togglePin(pinned, it);
              setPinned(next);
              savePinned(next);
            }}
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

        {/* Did You Know tips — shown when no result is displayed */}
        {!analysis && !isAnalyzing && (
          <section className="mb-7">
            <TipCard language={language} />
          </section>
        )}

        {/* Result */}
        <section id="result-anchor">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-medium text-muted-foreground">Analyzing the code...</p>
            </div>
          )}
          {analysis && !isAnalyzing && (
            <>
              {/* Clear result bar */}
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Result · {analysis.query}
                </span>
                <button
                  onClick={clearAnalysis}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>

              {analysis.result ? (
                <ResultCard
                  result={analysis.result}
                  brandName={BRANDS.find((b) => b.id === analysis.brandId)?.name ?? ""}
                  brandId={analysis.brandId}
                />
              ) : (
                <NoResultCard query={analysis.query} brandName={brandName || "this brand"} />
              )}
            </>
          )}
        </section>

        <footer className="mt-12 text-center text-[11px] text-muted-foreground">
          AK ARUN WIRING · Built for workshop mechanics · Data is reference only
        </footer>
      </main>
    </>
  );
}
