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

interface MultiAnalysisState {
  codes: string[];
  brandId: string;
  results: Array<{ query: string; result: OBDCode | null }>;
}

const SESSION_KEY = "obd-last-analysis";

function saveSession(state: MultiAnalysisState) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(state)); } catch {}
}

function loadSession(): MultiAnalysisState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Handle old single-result format
    if (parsed.result !== undefined) {
      return {
        codes: [parsed.query],
        brandId: parsed.brandId,
        results: [{ query: parsed.query, result: parsed.result }],
      };
    }
    return parsed as MultiAnalysisState;
  } catch { return null; }
}

function Index() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [multiAnalysis, setMultiAnalysis] = useState<MultiAnalysisState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pinned, setPinned] = useState<PinnedItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingCodes, setAnalyzingCodes] = useState<string[]>([]);
  const { language } = useAuth();

  useEffect(() => {
    setHistory(loadHistory());
    setPinned(loadPinned());
    const last = localStorage.getItem("obd-decoder-last-brand");
    if (last && BRANDS.some((b) => b.id === last)) setBrandId(last);
    const saved = loadSession();
    if (saved) {
      setMultiAnalysis(saved);
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

  const analyzeSingleCode = async (q: string, bId: string): Promise<OBDCode | null> => {
    const cleaned = q.trim().toUpperCase();
    const isValidDTC = /^[PCBU][0-9]{4}$/.test(cleaned);
    const isValidBlink = /^[0-9]{1,3}$/.test(cleaned);
    const isValidManuf = /^[A-Z][0-9A-Z]{2,7}$/.test(cleaned);

    if (!isValidDTC && !isValidBlink && !isValidManuf) return null;

    let dbResult: OBDCode | null = await lookupFirebaseCode(bId, cleaned, language);
    if (!dbResult) dbResult = lookupCode(bId, cleaned);

    if (!dbResult && isValidDTC) {
      const bName = BRANDS.find((b) => b.id === bId)?.name ?? bId;
      try {
        const aiResult = await analyzeCodeWithAI(bName, bId, cleaned, language);
        if (aiResult) return aiResult;
      } catch (err: any) {
        console.error("Analysis error:", err.message);
      }
    }
    return dbResult;
  };

  const runAnalysis = async (codes: string[], bId: string) => {
    setIsAnalyzing(true);
    setMultiAnalysis(null);
    setAnalyzingCodes(codes);

    const results: Array<{ query: string; result: OBDCode | null }> = [];

    // Run all codes in parallel
    const settled = await Promise.allSettled(
      codes.map(async (code) => {
        const result = await analyzeSingleCode(code, bId);
        return { query: code, result };
      })
    );

    for (const s of settled) {
      if (s.status === "fulfilled") {
        results.push(s.value);
      } else {
        results.push({ query: "", result: null });
      }
    }

    const state: MultiAnalysisState = { codes, brandId: bId, results };
    setMultiAnalysis(state);
    saveSession(state);

    // Add successful results to history
    for (const { query, result } of results) {
      if (result) {
        const bName = BRANDS.find((b) => b.id === bId)?.name ?? "";
        const item: HistoryItem = { code: result.code, brandId: bId, brandName: bName, ts: Date.now() };
        setHistory((prev) => {
          const next = [item, ...prev.filter((h) => !(h.code === item.code && h.brandId === item.brandId))].slice(0, 5);
          saveHistory(next);
          return next;
        });
      }
    }

    setIsAnalyzing(false);
    setAnalyzingCodes([]);

    setTimeout(() => {
      document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const clearAnalysis = () => {
    setMultiAnalysis(null);
    try { sessionStorage.removeItem(SESSION_KEY); } catch {}
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
            onAnalyze={(codes) => brandId && runAnalysis(codes, brandId)}
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
                runAnalysis([it.code], it.brandId);
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
              runAnalysis([it.code], it.brandId);
            }}
          />
        </section>

        {/* Did You Know tips — shown when no result is displayed */}
        {!multiAnalysis && !isAnalyzing && (
          <section className="mb-7">
            <TipCard language={language} />
          </section>
        )}

        {/* Result */}
        <section id="result-anchor">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <p className="text-sm font-medium text-muted-foreground">
                {analyzingCodes.length > 1
                  ? `Analyzing ${analyzingCodes.length} codes...`
                  : "Analyzing the code..."}
              </p>
              {analyzingCodes.length > 1 && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {analyzingCodes.map(c => (
                    <span key={c} className="rounded-lg bg-primary/10 px-2.5 py-0.5 font-mono text-xs font-bold text-primary">
                      {c}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {multiAnalysis && !isAnalyzing && (
            <>
              {/* Clear result bar */}
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  {multiAnalysis.results.length > 1
                    ? `Results · ${multiAnalysis.results.length} codes`
                    : `Result · ${multiAnalysis.codes[0]}`}
                </span>
                <button
                  onClick={clearAnalysis}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-secondary/40 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-all hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              </div>

              <div className="space-y-6">
                {multiAnalysis.results.map(({ query, result }, i) => (
                  <div key={`${query}-${i}`}>
                    {result ? (
                      <ResultCard
                        result={result}
                        brandName={BRANDS.find((b) => b.id === multiAnalysis.brandId)?.name ?? ""}
                        brandId={multiAnalysis.brandId}
                      />
                    ) : (
                      <NoResultCard query={query} brandName={brandName || "this brand"} />
                    )}
                  </div>
                ))}
              </div>
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
