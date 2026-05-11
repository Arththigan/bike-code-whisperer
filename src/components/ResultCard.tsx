import type { OBDCode, Severity } from "@/data/obdCodes";
import { AlertTriangle, ArrowRight, CheckCircle2, FileQuestion, Info, ListChecks, Stethoscope, Wrench } from "lucide-react";

const sevConfig: Record<Severity, { label: string; bg: string; fg: string; icon: typeof Info }> = {
  critical: { label: "Critical", bg: "bg-critical", fg: "text-critical-foreground", icon: AlertTriangle },
  warning:  { label: "Warning",  bg: "bg-warning",  fg: "text-warning-foreground",  icon: AlertTriangle },
  info:     { label: "Info",     bg: "bg-info",     fg: "text-info-foreground",     icon: Info },
};

export function ResultCard({ result, query, brandName }: { result: OBDCode; query: string; brandName: string }) {
  const sev = sevConfig[result.severity];
  const SevIcon = sev.icon;
  const isGlobal = result.code.toUpperCase() !== query.toUpperCase()
    ? false
    : true; // not used; placeholder

  return (
    <div className="animate-fade-up overflow-hidden rounded-2xl border border-border bg-card" style={{ boxShadow: "var(--shadow-card)" }}>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 p-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{brandName} · Diagnostic Code</div>
          <div className="mt-1 font-mono text-3xl font-extrabold tracking-wider text-primary">{result.code}</div>
          <div className="mt-1 text-sm font-medium text-foreground/90">{result.title}</div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${sev.bg} ${sev.fg}`}>
          <SevIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
          {sev.label}
        </span>
      </div>

      {/* Sections */}
      <div className="space-y-5 p-5">
        <Section icon={Stethoscope} title="The Problem" accent="text-info">
          <p className="text-sm leading-relaxed text-foreground/90">{result.problem}</p>
        </Section>

        <Section icon={AlertTriangle} title="Symptoms" accent="text-warning">
          <ul className="space-y-1.5">
            {result.symptoms.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section icon={ListChecks} title="Action Plan" accent="text-success">
          <ol className="space-y-2">
            {result.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/40 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="text-sm text-foreground/90">{a}</span>
              </li>
            ))}
          </ol>
        </Section>
      </div>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: typeof Info;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className={`mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${accent}`}>
        <Icon className="h-4 w-4" />
        {title}
      </div>
      {children}
    </div>
  );
}

export function NoResultCard({ query, brandName }: { query: string; brandName: string }) {
  return (
    <div className="animate-fade-up rounded-2xl border border-border bg-card p-6 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <FileQuestion className="h-7 w-7 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold">No Data Found</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Code <span className="font-mono text-foreground">{query}</span> not found in {brandName} or Global OBD2 database.
      </p>
      <div className="mx-auto mt-4 max-w-sm rounded-xl border border-border/60 bg-background/40 p-4 text-left">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-warning">
          <Wrench className="h-4 w-4" /> Suggested Next Step
        </div>
        <ul className="space-y-1.5 text-sm text-foreground/90">
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />Wiring harness & connectors check pannunga.</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />Battery voltage & ground points verify pannunga.</li>
          <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />Code-a manufacturer service manual-la cross-check pannunga.</li>
        </ul>
      </div>
    </div>
  );
}
