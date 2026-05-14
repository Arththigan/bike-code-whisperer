import { Search, Zap } from "lucide-react";
import { useState } from "react";

export function SearchBar({
  onAnalyze,
  disabled,
  label = "Enter DTC / Blink Code (e.g. P0335)",
  buttonText = "Analyze",
}: {
  onAnalyze: (q: string) => void;
  disabled?: boolean;
  label?: string;
  buttonText?: string;
}) {
  const [value, setValue] = useState("");

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim()) return;
    onAnalyze(value.trim());
  };

  return (
    <form onSubmit={submit} className="relative">
      <div className="group relative flex items-center">
        <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground transition-colors group-focus-within:text-primary" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value.toUpperCase())}
          placeholder={label}
          disabled={disabled}
          className="h-14 w-full rounded-2xl border border-border bg-card/40 pl-12 pr-40 font-mono text-base tracking-widest text-foreground transition-all placeholder:text-muted-foreground/50 focus:border-primary/50 focus:bg-card focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className="absolute right-2 h-10 flex items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all active:scale-[0.96] disabled:opacity-0"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Zap className="h-3.5 w-3.5" strokeWidth={3} />
          {buttonText}
        </button>
      </div>
      {disabled && (
        <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-widest text-warning/80">
          ⚠️ Select a brand to start
        </p>
      )}
    </form>
  );
}
