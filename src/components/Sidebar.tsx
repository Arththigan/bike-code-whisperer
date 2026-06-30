import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Database, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "./AuthProvider";
import { translations } from "@/lib/translations";
import { useState } from "react";

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, language } = useAuth();

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
    const navigate = useNavigate();
    const { user, logout, language } = useAuth();
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    const handleLogout = () => {
        setIsProfileOpen(false);
        logout();
        navigate({ to: "/login" });
    };

    const initials = user?.name
        ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
        : "??";

    return (
        <>
            {/* Profile Bottom Sheet Overlay */}
            {isProfileOpen && (
                <div
                    className="fixed inset-0 z-50 sm:hidden"
                    onClick={() => setIsProfileOpen(false)}
                >
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" />

                    {/* Sheet */}
                    <div
                        className="absolute bottom-16 left-0 right-0 mx-3 mb-2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-in slide-in-from-bottom-4 duration-300"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Profile Header */}
                        <div className="flex items-center gap-4 bg-secondary/30 px-5 py-4 border-b border-border/50">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-foreground/20 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20">
                                {initials}
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-sm font-bold truncate text-foreground">
                                    {user?.name || "Guest User"}
                                </span>
                                <span className="text-[11px] text-muted-foreground truncate">
                                    {user?.username || ""}
                                </span>
                                <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary uppercase tracking-wide">
                                    {user?.role === "admin" ? "Admin" : "Workshop Member"}
                                </span>
                            </div>
                        </div>

                        {/* Sign Out Button */}
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 px-5 py-4 text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            Sign Out
                        </button>
                    </div>
                </div>
            )}

            {/* Bottom Nav Bar */}
            <div
                className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
                style={{
                    padding: "0 12px 8px 12px",
                    paddingBottom: "max(8px, env(safe-area-inset-bottom))",
                }}
            >
              <div className="flex h-16 items-center justify-around rounded-2xl border border-border bg-card/95 backdrop-blur-lg px-2 shadow-sm"
                style={{
                    transform: "translate3d(0,0,0)",
                    willChange: "transform",
                }}
              >
                <Link to="/" className={cn(
                    "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-3 py-1",
                    location.pathname === "/" ? "text-primary" : "text-muted-foreground"
                )}>
                    <LayoutDashboard className="h-5 w-5" />
                </Link>

                <Link to="/codes" className={cn(
                    "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-3 py-1",
                    location.pathname === "/codes" ? "text-primary" : "text-muted-foreground"
                )}>
                    <Database className="h-5 w-5" />
                </Link>

                <Link to="/settings" className={cn(
                    "flex flex-col items-center gap-1 text-[10px] font-medium transition-colors px-3 py-1",
                    location.pathname === "/settings" ? "text-primary" : "text-muted-foreground"
                )}>
                    <Settings className="h-5 w-5" />
                </Link>

                {/* Profile Avatar Button */}
                <button
                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                    className={cn(
                        "flex flex-col items-center gap-1 transition-colors px-3 py-1",
                        isProfileOpen ? "opacity-100" : "opacity-80 hover:opacity-100"
                    )}
                    aria-label="Profile"
                >
                    <div className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-foreground/20 text-primary-foreground font-bold text-[10px] transition-all",
                        isProfileOpen && "ring-2 ring-primary ring-offset-1 ring-offset-card"
                    )}>
                        {initials}
                    </div>
                </button>
              </div>
            </div>
        </>
    );
}
