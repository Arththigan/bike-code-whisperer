import type { OBDCode, Severity } from "@/data/obdCodes";
import { SEVERITY_LABEL } from "@/data/obdCodes";
import { Activity, CheckCircle2, FileQuestion, MapPin, Wrench, Sparkles, Loader2, Cpu, Languages, ChevronDown, RefreshCw } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { translations, translateDTCTitle } from "@/lib/translations";
import { useEffect, useRef, useState } from "react";
import { translateCardWithAI, generateDiagnosticGuide } from "@/lib/gemini";
import type { OBDTranslationCache } from "@/lib/firebaseDb";

const sevPill: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border border-critical/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  info: "bg-info/15 text-info border border-info/30",
};

export function ResultCard({ result, brandName, brandId }: {
  result: OBDCode;
  brandName: string;
  brandId: string;
}) {
  const { language } = useAuth();
  const [cardLang, setCardLang] = useState<"english" | "tanglish">("english");
  const [translated, setTranslated] = useState<OBDTranslationCache | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isAIExpanded, setIsAIExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("ai-section-expanded");
      return saved === null ? true : saved === "true";
    } catch { return true; }
  });
  // Guide state — local only, never persisted
  const [guide, setGuide] = useState<string | null>(null);
  const [isLoadingGuide, setIsLoadingGuide] = useState(false);
  // Cache in memory so toggling back doesn't re-fetch
  const translationMemCache = useRef<OBDTranslationCache | null>(null);

  const t = (key: string) => translations[key]?.[cardLang] || translations[key]?.["english"] || key;

  // Active display data — translated if available, else original English
  const display = cardLang === "tanglish" && translated ? translated : null;

  const toggleCardLang = async () => {
    if (cardLang === "english") {
      // Switch to Tanglish
      setCardLang("tanglish");
      if (translationMemCache.current) {
        // Already fetched this session — use memory cache instantly
        setTranslated(translationMemCache.current);
        return;
      }
      // Fetch from Firestore cache or Gemini
      setIsTranslating(true);
      try {
        const data = await translateCardWithAI(brandId, result, "tanglish");
        if (data) {
          translationMemCache.current = data;
          setTranslated(data);
        }
      } finally {
        setIsTranslating(false);
      }
    } else {
      // Switch back to English — instant, no fetch
      setCardLang("english");
    }
  };

  const fetchGuide = async () => {
    setIsLoadingGuide(true);
    setIsAIExpanded(true);
    try { localStorage.setItem("ai-section-expanded", "true"); } catch {}
    try {
      const text = await generateDiagnosticGuide(brandName, result.code, result.title, result.problem);
      setGuide(text ?? `**${result.code} analysis vera try pannunga.**\n\nThoda neram wait panni retry pannunga — all analysis engines busy-a iruku.`);
    } catch {
      setGuide(`**${result.code} - ${result.title}**\n\nIndha moment-la analysis available illai. Sila minutes wait panni retry pannunga.`);
    } finally {
      setIsLoadingGuide(false);
    }
  };

  return (
    <div
      className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {/* Header */}
      <div className="border-b border-border bg-secondary/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {brandName} · {t("diagnosticCode")}
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-wider text-primary">
              {result.code}
            </div>
            <h3 className="mt-2 text-lg font-bold leading-tight text-foreground">
              {display ? display.title : result.title}
            </h3>
            {result.category && (
              <p className="mt-0.5 text-xs text-muted-foreground">{result.category}</p>
            )}
          </div>

          {/* Severity + Translate toggle stacked */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${sevPill[result.severity]}`}>
              {t(result.severity === "critical" ? "high" : result.severity === "warning" ? "medium" : "low")} {t("severityLabel")}
            </span>

            {/* Translate toggle pill */}
            <button
              onClick={toggleCardLang}
              disabled={isTranslating}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1 text-[10px] font-bold tracking-wide transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-60"
              title="Toggle language"
            >
              {isTranslating ? (
                <Loader2 className="h-3 w-3 animate-spin text-primary" />
              ) : (
                <Languages className="h-3 w-3" />
              )}
              <span className={cardLang === "english" ? "text-foreground" : "text-muted-foreground"}>EN</span>
              <span className="text-border">|</span>
              <span className={cardLang === "tanglish" ? "text-primary font-extrabold" : "text-muted-foreground"}>
                {isTranslating ? "..." : "Tanglish"}
              </span>
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-foreground/85">
          {display ? display.problem : result.problem}
        </p>
      </div>

      {/* 2x2 quadrant grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <Quadrant icon={CheckCircle2} title={t("affectedPart")} accent="text-primary" border="border-b sm:border-r">
          <p className="text-sm font-bold text-foreground">
            {display ? display.affectedPart : (result.affectedPart ?? (typeof result.title === 'string' ? result.title.split(" Fault")[0].split(" Circuit")[0] : 'Unknown'))}
          </p>
        </Quadrant>
        <Quadrant icon={Activity} title={t("symptoms")} accent="text-critical" border="border-b">
          <BulletList items={display ? display.symptoms : result.symptoms} />
        </Quadrant>
        <Quadrant icon={MapPin} title={t("location")} accent="text-warning" border="sm:border-r">
          <p className="text-sm text-foreground/90">
            {display ? display.location : (result.location ?? t("defaultLocation"))}
          </p>
        </Quadrant>
        <Quadrant icon={Wrench} title={t("actions")} accent="text-success" border="">
          <BulletList items={display ? display.actions : result.actions} />
        </Quadrant>
      </div>

      {/* Analyze Details button — shown when no guide loaded yet */}
      {!isLoadingGuide && !guide && (
        <div className="border-t border-border bg-card p-4 flex justify-end">
          <button
            onClick={fetchGuide}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-primary-foreground transition-all hover:opacity-90 active:scale-95"
            style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
          >
            <Sparkles className="h-4 w-4" />
            Analyze Details
          </button>
        </div>
      )}

      {/* Loading Animation */}
      {isLoadingGuide && <AILoadingCard language="tanglish" />}

      {/* Diagnostic Guide Section */}
      {!isLoadingGuide && guide && (
        <div className="border-t border-border bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-fade-in">
          {/* Clickable header with collapse + refresh */}
          <div className="flex w-full items-center justify-between px-6 py-4">
            <button
              onClick={() => {
                const next = !isAIExpanded;
                setIsAIExpanded(next);
                try { localStorage.setItem("ai-section-expanded", String(next)); } catch {}
              }}
              className="flex items-center gap-2 flex-1 transition-colors hover:opacity-80"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Sparkles className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary">
                Analyzing · Diagnostic Guide
              </h4>
              <ChevronDown
                className={`ml-1 h-4 w-4 text-primary transition-transform duration-300 ${isAIExpanded ? "rotate-180" : "rotate-0"}`}
              />
            </button>
            {/* Refresh button */}
            <button
              onClick={fetchGuide}
              disabled={isLoadingGuide}
              className="ml-3 flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-all hover:border-primary/40 hover:text-primary disabled:opacity-50"
              title="Get a fresh analysis"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>

          {/* Collapsible content */}
          {isAIExpanded && (
            <div className="px-6 pb-6 animate-fade-in">
              <FormattedText text={guide} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Quadrant({
  icon: Icon,
  title,
  accent,
  border,
  children,
}: {
  icon: typeof MapPin;
  title: string;
  accent: string;
  border: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`p-5 border-border ${border}`}>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${accent}`}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.5} />
        {title}
      </span>
      <div className="mt-3">{children}</div>
    </div>
  );
}

