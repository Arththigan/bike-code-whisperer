import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { 
  User, 
  Palette, 
  Database, 
  Download, 
  Upload,
  Check,
  AlertCircle,
  Moon,
  Sun,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { exportCodesAsCSV, parseCSVToCodes } from "@/lib/dataUtils";
import { fetchAllFirebaseCodes, bulkImportCodes } from "@/lib/firebaseDb";
import { getAllBuiltInCodes } from "@/data/obdCodes";
import { useAuth } from "@/components/AuthProvider";
import { translations } from "@/lib/translations";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

type Tab = "profile" | "appearance" | "data";

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const { theme, setTheme } = useTheme();
  const { user, language } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [profile, setProfile] = useState({
    name: "John Doe",
    role: "Workshop Member",
    email: "john@bikeshop.com"
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || "User",
        role: user.role === "admin" ? "System Admin" : "Workshop Member",
        email: user.username || ""
      });
    }
  }, [user]);

  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const t = (key: string) => translations[key]?.[language] || translations[key]?.["english"] || key;

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const { codes, brand } = await parseCSVToCodes(file);
      const count = await bulkImportCodes(codes);
      setImportStatus({ 
        type: 'success', 
        message: `Successfully imported ${count} codes for ${brand || 'various brands'}!` 
      });
    } catch (err) {
      setImportStatus({ 
        type: 'error', 
        message: err instanceof Error ? err.message : "Failed to import codes." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const builtIn = getAllBuiltInCodes().map((c) => ({ ...c, isCustom: false }));
      const custom = await fetchAllFirebaseCodes();
      const all = [...custom.map(c => ({...c, isCustom: true})), ...builtIn];
      exportCodesAsCSV(all);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container max-w-4xl py-10 px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{translations["settings"].english}</h1>
        <p className="text-muted-foreground mt-1">
          {language === "tamil" ? "உங்கள் கணக்கு மற்றும் ஆப் அமைப்புகளை நிர்வகிக்கவும்." : "Manage your account settings and application preferences."}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Tabs Sidebar */}
        <div className="w-full md:w-64 space-y-1">
          <TabButton 
            active={activeTab === "profile"} 
            onClick={() => setActiveTab("profile")} 
            icon={User} 
            label={translations["profile"].english} 
          />
          <TabButton 
            active={activeTab === "appearance"} 
            onClick={() => setActiveTab("appearance")} 
            icon={Palette} 
            label={translations["appearance"].english} 
          />
          <TabButton 
            active={activeTab === "data"} 
            onClick={() => setActiveTab("data")} 
            icon={Database} 
            label={translations["generalData"].english} 
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 rounded-2xl border border-border bg-card/60 p-6 shadow-sm">
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">{t("profileInfo")}</h3>
                <p className="text-sm text-muted-foreground">{t("updateDetails")}</p>
              </div>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("fullName")}</label>
                  <input 
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={profile.name}
                    onChange={e => setProfile({...profile, name: e.target.value})}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t("occupation")}</label>
                  <input 
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    value={profile.role}
                    onChange={e => setProfile({...profile, role: e.target.value})}
                  />
                </div>
              </div>
              <button className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors">
                {t("saveChanges")}
              </button>
            </div>
          )}

          {activeTab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">{t("appearance")}</h3>
                <p className="text-sm text-muted-foreground">{language === "tamil" ? "ஆப் எப்படி தெரிய வேண்டும் என்பதை முடிவு செய்யுங்கள்." : "Customize how the app looks for you."}</p>
              </div>
              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-xl border border-border p-4 bg-background/50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                      {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t("darkMode")}</p>
                      <p className="text-xs text-muted-foreground">{t("switchThemes")}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                    className={cn(
                      "relative h-6 w-11 rounded-full transition-colors duration-200",
                      theme === "dark" ? "bg-primary" : "bg-muted"
                    )}
                  >
                    <div className={cn(
                      "absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform duration-200",
                      theme === "dark" ? "translate-x-5" : "translate-x-0"
                    )} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold">{language === "tamil" ? "தகவல் மேலாண்மை" : "Data Management"}</h3>
                <p className="text-sm text-muted-foreground">{language === "tamil" ? "உங்கள் OBD கோடுகள் மற்றும் டேட்டாவை இறக்குமதி அல்லது ஏற்றுமதி செய்யவும்." : "Import or export your OBD codes and application data."}</p>
              </div>
              
              <div className="grid gap-6">
                <div className="rounded-xl border border-border p-4 bg-background/50 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t("importData")}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {language === "tamil" ? "அனைத்து கோடுகளையும் ஒரே நேரத்தில் சேர்க்க CSV கோப்பை பதிவேற்றவும்." : "Upload a CSV file to add multiple codes at once."}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <label className={cn("cursor-pointer inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors", isProcessing && "opacity-50 pointer-events-none")}>
                      {isProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Upload className="mr-2 h-3.5 w-3.5" />}
                      {language === "tamil" ? "கோப்பைத் தேர்ந்தெடு" : "Choose File"}
                      <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={isProcessing} />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-border p-4 bg-background/50 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                      <Download className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{t("exportData")}</p>
                      <p className="text-xs text-muted-foreground">{language === "tamil" ? "பாதுகாப்பிற்காக உங்கள் அனைத்து கோடுகளையும் CSV கோப்பாக பதிவிறக்கவும்." : "Download all your saved codes as a CSV file for backup."}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleExport}
                    disabled={isProcessing}
                    className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-xs font-bold hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-2 h-3.5 w-3.5" />}
                    Export CSV
                  </button>
                </div>
              </div>

              {importStatus && (
                <div className={cn(
                  "flex items-center gap-3 rounded-xl p-4 animate-in fade-in slide-in-from-top-2",
                  importStatus.type === 'success' ? "bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400" : "bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
                )}>
                  {importStatus.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                  <p className="text-sm font-medium">{importStatus.message}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean, onClick: () => void, icon: any, label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
        active 
          ? "bg-secondary text-foreground shadow-sm" 
          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", active ? "text-primary" : "text-muted-foreground/70")} />
      {label}
    </button>
  );
}
