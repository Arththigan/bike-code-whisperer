import type { OBDCode, Severity } from "@/data/obdCodes";
import { SEVERITY_LABEL } from "@/data/obdCodes";
import { Activity, AlertTriangle, CheckCircle2, FileQuestion, MapPin, Wrench } from "lucide-react";

const sevPill: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border border-critical/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  info: "bg-info/15 text-info border border-info/30",
};

export function ResultCard({ result, brandName }: { result: OBDCode; brandName: string }) {
  const causes =
    result.causes && result.causes.length > 0
      ? result.causes
      : [result.problem];

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
              {brandName} · Diagnostic Code
            </div>
            <div className="mt-1 font-mono text-3xl font-extrabold tracking-wider text-primary">
              {result.code}
            </div>
            <h3 className="mt-2 text-lg font-bold leading-tight text-foreground">
              {result.title}
            </h3>
            {result.category && (
              <p className="mt-0.5 text-xs text-muted-foreground">{result.category}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${sevPill[result.severity]}`}
          >
            {SEVERITY_LABEL[result.severity]} Severity
          </span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/85">{result.problem}</p>
      </div>

      {/* 2x2 quadrant grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2">
        <Quadrant icon={MapPin} title="Location" accent="text-primary" border="border-b sm:border-r">
          <p className="text-sm text-foreground/90">
            {result.location ?? "Refer to service manual for component location."}
          </p>
        </Quadrant>
        <Quadrant icon={Activity} title="Symptoms" accent="text-critical" border="border-b">
          <BulletList items={result.symptoms} />
        </Quadrant>
        <Quadrant icon={AlertTriangle} title="Possible Causes" accent="text-warning" border="sm:border-r">
          <BulletList items={causes} />
        </Quadrant>
        <Quadrant icon={Wrench} title="Fixes" accent="text-success" border="">
          <BulletList items={result.actions} />
        </Quadrant>
      </div>
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

export function NoResultCard({ query, brandName }: { query: string; brandName: string }) {
  return (
    <div
      className="animate-fade-up rounded-2xl border border-border bg-card p-6 text-center"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
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
