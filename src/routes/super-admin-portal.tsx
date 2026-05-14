import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/components/AuthProvider";
import { useTheme } from "@/components/ThemeProvider";
import { 
  Users, 
  UserPlus, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  Lock, 
  Unlock,
  Bike,
  LogOut,
  Search,
  LayoutDashboard,
  Settings as SettingsIcon,
  Key,
  LayoutGrid,
  Pencil,
  Hash,
  History,
  Terminal,
  Activity as ActivityIcon,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRANDS, getAllCodes } from "@/data/obdCodes";

export const Route = createFileRoute("/super-admin-portal")({
  component: AdminPortal,
});

const USERS_STORAGE_KEY = "obd-decoder-users";

type AdminTab = "dashboard" | "users" | "credentials" | "logs" | "settings";

interface AuditLog {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  displayTime: string;
  type: "info" | "success" | "warning" | "danger";
}

function AdminPortal() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("dashboard");
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ username: "", password: "", email: "" });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [adminPasswords, setAdminPasswords] = useState({ current: "", new: "", confirm: "" });
  const { theme, setTheme } = useTheme();
  const [isCompact, setIsCompact] = useState(() => {
    return localStorage.getItem("admin-compact-mode") === "true";
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const addLog = (action: string, detail: string, type: AuditLog["type"] = "info") => {
    const now = new Date();
    const timestamp = now.toLocaleString('en-IN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });
    
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      detail,
      timestamp: now.toISOString(),
      displayTime: timestamp,
      type
    };
    const updatedLogs = [newLog, ...logs].slice(0, 100);
    setLogs(updatedLogs);
    localStorage.setItem("admin-audit-logs", JSON.stringify(updatedLogs));
  };

  useEffect(() => {
    if (!user || user.role !== "admin") {
      navigate({ to: "/admin-login" });
      return;
    }
    loadUsers();
    
    // Load Logs
    const savedLogs = localStorage.getItem("admin-audit-logs");
    if (savedLogs) setLogs(JSON.parse(savedLogs));
  }, [user]);

  const loadUsers = () => {
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      const data = raw ? JSON.parse(raw) : [];
      setAllUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load users", e);
      setAllUsers([]);
    }
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const id = `user-${Date.now()}`;
    const userToSave = { 
      id, 
      username: newUser.username,
      name: newUser.username, // Use username as name
      email: newUser.email,
      role: "user", 
      isActive: true, 
      createdAt: new Date().toISOString() 
    };
    const updated = [...allUsers, userToSave];
    
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    localStorage.setItem(`user-pass-${newUser.username}`, newUser.password);
    
    toast.success("User Successfully Created!");
    addLog("User Created", `New user: @${newUser.username} (${newUser.email})`, "success");
    setNewUser({ username: "", password: "", email: "" });
    loadUsers();
    setActiveTab("users"); 
  };

  const toggleUserStatus = (id: string) => {
    const updated = [...allUsers];
    const index = updated.findIndex(u => u.id === id);
    if (index !== -1) {
      const user = updated[index];
      user.isActive = !user.isActive;
      addLog("Status Changed", `${user.name} is now ${user.isActive ? 'Active' : 'Inactive'}`, user.isActive ? "success" : "warning");
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      loadUsers();
    }
  };

  const deleteUser = (id: string) => {
    if (confirm("Delete this workshop permanently?")) {
      const userToDelete = allUsers.find(u => u.id === id);
      const updated = allUsers.filter(u => u.id !== id);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
      if (userToDelete) {
        toast.success(`Workshop ${userToDelete.name} Deleted!`);
        addLog("User Deleted", `Removed workshop: ${userToDelete.name}`, "danger");
      }
      loadUsers();
    }
  };

  const updateUserInfo = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = allUsers.map(u => {
      if (u.id === editingUser.id) {
        return { ...u, username: editingUser.username, name: editingUser.username, email: editingUser.email };
      }
      return u;
    });
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updated));
    if (editingUser.password) {
      localStorage.setItem(`user-pass-${editingUser.username}`, editingUser.password);
    }
    toast.success("User Details Updated!");
    addLog("User Updated", `Modified account: @${editingUser.username}`, "info");
    setEditingUser(null);
    loadUsers();
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    const adminUsername = user?.username || "admin";
    const storedPass = localStorage.getItem(`user-pass-${adminUsername}`) || "admin123";
    if (adminPasswords.current !== storedPass) {
      toast.error("Current password is incorrect!");
      return;
    }
    if (adminPasswords.new.length < 6) {
      toast.error("New password must be at least 6 characters.");
      return;
    }
    if (adminPasswords.new !== adminPasswords.confirm) {
      toast.error("New passwords do not match!");
      return;
    }
    localStorage.setItem(`user-pass-${adminUsername}`, adminPasswords.new);
    addLog("Password Changed", `Admin @${adminUsername} updated their password`, "warning");
    toast.success("Password updated successfully!");
    setAdminPasswords({ current: "", new: "", confirm: "" });
  };

  const filteredUsers = allUsers.filter(u => 
    (u.username || "").toLowerCase().includes(search.toLowerCase()) || 
    (u.name || "").toLowerCase().includes(search.toLowerCase())
  );

  const allCodesCount = getAllCodes().length;
  const brandsCount = BRANDS.length;

  return (
    <div className={cn(
        "flex h-screen w-full overflow-hidden font-sans transition-colors duration-500 bg-background text-foreground"
    )}>
      {/* Sidebar */}
      <aside className={cn(
          "w-72 border-r border-border flex flex-col transition-colors duration-500 bg-card"
      )}>
        <div className="p-8 flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest uppercase leading-none text-indigo-400">Admin Portal</h1>
            <p className="text-[10px] text-slate-500 font-bold tracking-tighter mt-1">DEVELOPER CONSOLE</p>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavItem active={activeTab === "dashboard"} onClick={() => setActiveTab("dashboard")} icon={LayoutDashboard} label="System Stats" activeColor="bg-indigo-500" />
          <NavItem active={activeTab === "users"} onClick={() => setActiveTab("users")} icon={Users} label="Active Users" activeColor="bg-indigo-500" />
          <NavItem active={activeTab === "credentials"} onClick={() => setActiveTab("credentials")} icon={Key} label="New Credentials" activeColor="bg-indigo-500" />
          <NavItem active={activeTab === "logs"} onClick={() => setActiveTab("logs")} icon={History} label="Audit Logs" activeColor="bg-indigo-500" />
          <NavItem active={activeTab === "settings"} onClick={() => setActiveTab("settings")} icon={SettingsIcon} label="Portal Settings" activeColor="bg-indigo-500" />
        </nav>

        <div className="p-6 border-t border-border">
          <button 
            onClick={() => { logout(); navigate({ to: "/admin-login" }); }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={cn(
          "flex-1 flex flex-col transition-colors duration-500 bg-background"
      )}>
        <header className={cn(
            "h-20 border-b border-border flex items-center justify-between px-10 backdrop-blur-xl shrink-0 transition-colors duration-500 bg-background/50"
        )}>
          <div className="flex flex-col">
            <h2 className="text-xl font-bold capitalize">{activeTab}</h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Management System / {activeTab}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                SYSTEM ONLINE
            </div>
            <div className="h-10 w-10 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-xs text-foreground">
              SA
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {activeTab === "dashboard" && (
            <div className="space-y-8">
              {/* Stat Cards Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard
                  label="Registered Clients"
                  value={allUsers.length}
                  sub="Total accounts issued"
                  icon={Users}
                  gradient="from-indigo-500 to-violet-600"
                  glow="shadow-indigo-500/30"
                />
                <StatCard
                  label="Active Sessions"
                  value={allUsers.filter(u => u.isActive).length}
                  sub="Currently enabled"
                  icon={ShieldCheck}
                  gradient="from-emerald-400 to-teal-600"
                  glow="shadow-emerald-500/30"
                />
                <StatCard
                  label="Supported Brands"
                  value={brandsCount}
                  sub="Motorcycle brands"
                  icon={Bike}
                  gradient="from-amber-400 to-orange-500"
                  glow="shadow-amber-500/30"
                />
                <StatCard
                  label="Diagnostic Codes"
                  value={allCodesCount}
                  sub="In code database"
                  icon={Hash}
                  gradient="from-rose-400 to-pink-600"
                  glow="shadow-rose-500/30"
                />
              </div>

              {/* Stat Cards Row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <StatCard
                  label="Audit Log Entries"
                  value={logs.length}
                  sub="Total recorded actions"
                  icon={History}
                  gradient="from-cyan-400 to-sky-600"
                  glow="shadow-cyan-500/30"
                />
                <StatCard
                  label="Server Latency"
                  value="24ms"
                  sub="Average response time"
                  icon={Terminal}
                  gradient="from-purple-400 to-indigo-600"
                  glow="shadow-purple-500/30"
                />
              </div>

              {/* Recent Activity + Quick Actions */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2 rounded-3xl border border-border bg-card/40 p-7">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-sm flex items-center gap-2">
                      <History className="h-4 w-4 text-indigo-500" />
                      Recent Activity
                    </h3>
                    <button onClick={() => setActiveTab("logs")} className="text-[10px] font-bold uppercase tracking-widest text-indigo-500 hover:underline">
                      View All →
                    </button>
                  </div>
                  <div className="space-y-3">
                    {logs.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm italic">No activity yet. Actions will appear here.</div>
                    ) : (
                      logs.slice(0, 5).map(log => (
                        <div key={log.id} className="flex items-center gap-3 p-3 rounded-2xl bg-background/50 border border-border/50 hover:border-indigo-500/20 transition-all">
                          <div className={cn(
                            "h-8 w-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black",
                            log.type === "success" ? "bg-emerald-500/15 text-emerald-500" :
                            log.type === "warning" ? "bg-amber-500/15 text-amber-500" :
                            log.type === "danger" ? "bg-rose-500/15 text-rose-500" :
                            "bg-indigo-500/15 text-indigo-500"
                          )}>
                            <ActivityIcon className="h-3.5 w-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold truncate">{log.action}</div>
                            <div className="text-[10px] text-muted-foreground truncate">{log.detail}</div>
                          </div>
                          <div className="text-[9px] text-muted-foreground font-mono shrink-0">{log.displayTime}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-3xl border border-border bg-card/40 p-7">
                  <h3 className="font-bold text-sm flex items-center gap-2 mb-6">
                    <LayoutGrid className="h-4 w-4 text-indigo-500" />
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <button onClick={() => setActiveTab("credentials")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-background/50 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all text-left group">
                      <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                        <UserPlus className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">New Client</div>
                        <div className="text-[10px] text-muted-foreground">Issue credentials</div>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab("users")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-background/50 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all text-left group">
                      <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all shrink-0">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Manage Users</div>
                        <div className="text-[10px] text-muted-foreground">View all accounts</div>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab("logs")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-background/50 hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all text-left group">
                      <div className="h-9 w-9 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-500 group-hover:bg-cyan-500 group-hover:text-white transition-all shrink-0">
                        <History className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Audit Logs</div>
                        <div className="text-[10px] text-muted-foreground">{logs.length} entries recorded</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Manage Workshop Accounts</h3>
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full h-11 bg-card border border-border rounded-xl pl-10 pr-4 text-xs focus:border-indigo-500 focus:outline-none text-foreground placeholder:text-muted-foreground"
                    placeholder="Search by name or username..."
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-border bg-card/20 overflow-hidden shadow-2xl">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <th className="px-8 py-5">Workshop Identity</th>
                      <th className="px-8 py-5">Status</th>
                      <th className="px-8 py-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={cn(
                          "group transition-colors",
                          theme === "dark" ? "hover:bg-slate-900/30" : "hover:bg-slate-100/50",
                          isCompact ? "h-12" : "h-20"
                      )}>
                        <td className={cn("px-8", isCompact ? "py-2" : "py-6")}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                                "rounded-full flex items-center justify-center font-bold text-xs shrink-0 bg-secondary text-muted-foreground",
                                isCompact ? "h-8 w-8" : "h-10 w-10"
                            )}>
                                {(u.name || "??").substring(0,2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                                <div className={cn(
                                    "font-bold truncate text-foreground",
                                    isCompact ? "text-xs" : "text-sm"
                                )}>{u.name || "Unknown"}</div>
                                <div className="text-[10px] text-muted-foreground font-mono truncate">@{u.username || "no_id"}</div>
                            </div>
                          </div>
                        </td>
                        <td className={cn("px-8", isCompact ? "py-2" : "py-6")}>
                          {u.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                              <ShieldCheck className="h-3 w-3" /> Enabled
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest border border-rose-500/20">
                              <ShieldAlert className="h-3 w-3" /> Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <button 
                                onClick={() => toggleUserStatus(u.id)}
                                className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all",
                                    u.isActive 
                                        ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white" 
                                        : "bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white"
                                )}
                            >
                                {u.isActive ? (
                                    <Unlock className="h-4 w-4 text-emerald-500 animate-in zoom-in-50 duration-300" />
                                ) : (
                                    <Lock className="h-4 w-4 text-rose-500 animate-in fade-in slide-in-from-top-1 duration-300" />
                                )}
                            </button>
                            <button 
                                onClick={() => setEditingUser({ ...u, password: "" })}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-muted-foreground hover:bg-indigo-500/20 hover:text-indigo-600 transition-all"
                            >
                                <Pencil className="h-4 w-4" />
                            </button>
                            <button 
                                onClick={() => deleteUser(u.id)}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "credentials" && (
            <div className="max-w-2xl mx-auto">
               <div className="rounded-[40px] border border-border bg-card/30 p-12 shadow-2xl backdrop-blur-sm">
                  <div className="mb-10 text-center">
                     <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[24px] bg-amber-500 shadow-xl shadow-amber-500/20">
                        <Key className="h-8 w-8 text-black" />
                     </div>
                     <h3 className="text-2xl font-black tracking-tight">Create Credentials</h3>
                     <p className="text-sm text-slate-500 mt-2">Generate secure access keys for new workshop clients</p>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-6">
                    <InputGroup 
                      label="Login Username" 
                      placeholder="workshop_id" 
                      value={newUser.username}
                      onChange={(v) => setNewUser({...newUser, username: v})}
                    />
                    <InputGroup 
                      label="Email Address" 
                      placeholder="workshop@email.com" 
                      type="email"
                      value={newUser.email}
                      onChange={(v) => setNewUser({...newUser, email: v})}
                    />
                    <InputGroup 
                      label="Password" 
                      placeholder="••••••••" 
                      type="password" 
                      value={newUser.password}
                      onChange={(v) => setNewUser({...newUser, password: v})}
                    />
                    <button 
                        type="submit"
                        className="w-full h-14 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-400 transition-all active:scale-[0.98] shadow-xl shadow-indigo-500/10 mt-4"
                    >
                        Issue Credentials
                    </button>
                  </form>
               </div>
            </div>
          )}

          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-6">
               <div className="w-full max-w-lg rounded-[40px] border border-border bg-card p-10 shadow-2xl animate-in zoom-in-95 duration-200">
                  <div className="mb-8 flex items-center justify-between">
                     <h3 className="text-2xl font-black tracking-tight">Edit Workshop</h3>
                     <button onClick={() => setEditingUser(null)} className="h-10 w-10 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground transition-colors">
                        <Lock className="h-5 w-5" />
                     </button>
                  </div>
                  
                  <form onSubmit={updateUserInfo} className="space-y-6">
                    <InputGroup 
                      label="Username" 
                      value={editingUser.username}
                      onChange={(v: string) => setEditingUser({...editingUser, username: v})}
                    />
                    <InputGroup 
                      label="Email Address" 
                      value={editingUser.email}
                      onChange={(v: string) => setEditingUser({...editingUser, email: v})}
                    />
                    <InputGroup 
                      label="New Password (Leave blank to keep current)" 
                      placeholder="••••••••" 
                      type="password"
                      value={editingUser.password}
                      onChange={(v: string) => setEditingUser({...editingUser, password: v})}
                    />
                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={() => setEditingUser(null)}
                            className="flex-1 h-14 bg-secondary text-foreground font-bold rounded-2xl hover:bg-secondary/80 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 h-14 bg-indigo-500 text-white font-black rounded-2xl hover:bg-indigo-400 transition-all shadow-xl shadow-indigo-500/20"
                        >
                            Save Changes
                        </button>
                    </div>
                  </form>
               </div>
            </div>
          )}

          {activeTab === "logs" && (
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-xl font-bold flex items-center gap-3">
                        <History className="h-5 w-5 text-indigo-500" />
                        System Activity Logs
                    </h3>
                    <button 
                        onClick={() => { localStorage.removeItem("admin-audit-logs"); setLogs([]); }}
                        className="text-[10px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-lg transition-all"
                    >
                        Clear History
                    </button>
                </div>
                
                <div className="space-y-3">
                    {logs.length === 0 ? (
                        <div className="h-64 rounded-3xl border border-dashed border-border flex items-center justify-center text-muted-foreground italic text-sm">
                            No activity recorded yet.
                        </div>
                    ) : (
                        logs.map(log => (
                            <div key={log.id} className="flex items-center gap-4 p-4 rounded-2xl bg-card/40 border border-border group hover:border-indigo-500/30 transition-all">
                                <div className={cn(
                                    "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                    log.type === "success" ? "bg-emerald-500/10 text-emerald-500" :
                                    log.type === "warning" ? "bg-amber-500/10 text-amber-500" :
                                    log.type === "danger" ? "bg-rose-500/10 text-rose-500" :
                                    "bg-indigo-500/10 text-indigo-500"
                                )}>
                                    <ActivityIcon className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-4">
                                        <h4 className="text-sm font-bold truncate">{log.action}</h4>
                                        <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground bg-secondary px-2 py-0.5 rounded-md shrink-0">
                                            {log.displayTime}
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{log.detail}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="max-w-3xl mx-auto space-y-8 pb-20">
              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500">
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">General Appearance</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingCard 
                    title="Interface Theme" 
                    description="Choose your preferred visual style for the portal."
                    action={
                      <div className={cn(
                          "flex p-1 rounded-xl border border-border transition-colors bg-secondary"
                      )}>
                        <button 
                            onClick={() => setTheme("dark")}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                                theme === "dark" ? "bg-indigo-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >DARK</button>
                        <button 
                            onClick={() => setTheme("light")}
                            className={cn(
                                "px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                                theme === "light" ? "bg-indigo-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                            )}
                        >LIGHT</button>
                      </div>
                    }
                  />
                  <SettingCard 
                    title="Compact Mode" 
                    description="Reduce spacing to fit more data on screen." 
                    action={<Toggle active={isCompact} onClick={() => setIsCompact(!isCompact)} />} 
                  />
                </div>
              </section>

              <section className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                    <Lock className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/80">Account Security</h3>
                </div>

                <InlineCredentialEditor username={user?.username || "admin"} onSave={(newPwd) => {
                  const adminUsername = user?.username || "admin";
                  localStorage.setItem(`user-pass-${adminUsername}`, newPwd);
                  addLog("Password Changed", `Admin @${adminUsername} updated their password`, "warning");
                  toast.success("Password updated successfully!");
                }} />
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function NavItem({ active, onClick, icon: Icon, label, activeColor = "bg-amber-500" }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-sm font-bold transition-all duration-300",
        active 
          ? `${activeColor} text-white shadow-lg` 
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
      {label}
    </button>
  );
}

function StatCard({ label, value, sub, icon: Icon, gradient, glow }: any) {
  return (
    <div className={cn(
      "relative rounded-3xl p-6 overflow-hidden group cursor-default transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl",
      `bg-gradient-to-br ${gradient} ${glow} shadow-lg`
    )}>
      {/* Glow blob */}
      <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/10 blur-2xl group-hover:scale-150 transition-transform duration-700" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/70 mb-2">{label}</p>
          <p className="text-4xl font-black text-white tracking-tight leading-none">{value}</p>
          <p className="text-[11px] text-white/60 mt-2 font-medium">{sub}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-white" strokeWidth={2} />
        </div>
      </div>
      {/* Bottom accent bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 rounded-b-3xl" />
    </div>
  );
}

function InputGroup({ label, placeholder, value, onChange, type = "text" }: any) {
  return (
    <div className="space-y-2">
      <label className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      <input 
        type={type}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-14 w-full rounded-xl bg-card border border-border px-6 text-sm text-foreground placeholder:text-muted-foreground/30 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
        placeholder={placeholder}
      />
    </div>
  );
}

function PasswordInput({ label, placeholder, value, onChange }: any) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <label className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{label}</label>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          required
          value={value}
          onChange={e => onChange(e.target.value)}
          className="h-14 w-full rounded-xl bg-card border border-border px-6 pr-14 text-sm text-foreground placeholder:text-muted-foreground/40 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(s => !s)}
          className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function SettingCard({ title, description, action }: any) {
  return (
    <div className="rounded-3xl border border-border bg-card/30 p-6 flex flex-col justify-between gap-6">
      <div>
        <h4 className="text-sm font-bold text-foreground mb-1">{title}</h4>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

function Toggle({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "h-6 w-11 rounded-full p-1 transition-all duration-300",
        active ? "bg-indigo-500" : "bg-muted"
      )}
    >
      <div className={cn(
        "h-4 w-4 rounded-full bg-white transition-all duration-300 shadow-sm",
        active ? "translate-x-5" : "translate-x-0"
      )} />
    </button>
  );
}

function InlineCredentialEditor({ username, onSave }: { username: string; onSave: (pwd: string) => void }) {
  const savedPwd = localStorage.getItem(`user-pass-${username}`) || "admin123";
  const [pwd, setPwd] = useState(savedPwd);
  const [show, setShow] = useState(false);
  const hasChanged = pwd !== savedPwd;

  return (
    <div className="rounded-3xl border border-border bg-card/30 p-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Admin Username</label>
          <div className="flex items-center gap-3 h-14 bg-secondary/50 border border-border rounded-xl px-6">
            <Key className="h-4 w-4 text-indigo-500 shrink-0" />
            <span className="text-sm font-bold text-foreground font-mono">{username}</span>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-widest text-indigo-500 bg-indigo-500/10 px-2 py-0.5 rounded-full">Read-only</span>
          </div>
        </div>

        <div className="space-y-2">
          <label className="px-1 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">Password</label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={pwd}
              onChange={e => setPwd(e.target.value)}
              className="h-14 w-full rounded-xl bg-card border border-border px-6 pr-14 text-sm text-foreground focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all"
            />
            <button
              type="button"
              onClick={() => setShow(s => !s)}
              className="absolute right-4 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-all"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {hasChanged && (
        <div className="flex justify-end pt-2">
          <button
            onClick={() => {
              if (pwd.length < 6) {
                toast.error("Password must be at least 6 characters.");
                return;
              }
              onSave(pwd);
            }}
            className="px-8 py-3 bg-indigo-500 text-white rounded-xl text-xs font-black hover:bg-indigo-400 transition-all shadow-lg shadow-indigo-500/20 animate-in fade-in slide-in-from-top-2"
          >
            Update Password
          </button>
        </div>
      )}
    </div>
  );
}
