import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, ArrowLeft } from "lucide-react";
import {
  BRANDS,
  CODES,
  SEVERITY_LABEL,
  addCustomCode,
  deleteCustomCode,
  loadCustomCodes,
  type CustomCode,
  type OBDCode,
  type Severity,
} from "@/data/obdCodes";

export const Route = createFileRoute("/codes")({
  component: CodesPage,
});

type Filter = "all" | "Low" | "Medium" | "High";

const sevPill: Record<Severity, string> = {
  critical: "bg-critical/15 text-critical border border-critical/30",
  warning: "bg-warning/15 text-warning border border-warning/30",
  info: "bg-info/15 text-info border border-info/30",
};

function CodesPage() {
  const [custom, setCustom] = useState<CustomCode[]>(() => loadCustomCodes());
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const all = useMemo(() => {
    const built = Object.entries(CODES).flatMap(([brandId, list]) =>
      list.map((c) => ({ ...c, brandId, isCustom: false })),
    );
    const cust = custom.map((c) => ({ ...c, isCustom: true }));
    return [...cust, ...built];
  }, [custom]);

  const filtered = all.filter((c) => {
    const sevMatch = filter === "all" || SEVERITY_LABEL[c.severity] === filter;
    const q = query.trim().toUpperCase();
    const qMatch = !q || c.code.toUpperCase().includes(q) || c.title.toUpperCase().includes(q);
    return sevMatch && qMatch;
  });

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
      </div>

      {/* Add new code header */}
      <section className="mb-6 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          Add New Code
        </h2>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          {showForm ? "Close" : "Add Code"}
        </button>
      </section>

      {showForm && (
        <AddCodeForm
          onAdd={(c) => {
            setCustom(addCustomCode(c));
            setShowForm(false);
          }}
        />
      )}

      {/* Filter bar */}
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          All Codes <span className="ml-1 text-foreground/60">({filtered.length})</span>
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search code..."
              className="h-9 w-44 rounded-lg border border-border bg-input pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-1.5">
            {(["all", "Low", "Medium", "High"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f === "all" ? "All" : f}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <CodeTile
            key={`${c.brandId}-${c.code}-${c.isCustom ? "x" : "b"}`}
            code={c}
            onDelete={
              c.isCustom
                ? () => setCustom(deleteCustomCode(c.brandId, c.code))
                : undefined
            }
          />
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
            No codes match your filter.
          </p>
        )}
      </section>
    </main>
  );
}

function CodeTile({
  code,
  onDelete,
}: {
  code: OBDCode & { brandId: string; isCustom?: boolean };
  onDelete?: () => void;
}) {
  const brand = BRANDS.find((b) => b.id === code.brandId)?.name ?? "Global OBD2";
  return (
    <article
      className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-lg font-extrabold tracking-wider text-primary">
          {code.code}
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevPill[code.severity]}`}
        >
          {SEVERITY_LABEL[code.severity]}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-bold leading-snug text-foreground">{code.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {brand}
        {code.category ? ` · ${code.category}` : ""}
      </p>
      {onDelete && (
        <button
          onClick={onDelete}
          className="absolute bottom-3 right-3 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
          aria-label="Delete custom code"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </article>
  );
}

function AddCodeForm({ onAdd }: { onAdd: (c: CustomCode) => void }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [brandId, setBrandId] = useState("global_obd2");
  const [severity, setSeverity] = useState<Severity>("warning");
  const [category, setCategory] = useState("");
  const [location, setLocation] = useState("");
  const [problem, setProblem] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [causes, setCauses] = useState("");
  const [actions, setActions] = useState("");

  const split = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !title.trim()) return;
    onAdd({
      brandId,
      code: code.trim().toUpperCase(),
      title: title.trim(),
      severity,
      category: category.trim() || undefined,
      location: location.trim() || undefined,
      problem: problem.trim(),
      symptoms: split(symptoms),
      causes: split(causes),
      actions: split(actions),
    });
  };

  const inputCls =
    "w-full h-10 rounded-lg border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none";
  const taCls =
    "w-full min-h-20 rounded-lg border border-border bg-input p-3 text-sm focus:border-primary focus:outline-none";

  return (
    <form
      onSubmit={submit}
      className="mb-8 grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card/60 p-5 sm:grid-cols-2"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <Field label="Code">
        <input className={inputCls + " font-mono uppercase"} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. P0123" />
      </Field>
      <Field label="Title">
        <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Throttle Position Sensor High Input" />
      </Field>
      <Field label="Brand">
        <select className={inputCls} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
          <option value="global_obd2">Global OBD2</option>
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Field>
      <Field label="Severity">
        <select className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          <option value="info">Low</option>
          <option value="warning">Medium</option>
          <option value="critical">High</option>
        </select>
      </Field>
      <Field label="Category">
        <input className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Engine / Throttle" />
      </Field>
      <Field label="Location">
        <input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Engine front - Left side" />
      </Field>
      <Field label="Problem" full>
        <textarea className={taCls} value={problem} onChange={(e) => setProblem(e.target.value)} />
      </Field>
      <Field label="Symptoms (one per line)">
        <textarea className={taCls} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
      </Field>
      <Field label="Possible Causes (one per line)">
        <textarea className={taCls} value={causes} onChange={(e) => setCauses(e.target.value)} />
      </Field>
      <Field label="Fixes (one per line)" full>
        <textarea className={taCls} value={actions} onChange={(e) => setActions(e.target.value)} />
      </Field>
      <div className="sm:col-span-2 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="h-4 w-4" strokeWidth={3} /> Save Code
        </button>
      </div>
    </form>
  );
}

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`flex flex-col gap-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
