import { Search, Zap } from "lucide-react";
import { useState } from "react";

export function SearchBar({
  onAnalyze,
  disabled,
}: {
  onAnalyze: (q: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    onAnalyze(value.trim());
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Enter DTC / Blink Code
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            placeholder="e.g. P0335 or 12"
            disabled={disabled}
            className="h-14 w-full rounded-xl border border-border bg-input pl-12 pr-4 font-mono text-lg tracking-wider text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl px-6 font-bold text-primary-foreground transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Zap className="h-5 w-5" strokeWidth={2.5} />
          Analyze
        </button>
      </div>
      {disabled && (
        <p className="text-xs text-warning">Select a bike brand first to begin analysis.</p>
      )}
    </form>
  );
}
