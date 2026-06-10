import { useEffect, useState } from "react";
import { Lightbulb } from "lucide-react";

const TIPS = [
  {
    en: "P0 codes are generic OBD2 codes shared across all manufacturers.",
    ta: "P0 குறியீடுகள் அனைத்து வாகன நிறுவனங்களுக்கும் பொதுவான OBD2 குறியீடுகள்.",
    tl: "P0 codes ellaa manufacturers-kumaana generic OBD2 codes.",
  },
  {
    en: "P1 codes are manufacturer-specific — always check the brand first.",
    ta: "P1 குறியீடுகள் குறிப்பிட்ட நிறுவனத்திற்கு மட்டுமானவை — முதலில் பிராண்டை சரிபார்க்கவும்.",
    tl: "P1 codes manufacturer-specific — first brand-ai check pannunga.",
  },
  {
    en: "Always clear fault codes after a repair to confirm the fix worked.",
    ta: "சரிசெய்த பிறகு குறியீட்டை அழித்து, சரிசெய்தல் வேலை செய்கிறதா என உறுதிப்படுத்தவும்.",
    tl: "Repair panna apparam fault code-ai clear pannunga — fix sariyana endru confirm aagum.",
  },
  {
    en: "A loose sensor connector is one of the most common causes of false fault codes.",
    ta: "தளர்வான சென்சார் கனெக்டர் பலவேளை தவறான குறியீடுகளுக்கு காரணமாகிறது.",
    tl: "Loose sensor connector thaan pala nerathil fake fault codes-ku karanam.",
  },
  {
    en: "Low battery voltage can trigger multiple unrelated fault codes simultaneously.",
    ta: "பேட்டரி மின்னழுத்தம் குறைவாக இருந்தால் தொடர்பில்லாத பல குறியீடுகள் ஒரே நேரத்தில் வரலாம்.",
    tl: "Battery voltage kam-aagiruந்தா, sambantham illatha pala codes oru nerathil varum.",
  },
  {
    en: "Throttle Position Sensor (TPS) faults are among the most frequent on fuel-injected bikes.",
    ta: "எரிபொருள் ஊசி வாகனங்களில் TPS (Throttle Position Sensor) பழுது மிகவும் பொதுவானது.",
    tl: "Fuel-injected bikes-la TPS (Throttle Position Sensor) fault romba common.",
  },
  {
    en: "Always check wiring harness condition before replacing a sensor.",
    ta: "சென்சார் மாற்றுவதற்கு முன் வயர் ஹார்னஸை சரிபார்க்கவும்.",
    tl: "Sensor replace panna munnaadi wiring harness-ai check pannunga.",
  },
  {
    en: "Oxygen sensor codes often point to exhaust leaks, not just a bad sensor.",
    ta: "ஆக்சிஜன் சென்சார் குறியீடு வெறும் சென்சார் மட்டுமின்றி எக்ஸாஸ்ட் கசிவையும் குறிக்கலாம்.",
    tl: "O2 sensor code vandha, sensor maatrum illaamal exhaust leak-um check pannunga.",
  },
  {
    en: "After a crash or water exposure, always scan for fault codes before riding.",
    ta: "விபத்து அல்லது தண்ணீர் பட்ட பிறகு வாகனம் ஓட்டுவதற்கு முன் குறியீடுகளை சரிபார்க்கவும்.",
    tl: "Accident alladhu rain exposure apparam ride panna munnaadi codes-ai scan pannunga.",
  },
  {
    en: "Intermittent codes that clear on their own often indicate loose connections.",
    ta: "தானாகவே சரியாகும் குறியீடுகள் பெரும்பாலும் தளர்வான இணைப்புகளை குறிக்கும்.",
    tl: "Thaanaave clear aagra codes paarunga — loose connections-ku sign.",
  },
];

export function TipCard({ language }: { language: string }) {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % TIPS.length);
        setVisible(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const tip = TIPS[idx];
  const text =
    language === "tamil" ? tip.ta : language === "tanglish" ? tip.tl : tip.en;

  const label =
    language === "tamil"
      ? "தெரியுமா?"
      : language === "tanglish"
      ? "Theriyumaa?"
      : "Did you know?";

  return (
    <div
      className="rounded-2xl border border-info/25 bg-info/5 p-4 transition-opacity duration-400"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-info">
        <Lightbulb className="h-4 w-4 fill-info/30" />
        {label}
      </div>
      <p className="text-sm leading-relaxed text-foreground/85">{text}</p>

      {/* Dot indicators */}
      <div className="mt-3 flex gap-1.5">
        {TIPS.map((_, i) => (
          <button
            key={i}
            onClick={() => { setVisible(false); setTimeout(() => { setIdx(i); setVisible(true); }, 400); }}
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: i === idx ? "1.5rem" : "0.375rem",
              background: i === idx ? "hsl(var(--info))" : "hsl(var(--border))",
            }}
          />
        ))}
      </div>
    </div>
  );
}
