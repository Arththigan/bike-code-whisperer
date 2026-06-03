import { Bike, Wrench } from "lucide-react";
import { useEffect, useState } from "react";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 1700);
    const t2 = setTimeout(onDone, 2200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full animate-pulse-glow" />
        <div
          className="relative flex h-28 w-28 items-center justify-center rounded-full overflow-hidden border-2 border-primary/30"
          style={{ boxShadow: "var(--shadow-glow)" }}
        >
          <img src="/logo.png" alt="AK Arun Wiring Logo" className="h-full w-full object-cover" />
        </div>
      </div>
      <h1 className="text-3xl font-extrabold tracking-tight">
        OBD<span className="text-primary">-</span>Decoder
      </h1>
      <p className="mt-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
        <Wrench className="h-3 w-3" /> Mechanic Workshop Tool
      </p>
    </div>
  );
}
