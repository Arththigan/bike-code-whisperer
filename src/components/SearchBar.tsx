import { Search, Zap, Plus, X } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export function SearchBar({
  onAnalyze,
  disabled,
  label = "Enter DTC / Blink Code (e.g. P0335)",
  buttonText = "Analyze",
}: {
  onAnalyze: (codes: string[]) => void;
  disabled?: boolean;
  label?: string;
  buttonText?: string;
}) {
  const [value, setValue] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse separators: comma, space, semicolon, newline
  const parseInput = (raw: string): string[] =>
    raw.split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);

  const addTags = (raw: string) => {
    const parsed = parseInput(raw);
    if (!parsed.length) return;
    setTags(prev => {
      const existing = new Set(prev);
      const newOnes = parsed.filter(c => !existing.has(c));
      return [...prev, ...newOnes];
    });
    setValue("");
  };

  const removeTag = (code: string) =>
    setTags(prev => prev.filter(t => t !== code));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (value.trim()) {
        addTags(value);
      } else if (tags.length > 0) {
        submit();
      }
    } else if ((e.key === "," || e.key === " ") && value.trim()) {
      e.preventDefault();
      addTags(value);
    } else if (e.key === "Backspace" && !value && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase();
    // Auto-split on paste with comma/semicolon
    if (raw.includes(",") || raw.includes(";")) {
      addTags(raw);
    } else {
      setValue(raw);
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const pending = value.trim() ? [...tags, ...parseInput(value)] : tags;
    const unique = [...new Set(pending)];
    if (!unique.length) return;
    setTags([]);
    setValue("");
    onAnalyze(unique);
  };

  const allCodes = value.trim() ? [...tags, ...parseInput(value)] : tags;
  const canSubmit = allCodes.length > 0;

  return (
    <form onSubmit={submit} className="relative">
      <div
        className="group relative flex min-h-14 w-full flex-wrap items-center gap-1.5 rounded-2xl border border-border bg-card/40 px-4 py-2 pr-40 transition-all focus-within:border-primary/50 focus-within:bg-card focus-within:ring-4 focus-within:ring-primary/10"
        onClick={() => inputRef.current?.focus()}
      >
        <Search className="pointer-events-none h-5 w-5 shrink-0 text-muted-foreground transition-colors group-focus-within:text-primary" />

        {/* Code tags */}
        {tags.map((code) => (
          <span
            key={code}
            className="inline-flex items-center gap-1 rounded-lg bg-primary/15 px-2.5 py-0.5 font-mono text-xs font-bold text-primary border border-primary/30"
          >
            {code}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(code); }}
              className="ml-0.5 rounded hover:text-destructive transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}

        {/* Input */}
        <input
          ref={inputRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? label : "Add more codes..."}
          disabled={disabled}
          className="min-w-[120px] flex-1 bg-transparent font-mono text-sm tracking-widest text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-50"
        />

        {/* Submit button */}
        <button
          type="submit"
          disabled={disabled || !canSubmit}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 flex items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold uppercase tracking-wider text-primary-foreground transition-all active:scale-[0.96] disabled:opacity-0"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Zap className="h-3.5 w-3.5" strokeWidth={3} />
          {tags.length > 1 || (tags.length >= 1 && value.trim()) ? `Analyze ${allCodes.length}` : buttonText}
        </button>
      </div>

      {/* Hint */}
      {!disabled && tags.length === 0 && (
        <p className="mt-2 px-1 text-[10px] text-muted-foreground/60">
          Tip: Multiple codes-ku comma use pannunga — P0122, P0123, C1234
        </p>
      )}
      {disabled && (
        <p className="mt-3 px-1 text-[10px] font-bold uppercase tracking-widest text-warning/80">
          ⚠️ Select a brand to start
        </p>
      )}
    </form>
  );
}
