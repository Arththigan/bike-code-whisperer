import { BRANDS } from "@/data/obdCodes";
import { Check } from "lucide-react";

export function BrandSelector({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Select Bike Brand
        </h2>
        {selected && (
          <span className="text-xs text-primary">
            {BRANDS.find((b) => b.id === selected)?.name} selected
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {BRANDS.map((b) => {
          const active = selected === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`relative overflow-hidden rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-primary bg-card"
                  : "border-border bg-card/60 hover:border-primary/50 hover:bg-card"
              }`}
              style={active ? { boxShadow: "var(--shadow-glow)" } : undefined}
            >
              {active && (
                <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" strokeWidth={3} />
                </div>
              )}
              <div className="text-base font-bold">{b.name}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{b.tagline}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
