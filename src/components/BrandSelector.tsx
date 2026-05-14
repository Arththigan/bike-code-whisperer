import { BRANDS } from "@/data/obdCodes";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface BrandSelectorProps {
  selected: string | null;
  onSelect: (id: string) => void;
}

// Popular brands in Sri Lanka to show as quick-select chips
const FEATURED_BRANDS = ["tvs", "bajaj", "honda", "yamaha", "hero"];

export function BrandSelector({ selected, onSelect }: BrandSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedBrand = BRANDS.find(b => b.id === selected);
  const otherBrands = BRANDS.filter(b => !FEATURED_BRANDS.includes(b.id));

  return (
    <div className="space-y-4">


      {/* Quick Select Chips */}
      <div className="flex flex-wrap gap-2">
        {FEATURED_BRANDS.map((id) => {
          const brand = BRANDS.find((b) => b.id === id);
          if (!brand) return null;
          const isActive = selected === id;

          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={cn(
                "px-5 py-2.5 rounded-full text-xs font-bold transition-all border",
                isActive 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-[1.02]" 
                  : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {brand.name}
            </button>
          );
        })}

        {/* Dropdown for other brands */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all border",
              isOpen || (selected && !FEATURED_BRANDS.includes(selected))
                ? "bg-secondary border-secondary text-secondary-foreground shadow-md"
                : "bg-background border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
            )}
          >
            {selected && !FEATURED_BRANDS.includes(selected) ? selectedBrand?.name : "Other Brands"}
            <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
          </button>

          {isOpen && (
            <div className="absolute left-0 mt-2 w-56 max-h-64 overflow-y-auto rounded-2xl border bg-popover p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="grid gap-1">
                {otherBrands.map((brand) => (
                  <button
                    key={brand.id}
                    onClick={() => {
                      onSelect(brand.id);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-medium transition-colors text-left",
                      selected === brand.id 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-primary hover:text-primary-foreground"
                    )}
                  >
                    {brand.name}
                    {selected === brand.id && <Check className="h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
