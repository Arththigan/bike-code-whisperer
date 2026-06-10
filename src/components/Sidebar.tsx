import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Bike, Database, LayoutDashboard, LogOut, Settings, Globe, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { translations } from "@/lib/translations";
import { useState, useRef, useEffect } from "react";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, language, setLanguage } = useAuth();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setIsLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const initials = user?.name 
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase() 
    : "??";

  const t = (key: string) => translations[key]?.[language] || key;

  const navItems = [
    { label: t("dashboard"), icon: LayoutDashboard, href: "/" },
    { label: t("activeUsers"), icon: Database, href: "/codes" },
    { label: t("settings"), icon: Settings, href: "/settings" },
  ];

  const languages: { id: typeof language; label: string }[] = [
    { id: "english", label: "English" },
    { id: "tamil", label: "தமிழ் (Tamil)" },
    { id: "tanglish", label: "Tanglish" },
  ];

  return (
    <div className="flex h-full w-64 flex-col border-r border-border bg-card/40 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-3 px-6 border-b border-border/50">
        <img
          src="/logo.png"
          alt="AK Arun Wiring Logo"
          className="h-10 w-10 rounded-full object-cover shadow-lg shadow-primary/20 border border-primary/20"
        />
        <div>
          <h1 className="text-sm font-black tracking-wider uppercase leading-none text-foreground">AK Arun Wiring</h1>
          <p className="text-[10px] text-primary font-bold tracking-widest mt-1.5 uppercase">OBD-Decoder</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const active = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                active 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" 
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", active ? "text-primary-foreground" : "text-muted-foreground/70")} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Language Selector Dropdown In Sidebar */}
      <div className="px-4 py-3 border-t border-border/30 relative" ref={langRef}>
        <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="flex w-full items-center justify-between gap-3 rounded-xl bg-secondary/30 px-4 py-2.5 text-xs font-bold transition-all hover:bg-secondary/50 border border-border/50"
        >
            <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-primary" />
                <span className="capitalize">{language}</span>
            </div>
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isLangOpen && "rotate-180")} />
        </button>

        {isLangOpen && (
            <div className="absolute bottom-full left-4 right-4 mb-2 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in slide-in-from-bottom-2 duration-200 z-50">
                <div className="p-1">
                    {languages.map((lang) => (
                        <button
                            key={lang.id}
                            onClick={() => {
                                setLanguage(lang.id);
                                setIsLangOpen(false);
                            }}
                            className={cn(
                                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold transition-colors",
                                language === lang.id 
                                    ? "bg-primary/10 text-primary" 
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                            )}
                        >
                            {lang.label}
                            {language === lang.id && <Check className="h-3 w-3" />}
                        </button>
                    ))}
                </div>
            </div>
        )}
      </div>

      <div className="p-4 border-t border-border/50">
        <div className="group relative flex items-center gap-3 rounded-2xl bg-secondary/40 p-3 transition-all hover:bg-secondary/60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-foreground/20 text-primary-foreground font-bold text-xs">
            {initials}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold truncate">{user?.name || "Guest User"}</span>
            <span className="text-[10px] text-muted-foreground truncate uppercase tracking-tighter">
              {user?.role === "admin" ? "Admin" : "Workshop Member"}
            </span>
          </div>
          <button 
            onClick={handleLogout}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={translations["signOut"].english}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function MobileNav() {
    const location = useLocation();
    const { language, setLanguage } = useAuth();
    const [isLangOpen, setIsLangOpen] = useState(false);
    const langRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (langRef.current && !langRef.current.contains(event.target as Node)) {
                setIsLangOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const languages: { id: typeof language; label: string }[] = [
        { id: "english", label: "English" },
        { id: "tamil", label: "தமிழ் (Tamil)" },
        { id: "tanglish", label: "Tanglish" },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-border bg-card/95 backdrop-blur-lg px-2 sm:hidden"
          style={{ 
            paddingBottom: "env(safe-area-inset-bottom)",
            transform: "translate3d(0,0,0)",
            willChange: "transform",
          }}
        >
            <Link to="/" className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-4 py-1",
              location.pathname === "/" ? "text-primary" : "text-muted-foreground"
            )}>
                <LayoutDashboard className="h-5 w-5" />
            </Link>
            <Link to="/codes" className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-4 py-1",
              location.pathname === "/codes" ? "text-primary" : "text-muted-foreground"
            )}>
                <Database className="h-5 w-5" />
            </Link>

            {/* Language Picker */}
            <div ref={langRef} className="relative flex flex-col items-center">
                <button
                    onClick={() => setIsLangOpen(!isLangOpen)}
                    className={cn(
                        "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-4 py-1",
                        isLangOpen ? "text-primary" : "text-muted-foreground"
                    )}
                >
                    <Globe className="h-5 w-5" />
                </button>

                {isLangOpen && (
                    <div className="absolute bottom-full mb-2 w-40 overflow-hidden rounded-xl border border-border bg-popover shadow-2xl animate-in slide-in-from-bottom-2 duration-200 z-50">
                        <div className="p-1">
                            {languages.map((lang) => (
                                <button
                                    key={lang.id}
                                    onClick={() => {
                                        setLanguage(lang.id);
                                        setIsLangOpen(false);
                                    }}
                                    className={cn(
                                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-[11px] font-bold transition-colors",
                                        language === lang.id
                                            ? "bg-primary/10 text-primary"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    {lang.label}
                                    {language === lang.id && <Check className="h-3 w-3" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <Link to="/settings" className={cn(
              "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-4 py-1",
              location.pathname === "/settings" ? "text-primary" : "text-muted-foreground"
            )}>
                <Settings className="h-5 w-5" />
            </Link>
        </div>
    )
}
