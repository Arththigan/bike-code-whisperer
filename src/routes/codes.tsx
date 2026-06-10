import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { Plus, Search, Trash2, ArrowLeft, Upload, Download, Loader2, Pencil, X, ChevronDown, Check } from "lucide-react";
import { toast } from "sonner";
import { ResultCard } from "@/components/ResultCard";
import {
  BRANDS,
  SEVERITY_LABEL,
  getAllBuiltInCodes,
  type OBDCode,
  type Severity,
} from "@/data/obdCodes";
import {
  subscribeToFirebaseCodes,
  addFirebaseCode,
  deleteFirebaseCode,
  bulkImportCodes,
  type FirebaseCode,
} from "@/lib/firebaseDb";
import { parseCSVToCodes, exportCodesAsCSV } from "@/lib/dataUtils";
import { useAuth } from "@/components/AuthProvider";
import { translations, translateDTCTitle } from "@/lib/translations";

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
  const { language } = useAuth();
  const t = (key: string) => translations[key]?.[language] || translations[key]?.["english"] || key;

  const [firebaseCodes, setFirebaseCodes] = useState<FirebaseCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [showCustomOnly, setShowCustomOnly] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [editingCode, setEditingCode] = useState<FirebaseCode | null>(null);
  const [previewCode, setPreviewCode] = useState<(OBDCode & { brandId: string }) | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelImportRef = useRef<boolean>(false);

  useEffect(() => {
    setIsLoading(true);
    // Subscribe to real-time updates (offline-first & instant)
    const unsubscribe = subscribeToFirebaseCodes(
      (codes) => {
        console.log(`[Codes Page] Successfully synced ${codes.length} codes from Firestore.`);
        setFirebaseCodes(codes);
        setIsLoading(false);
      },
      (error) => {
        console.error("Firestore sync subscription failed:", error);
        toast.error(`Database Connection Error: ${error.message || error}`);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddCode = async (c: FirebaseCode) => {
    setIsLoading(true);
    try {
      await addFirebaseCode(c);
      toast.success(editingCode ? "Code updated successfully!" : "Code added to Firebase!");
      setShowForm(false);
      setEditingCode(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error adding code";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm("Are you sure you want to delete this custom code?")) return;
    setIsLoading(true);
    await deleteFirebaseCode(id);
    toast.success("Code deleted!");
    setIsLoading(false);
  };

  const handleEditClick = (c: FirebaseCode) => {
    setEditingCode(c);
    setShowForm(true);
    setTimeout(() => {
      document.getElementById("form-anchor")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      cancelImportRef.current = false;
      const { codes, brand } = await parseCSVToCodes(file);
      if (codes.length === 0) {
        toast.error("No valid codes found in CSV");
        return;
      }

      setImportProgress({ current: 0, total: codes.length });
      const count = await bulkImportCodes(codes, (current, total) => {
        if (!cancelImportRef.current) {
          setImportProgress({ current, total });
        }
      }, cancelImportRef);

      // Only display success if cancellation was not triggered
      if (!cancelImportRef.current) {
        const duplicateCount = codes.length - count;
        toast.success(`Successfully imported ${count} codes${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''} for ${brand || 'various brands'}`);
      }
    } catch (error) {
      if (!cancelImportRef.current) {
        toast.error(error instanceof Error ? error.message : "Error importing codes");
      }
      console.error(error);
    } finally {
      setIsImporting(false);
      setImportProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const all = useMemo(() => {
    const builtIn = getAllBuiltInCodes().map((c) => ({ ...c, isCustom: false, isEditable: false }));
    const custom = firebaseCodes.map((c) => ({ ...c, isCustom: c.isCustom === true, isEditable: true }));
    return [...custom, ...builtIn];
  }, [firebaseCodes]);

  const filtered = all.filter((c) => {
    const sevMatch = filter === "all" || SEVERITY_LABEL[c.severity] === filter;
    // Brand match: allow "all", specific brand, or generic only
    const brandMatch =
      brandFilter === "all" ||
      (brandFilter === "generic"
        ? c.brandId === "global_obd2" || c.brandId === "generic"
        : c.brandId === brandFilter);
    const customMatch = !showCustomOnly || c.isCustom;
    const q = query.trim().toUpperCase();
    const brandName = BRANDS.find((b) => b.id === c.brandId)?.name ?? "Global OBD2";
    const exactCodeMatch = q && c.code.toUpperCase() === q;
    const qMatch = !q ||
      c.code.toUpperCase().includes(q) ||
      c.title.toUpperCase().includes(q) ||
      brandName.toUpperCase().includes(q);
    // Show if severity matches and brand matches (category filter removed)
    return sevMatch && brandMatch && customMatch && (exactCodeMatch || qMatch);
  });

  return (
    <>
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:pt-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("backToSearch")}
        </Link>
        <div className="flex gap-2">
           <input 
              type="file" 
              accept=".csv" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
           />
           <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting || isLoading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50"
           >
              {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t("importCsvBtn")}
           </button>
           <button
              onClick={() => exportCodesAsCSV(all)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-secondary text-foreground hover:bg-secondary/80 transition-colors border border-border disabled:opacity-50"
           >
              <Download className="h-4 w-4" />
              {t("exportBtn")}
           </button>
        </div>
      </div>
      {isImporting && importProgress && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 animate-in fade-in slide-in-from-top-3 duration-300" style={{ boxShadow: "var(--shadow-glow)" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              Importing DTC Codes to Cloud Database...
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-extrabold text-primary bg-primary/10 px-2.5 py-0.5 rounded">
                {Math.round(((importProgress.current ?? 0) / importProgress.total) * 100)}%
              </span>
              <button
                onClick={() => {
                  cancelImportRef.current = true;
                  // Instantly clear importing states to make UI responsive in 0ms!
                  setIsImporting(false);
                  setImportProgress(null);
                  toast.dismiss();
                  toast.warning("Import cancelled! Database synchronization halted.");
                }}
                className="text-[9px] font-bold uppercase tracking-wider bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white px-2.5 py-1 rounded-lg transition-all duration-150 active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
          <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden border border-border/50 mb-2">
            <div 
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${((importProgress.current ?? 0) / importProgress.total) * 100}%`,
                background: "var(--gradient-primary)" 
              }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider text-muted-foreground">
            <span>Progress: {importProgress.current ?? 0} / {importProgress.total} Codes Imported</span>
            <span className="text-primary">{Math.round(((importProgress.current ?? 0) / importProgress.total) * 100)}% Completed</span>
          </div>
        </div>
      )}

      {/* Add new code header */}
      <section className="mb-6 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
          {t("dictionaryHeader")}
        </h2>
        <button
          onClick={() => {
            if (showForm && editingCode) {
              setEditingCode(null);
            } else {
              setShowForm((v) => !v);
              setEditingCode(null);
            }
          }}
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 transition-transform active:scale-95"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          {showForm ? <ArrowLeft className="h-4 w-4" strokeWidth={3} /> : <Plus className="h-4 w-4" strokeWidth={3} />}
          {showForm ? (editingCode ? t("backBtn") : t("cancelBtn")) : t("addCustomBtn")}
        </button>
      </section>

      <div id="form-anchor" />
      {showForm && (
        <AddCodeForm 
          onAdd={handleAddCode} 
          isLoading={isLoading} 
          initialData={editingCode}
          onCancel={() => {
            setShowForm(false);
            setEditingCode(null);
          }}
        />
      )}

      {/* Filter bar */}
      <section className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground flex items-center gap-2">
          {t("allCodesLabel")} <span className="text-foreground/60 rounded-full bg-secondary px-2 py-0.5">{filtered.length}</span>
          {isLoading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchDtcPlaceholder")}
              className="h-9 w-44 rounded-lg border border-border bg-input pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
            <div className="flex gap-1.5 items-center">
              {/* Brand Dropdown */}
              <label className="text-xs font-medium text-muted-foreground mr-2">{t("brandLabel")}</label>
              <select
                value={brandFilter}
                onChange={e => setBrandFilter(e.target.value)}
                className="rounded-lg border border-border bg-card px-3 py-1 text-sm focus:border-primary mr-4"
              >
                <option value="all">{t("allOption")}</option>
                <option value="generic">{t("generic")}</option>
                {BRANDS.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>

              {/* Severity Filter Dropdown */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <SeverityDropdown filter={filter} setFilter={setFilter} t={t} />
              </div>

              {/* Custom Code Toggle */}
              <label className="inline-flex items-center space-x-2 ml-4">
                <input
                  type="checkbox"
                  checked={showCustomOnly}
                  onChange={e => setShowCustomOnly(e.target.checked)}
                  className="form-checkbox h-4 w-4 text-primary border-border"
                />
                <span className="text-xs font-medium text-muted-foreground">{t("customOnly")}</span>
              </label>
            </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <CodeTile
            key={`${c.brandId}-${c.code}-${c.isEditable ? "x" : "b"}`}
            code={c}
            onPreview={() => setPreviewCode(c)}
            onDelete={
              (c as any).id
                ? () => handleDeleteCode((c as any).id)
                : undefined
            }
            onEdit={
              c.isEditable
                ? () => handleEditClick(c)
                : undefined
            }
          />
        ))}
        {filtered.length === 0 && !isLoading && (
          <div className="col-span-full py-16 text-center rounded-3xl border border-dashed border-border bg-card/30 flex flex-col items-center justify-center gap-3">
             <Search className="h-8 w-8 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground font-medium">
              {t("noCodesMatch")}
            </p>
          </div>
        )}
      </section>
    </main>

    {/* Preview Modal */}
    {previewCode && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => setPreviewCode(null)}
      >
        <div
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setPreviewCode(null)}
            className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          <ResultCard
            result={previewCode}
            brandName={BRANDS.find((b) => b.id === previewCode.brandId)?.name ?? "Global OBD2"}
          />
        </div>
      </div>
    )}
    </>
  );
}
function SeverityDropdown({
  filter,
  setFilter,
  t,
}: {
  filter: Filter;
  setFilter: (f: Filter) => void;
  t: (key: string) => string;
}) {
  const [sevOpen, setSevOpen] = useState(false);
  const sevRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sevRef.current && !sevRef.current.contains(event.target as Node)) {
        setSevOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filterKey =
    filter === "all"
      ? "allOption"
      : filter === "Low"
      ? "low"
      : filter === "Medium"
      ? "medium"
      : "high";

  return (
    <div ref={sevRef} className="relative">
      <button
        onClick={() => setSevOpen(!sevOpen)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-foreground hover:bg-secondary transition-colors min-w-[90px] justify-between"
      >
        <span>{t(filterKey)}</span>
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-200 ${sevOpen ? "rotate-180" : ""}`}
        />
      </button>
      {sevOpen && (
        <div className="absolute top-full left-0 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in slide-in-from-top-2 duration-200 z-50">
          <div className="p-1">
            {(["all", "Low", "Medium", "High"] as Filter[]).map((f) => {
              const fKey =
                f === "all"
                  ? "allOption"
                  : f === "Low"
                  ? "low"
                  : f === "Medium"
                  ? "medium"
                  : "high";
              return (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setSevOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-wide transition-colors ${
                    filter === f
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  {t(fKey)}
                  {filter === f && <Check className="h-3 w-3" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CodeTile({
  code,
  onDelete,
  onEdit,
  onPreview,
}: {
  code: OBDCode & { brandId: string; isCustom?: boolean; isAIGenerated?: boolean; isEditable?: boolean };
  onDelete?: () => void;
  onEdit?: () => void;
  onPreview?: () => void;
}) {
  const { language } = useAuth();
  const t = (key: string) => translations[key]?.[language] || translations[key]?.["english"] || key;
  const brand = BRANDS.find((b) => b.id === code.brandId)?.name ?? "Global OBD2";
  const severityKey = code.severity === "critical" ? "high" : code.severity === "warning" ? "medium" : "low";

  return (
    <article
      onClick={onPreview}
      className="group relative rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 cursor-pointer"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-lg font-extrabold tracking-wider text-primary">
          {code.code}
        </span>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${sevPill[code.severity]}`}
          >
            {t(severityKey)}
          </span>
        </div>
      </div>
      <h3 className="mt-2 text-sm font-bold leading-snug text-foreground line-clamp-2">
        {translateDTCTitle(code.title, language)}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {/* Status badge: Custom / Generic / Brand */}
          <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
            code.isCustom
              ? "bg-secondary text-muted-foreground border border-border"
              : (code.brandId === "global_obd2" || code.brandId === "generic")
                ? "bg-info/15 text-info border border-info/30"
                : "bg-primary/15 text-primary border border-primary/30"
          }`}>
            {code.isCustom
              ? t("custom")
              : (code.brandId === "global_obd2" || code.brandId === "generic")
                ? t("generic")
                : (BRANDS.find((b) => b.id === code.brandId)?.name ?? "Unknown")}
          </span>
      </div>
      
      {/* Edit and Delete Buttons visible on hover */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label="Edit custom code"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Delete custom code"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </article>
  );
}

function AddCodeForm({
  onAdd,
  isLoading,
  initialData,
  onCancel,
}: {
  onAdd: (c: FirebaseCode) => void;
  isLoading: boolean;
  initialData?: FirebaseCode | null;
  onCancel?: () => void;
}) {
  const { language } = useAuth();
  const t = (key: string) => translations[key]?.[language] || translations[key]?.["english"] || key;

  const [code, setCode] = useState(initialData?.code ?? "");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [brandId, setBrandId] = useState(initialData?.brandId ?? "global_obd2");
  const [severity, setSeverity] = useState<Severity>(initialData?.severity ?? "warning");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [location, setLocation] = useState(initialData?.location ?? "");
  const [problem, setProblem] = useState(initialData?.problem ?? "");
  const [symptoms, setSymptoms] = useState(initialData?.symptoms?.join("\n") ?? "");
  const [causes, setCauses] = useState(initialData?.causes?.join("\n") ?? "");
  const [actions, setActions] = useState(initialData?.actions?.join("\n") ?? "");

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setTitle(initialData.title);
      setBrandId(initialData.brandId);
      setSeverity(initialData.severity);
      setCategory(initialData.category ?? "");
      setLocation(initialData.location ?? "");
      setProblem(initialData.problem ?? "");
      setSymptoms(initialData.symptoms?.join("\n") ?? "");
      setCauses(initialData.causes?.join("\n") ?? "");
      setActions(initialData.actions?.join("\n") ?? "");
    } else {
      setCode("");
      setTitle("");
      setBrandId("global_obd2");
      setSeverity("warning");
      setCategory("");
      setLocation("");
      setProblem("");
      setSymptoms("");
      setCauses("");
      setActions("");
    }
  }, [initialData]);

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
      isCustom: initialData ? (initialData.isCustom ?? false) : true,
    });
  };

  const inputCls =
    "w-full h-10 rounded-lg border border-border bg-input px-3 text-sm focus:border-primary focus:outline-none transition-colors";
  const taCls =
    "w-full min-h-20 rounded-lg border border-border bg-input p-3 text-sm focus:border-primary focus:outline-none transition-colors";

  return (
    <form
      onSubmit={submit}
      className="mb-8 grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card/60 p-6 sm:grid-cols-2 animate-in slide-in-from-top-2 fade-in duration-300"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="sm:col-span-2 border-b border-border pb-2 mb-2 flex items-center justify-between">
         <div>
            <h3 className="text-sm font-bold">{initialData ? t("editDiagnosticCode") : t("newDiagnosticCode")}</h3>
            <p className="text-xs text-muted-foreground">{initialData ? t("editDiagnosticCodeDesc") : t("newDiagnosticCodeDesc")}</p>
         </div>
         {onCancel && (
           <button 
             type="button" 
             onClick={onCancel}
             className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 bg-secondary/50"
           >
             {t("cancelBtn")}
           </button>
         )}
      </div>

      <Field label={t("dtcCodeLabel")}>
        <input required disabled={isLoading || !!initialData} className={inputCls + " font-mono uppercase"} value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. P0123" />
      </Field>
      <Field label={t("faultTitleLabel")}>
        <input required disabled={isLoading} className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Throttle Position Sensor High Input" />
      </Field>
      <Field label={t("motorcycleBrandLabel")}>
        <select disabled={isLoading || !!initialData} className={inputCls} value={brandId} onChange={(e) => setBrandId(e.target.value)}>
          <option value="global_obd2">Global OBD2 / Generic</option>
          {BRANDS.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      </Field>
      <Field label={t("severityLevelLabel")}>
        <select disabled={isLoading} className={inputCls} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
          <option value="info">{t("lowSeverity")}</option>
          <option value="warning">{t("mediumSeverity")}</option>
          <option value="critical">{t("highSeverity")}</option>
        </select>
      </Field>
      <Field label={t("systemCategoryLabel")}>
        <input disabled={isLoading} className={inputCls} value={category} onChange={(e) => setCategory(e.target.value)} placeholder={t("categoryPlaceholder")} />
      </Field>
      <Field label={t("componentLocationLabel")}>
        <input disabled={isLoading} className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("locationPlaceholder")} />
      </Field>
      <Field label={t("problemDescriptionLabel")} full>
        <textarea disabled={isLoading} className={taCls} value={problem} onChange={(e) => setProblem(e.target.value)} placeholder={t("problemDescriptionPlaceholder")} />
      </Field>
      <Field label={t("symptomsLabel")}>
        <textarea disabled={isLoading} className={taCls} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="- Hard starting&#10;- Poor fuel economy" />
      </Field>
      <Field label={t("causesLabel")}>
        <textarea disabled={isLoading} className={taCls} value={causes} onChange={(e) => setCauses(e.target.value)} placeholder="- Faulty sensor&#10;- Damaged wiring harness" />
      </Field>
      <Field label={t("fixesLabel")} full>
        <textarea disabled={isLoading} className={taCls} value={actions} onChange={(e) => setActions(e.target.value)} placeholder="- Check sensor resistance&#10;- Replace if out of spec" />
      </Field>
      <div className="sm:col-span-2 flex justify-end pt-2 border-t border-border mt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50 transition-all hover:-translate-y-0.5 active:translate-y-0"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" strokeWidth={3} />} 
          {isLoading ? t("savingLoader") : initialData ? t("updateCodeBtn") : t("saveToDbBtn")}
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
