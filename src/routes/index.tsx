import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bike, ShieldCheck } from "lucide-react";
import { SplashScreen } from "@/components/SplashScreen";
import { BrandSelector } from "@/components/BrandSelector";
import { SearchBar } from "@/components/SearchBar";
import { NoResultCard, ResultCard } from "@/components/ResultCard";
import { HistoryItem, RecentHistory, loadHistory, saveHistory } from "@/components/RecentHistory";
import { BRANDS, lookupCode, type OBDCode } from "@/data/obdCodes";

export const Route = createFileRoute("/")({
  component: Index,
});

interface AnalysisState {
  query: string;
  brandId: string;
  result: OBDCode | null;
}

function Index() {
  const [showSplash, setShowSplash] = useState(true);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    const last = localStorage.getItem("obd-decoder-last-brand");
    if (last && BRANDS.some((b) => b.id === last)) setBrandId(last);
  }, []);

  useEffect(() => {
    if (brandId) localStorage.setItem("obd-decoder-last-brand", brandId);
  }, [brandId]);

  const brandName = useMemo(
    () => BRANDS.find((b) => b.id === brandId)?.name ?? "",
    [brandId],
  );

  const runAnalysis = (q: string, bId: string) => {
    const result = lookupCode(bId, q);
    setAnalysis({ query: q, brandId: bId, result });

    if (result) {
      const bName = BRANDS.find((b) => b.id === bId)?.name ?? "";
      const item: HistoryItem = { code: result.code, brandId: bId, brandName: bName, ts: Date.now() };
      const next = [item, ...history.filter((h) => !(h.code === item.code && h.brandId === item.brandId))].slice(0, 5);
      setHistory(next);
      saveHistory(next);
    }
    setTimeout(() => {
      document.getElementById("result-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      <main className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:pt-10">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Bike className="h-6 w-6 text-primary-foreground" strokeWidth={2.4} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">
                OBD<span className="text-primary">-</span>Decoder
              </h1>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Bike DTC Lookup
              </p>
            </div>
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px] font-medium text-muted-foreground sm:inline-flex">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            Offline Ready
          </span>
        </header>

        {/* Brand selector */}
        <section className="mb-7">
          <BrandSelector selected={brandId} onSelect={setBrandId} />
        </section>

        {/* Search */}
        <section className="mb-7 rounded-2xl border border-border bg-card/60 p-5" style={{ boxShadow: "var(--shadow-card)" }}>
          <SearchBar
            disabled={!brandId}
            onAnalyze={(q) => brandId && runAnalysis(q, brandId)}
          />
        </section>

        {/* History */}
        <section className="mb-7">
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
          {analysis && (
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
          OBD-Decoder · Built for workshop mechanics · Data is reference only
        </footer>
      </main>
    </>
  );
}
