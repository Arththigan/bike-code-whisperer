import { History, Pin } from "lucide-react";
import type { PinnedItem } from "./PinnedCodes";
import { isPinned } from "./PinnedCodes";

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
  pinned,
  onTogglePin,
}: {
  items: HistoryItem[];
  onPick: (item: HistoryItem) => void;
  onClear: () => void;
  pinned: PinnedItem[];
  onTogglePin: (item: HistoryItem) => void;
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
        {items.map((it) => {
          const pinned_ = isPinned(pinned, it.code, it.brandId);
          return (
            <div
              key={`${it.brandId}-${it.code}-${it.ts}`}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/50 px-3 py-1.5 text-xs font-medium hover:border-primary hover:bg-card transition-all"
            >
              <button
                onClick={() => onPick(it)}
                className="inline-flex items-center gap-2"
              >
                <span className="font-mono font-bold text-primary">{it.code}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground/80">{it.brandName}</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onTogglePin(it); }}
                className={`transition-all ${pinned_ ? "text-warning opacity-100" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-warning"}`}
                title={pinned_ ? "Unpin" : "Pin this code"}
              >
                <Pin className={`h-3 w-3 ${pinned_ ? "fill-warning/60" : ""}`} />
              </button>
            </div>
          );
        })}
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
