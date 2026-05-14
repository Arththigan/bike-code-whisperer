import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ShieldCheck, Lock, User, AlertCircle, Loader2, Bike } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const success = await login(username, password);
      if (success) {
        // After login, check if the user is actually an admin
        // Note: The AuthProvider needs to be updated to handle this check if we want strict separation
        navigate({ to: "/super-admin-portal" });
      } else {
        setError("Invalid administrative credentials.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Access denied.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#020617] p-6 selection:bg-amber-500/30 selection:text-amber-500">
      <div className="w-full max-w-[420px] space-y-10 animate-fade-up">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-amber-500 shadow-2xl shadow-amber-500/20">
            <ShieldCheck className="h-10 w-10 text-black" strokeWidth={2.5} />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Central Intelligence</h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-500">Admin Authorization</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 rounded-[40px] border border-slate-800 bg-slate-900/20 p-10 backdrop-blur-3xl shadow-2xl">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Admin Username</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-800 bg-black/40 pl-12 pr-4 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                  placeholder="Enter admin ID"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1">Secret Key</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 w-full rounded-2xl border border-slate-800 bg-black/40 pl-12 pr-4 text-sm text-white focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/5 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs font-bold text-rose-500 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative flex h-14 w-full items-center justify-center overflow-hidden rounded-2xl bg-amber-500 font-black text-black shadow-xl shadow-amber-500/10 transition-all hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-2">
                Authorize Access
                <ShieldCheck className="h-4 w-4 transition-transform group-hover:scale-110" />
              </span>
            )}
          </button>
        </form>

        <div className="text-center">
            <button 
                onClick={() => navigate({ to: "/login" })}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
                Back to User Portal
            </button>
        </div>
      </div>
    </div>
  );
}