const AI_STEPS = [
  { en: "Connecting to analysis engine...", ta: "பகுப்பாய்வு தொடங்குகிறது...", tl: "Analysis start aguthu..." },
  { en: "Reading diagnostic fault code...", ta: "தொழில்நுட்பக் குறியீடு படிக்கிறது...", tl: "Fault code padikuthu..." },
  { en: "Analyzing fault patterns...", ta: "தவறான முறைகளை ஆய்வு செய்கிறது...", tl: "Fault patterns analyze aguthu..." },
  { en: "Cross-referencing service data...", ta: "சேவை தரவுகளை ஒப்பிடுகிறது...", tl: "Service data cross-check pannuthu..." },
  { en: "Generating expert repair guide...", ta: "நிபுணர் வழிகாட்டி உருவாக்குகிறது...", tl: "Expert guide ready pannuthu..." },
];

function AILoadingCard({ language }: { language: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [dots, setDots] = useState(".");

  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIdx((prev) => (prev + 1) % AI_STEPS.length);
    }, 1400);
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "." : prev + "."));
    }, 400);
    return () => { clearInterval(stepInterval); clearInterval(dotInterval); };
  }, []);

  const step = AI_STEPS[stepIdx];
  const label = language === "tamil" ? step.ta : language === "tanglish" ? step.tl : step.en;

  return (
    <div className="border-t border-border p-6 bg-gradient-to-br from-primary/8 via-background to-secondary/8 animate-fade-in">
      {/* Header row */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex h-10 w-10 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          </div>
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-primary">
            Analysis · Deep Diagnostic
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {label}{dots}
          </p>
        </div>
        <div className="ml-auto">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex gap-1.5 mb-5">
        {AI_STEPS.map((s, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-700"
            style={{
              background: i <= stepIdx
                ? "var(--gradient-primary)"
                : "hsl(var(--border))",
              opacity: i < stepIdx ? 0.5 : 1,
            }}
          />
        ))}
      </div>

      {/* Skeleton lines */}
      <div className="space-y-2.5">
        {["w-4/5", "w-full", "w-3/4", "w-full", "w-2/3"].map((w, i) => (
          <div
            key={i}
            className={`h-3 ${w} rounded-full bg-gradient-to-r from-muted/60 via-muted/30 to-muted/60 animate-pulse`}
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
        <div className="mt-4 flex gap-2">
          {["w-1/3", "w-1/4", "w-2/5"].map((w, i) => (
            <div
              key={i}
              className={`h-6 ${w} rounded-lg bg-primary/10 animate-pulse`}
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>

      {/* AI badge */}
      <div className="mt-5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Cpu className="h-3 w-3" />
        Analyzing · Deep Diagnostic Mode
      </div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((s, i) => (
        <li key={i} className="text-sm text-foreground/90">
          <span className="mr-1.5 text-muted-foreground">•</span>
          {s}
        </li>
      ))}
    </ul>
  );
}

function parseBold(text: string) {
  if (typeof text !== 'string') text = String(text || '');
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="font-extrabold text-foreground">{part}</strong>;
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

function FormattedText({ text }: { text: string }) {
  if (typeof text !== 'string') text = String(text || '');
  const lines = text.split('\n');
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-foreground/90 font-medium">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;

        if (trimmed.startsWith('#')) {
          const content = trimmed.replace(/^#+\s*/, '');
          return <h5 key={i} className="font-bold text-base text-primary mt-5 mb-2">{parseBold(content)}</h5>;
        }
        
        if (trimmed.match(/^\*\*(.*?)\*\*:?$/)) {
           return <h5 key={i} className="font-bold text-base text-primary mt-5 mb-2">{trimmed.replace(/\*\*/g, '')}</h5>;
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const content = trimmed.substring(2);
          return <li key={i} className="ml-5 list-disc marker:text-primary/70">{parseBold(content)}</li>;
        }

        return <p key={i}>{parseBold(line)}</p>;
      })}
    </div>
  );
}

export function NoResultCard({ query, brandName }: { query: string; brandName: string }) {
  const { language } = useAuth();
  const t = (key: string) => translations[key]?.[language] || translations[key]?.["english"] || key;

  // Detect if query looks like an invalid code format
  const cleaned = query.trim().toUpperCase();
  const isValidDTC = /^[PCBU][0-9]{4}$/.test(cleaned);
  const isValidBlink = /^[0-9]{1,3}$/.test(cleaned);
  const isValidManuf = /^[A-Z][0-9A-Z]{2,7}$/.test(cleaned);
  const isInvalidFormat = !isValidDTC && !isValidBlink && !isValidManuf;

  const description = isInvalidFormat
    ? `"${query}" is not a valid DTC code format. Valid formats: P0351, C1234, B0001, U0100, or blink codes like 11, 23.`
    : t("noDataDescription").replace("{code}", query).replace("{brand}", brandName);

  return (
    <div
      className="animate-fade-up rounded-2xl border border-border bg-card p-6 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <FileQuestion className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold">
        {isInvalidFormat ? "Invalid Code Format" : t("noDataFound")}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {description}
      </p>
      {!isInvalidFormat && (
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-border/60 bg-background/40 p-4 text-left">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-warning">
            <Wrench className="h-4 w-4" /> {t("suggestedNextStep")}
          </div>
          <ul className="space-y-1.5 text-sm text-foreground/90">
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t("suggestedAction1")}</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t("suggestedAction2")}</li>
            <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />{t("suggestedAction3")}</li>
          </ul>
        </div>
      )}
      {isInvalidFormat && (
        <div className="mx-auto mt-4 max-w-sm rounded-xl border border-border/60 bg-background/40 p-4 text-left">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" /> Valid Code Examples
          </div>
          <ul className="space-y-1 text-sm text-foreground/80 font-mono">
            <li>P0351 — Standard OBD2 fault code</li>
            <li>C1234 — Chassis code</li>
            <li>11, 23 — Blink / flash codes</li>
            <li>FI01 — Manufacturer specific</li>
          </ul>
        </div>
      )}
    </div>
  );
}
