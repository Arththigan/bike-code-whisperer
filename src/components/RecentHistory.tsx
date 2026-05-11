import { History, X } from "lucide-react";

export interface HistoryItem {
  code: string;
  brandId: string;
  brandName: string;
  ts: number;
}

export function RecentHistory({
  items,
  onPick,
  onClear,
}: {
  items: HistoryItem[];
  onPick: (item: HistoryItem) => void;
  onClear: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <History className="h-4 w-4" /> Recent Searches
        </div>
        <button onClick={onClear} className="text-xs text-muted-foreground hover:text-destructive">
          Clear
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={`${it.brandId}-${it.code}-${it.ts}`}
            onClick={() => onPick(it)}
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-primary hover:bg-card"
          >
            <span className="font-mono font-bold text-primary">{it.code}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-foreground/80">{it.brandName}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const HISTORY_KEY = "obd-decoder-history-v1";

export function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 5)));
}
