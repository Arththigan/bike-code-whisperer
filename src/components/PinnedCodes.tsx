import { Pin, PinOff, Star } from "lucide-react";
import type { HistoryItem } from "./RecentHistory";

export interface PinnedItem {
  code: string;
  brandId: string;
  brandName: string;
  pinnedAt: number;
}

export const PINNED_KEY = "obd-decoder-pinned-v1";

export function loadPinned(): PinnedItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PINNED_KEY) || "[]");
  } catch {
    return [];
  }
}

export function savePinned(items: PinnedItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PINNED_KEY, JSON.stringify(items.slice(0, 10)));
}

export function togglePin(
  pinned: PinnedItem[],
  item: HistoryItem | PinnedItem
): PinnedItem[] {
  const exists = pinned.some(
    (p) => p.code === item.code && p.brandId === item.brandId
  );
  if (exists) {
    return pinned.filter(
      (p) => !(p.code === item.code && p.brandId === item.brandId)
    );
  }
  const newPin: PinnedItem = {
    code: item.code,
    brandId: item.brandId,
    brandName: item.brandName,
    pinnedAt: Date.now(),
  };
  return [newPin, ...pinned].slice(0, 10);
}

export function isPinned(pinned: PinnedItem[], code: string, brandId: string) {
  return pinned.some((p) => p.code === code && p.brandId === brandId);
}

export function PinnedCodes({
  items,
  onPick,
  onUnpin,
}: {
  items: PinnedItem[];
  onPick: (item: PinnedItem) => void;
  onUnpin: (item: PinnedItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Star className="h-4 w-4 text-warning fill-warning/40" />
        Pinned Codes
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <div
            key={`${it.brandId}-${it.code}`}
            className="group inline-flex items-center gap-2 rounded-full border border-warning/30 bg-warning/5 px-3 py-1.5 text-xs font-medium hover:border-warning/60 hover:bg-warning/10 transition-all"
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
              onClick={(e) => {
                e.stopPropagation();
                onUnpin(it);
              }}
              className="ml-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
              title="Unpin"
            >
              <PinOff className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Small pin toggle button — used inside history chips */
export function PinToggleButton({
  pinned,
  onClick,
}: {
  pinned: boolean;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`ml-1 transition-all opacity-0 group-hover:opacity-100 ${
        pinned
          ? "text-warning opacity-100"
          : "text-muted-foreground hover:text-warning"
      }`}
      title={pinned ? "Unpin" : "Pin this code"}
    >
      {pinned ? (
        <Pin className="h-3 w-3 fill-warning/60" />
      ) : (
        <Pin className="h-3 w-3" />
      )}
    </button>
  );
}
