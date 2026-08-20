import { useEffect, useState, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  LayoutDashboard, CalendarDays, CalendarCheck, FileText,
  Brain, Megaphone, Search, LogOut, GraduationCap, Bell, User as UserIcon,
} from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/timetable", label: "Timetable", icon: CalendarDays, testid: "nav-timetable" },
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, testid: "nav-attendance" },
  { to: "/assignments", label: "Assignments", icon: FileText, testid: "nav-assignments" },
  { to: "/quizzes", label: "Quiz Center", icon: Brain, testid: "nav-quizzes" },
  { to: "/notices", label: "Notices", icon: Megaphone, testid: "nav-notices" },
  { to: "/lost-found", label: "Lost & Found", icon: Search, testid: "nav-lostfound" },
];

const LAST_SEEN_KEY = "aura_last_seen";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const initials = (user?.name || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const [notices, setNotices] = useState([]);
  const [openBell, setOpenBell] = useState(false);
  const bellRef = useRef(null);

  useEffect(() => {
    const load = () => api.get("/notices").then(r => setNotices(r.data)).catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const close = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setOpenBell(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) || 0);
  const unread = notices.filter(n => new Date(n.created_at).getTime() > lastSeen).length;
  const markAllSeen = () => {
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
    setNotices([...notices]); // trigger re-render
  };

  const pageTitle = () => {
    const p = location.pathname.split("/")[1] || "dashboard";
    return p.replace("-", " ");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <aside className="w-64 flex-shrink-0 hidden md:flex flex-col bg-[#0F1B3D] text-slate-100">
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 grid place-items-center shadow-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-heading font-bold text-lg leading-tight">AuraCampus</div>
            <div className="text-[11px] uppercase tracking-widest text-slate-400">Smart Campus</div>
          </div>
        </div>
        <nav className="px-4 flex-1 space-y-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = location.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} data-testid={n.testid} className={`aura-sidebar-link ${active ? "active" : ""}`}>
                <Icon className="w-5 h-5" /> <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link to="/profile" data-testid="profile-link" className="flex items-center gap-3 mb-3 hover:bg-white/5 rounded-xl p-2 -m-2 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-orange-400 grid place-items-center text-white font-semibold">{initials}</div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-xs text-slate-400 capitalize">{user?.role}</div>
            </div>
          </Link>
          <button data-testid="logout-btn" onClick={() => { logout(); navigate("/login"); }}
            className="w-full flex items-center gap-2 justify-center py-2 rounded-xl bg-white/5 hover:bg-white/10 text-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 flex items-center justify-between px-6 lg:px-8 bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-slate-200/60">
          <div>
            <div className="font-heading text-lg font-semibold text-slate-800 capitalize">{pageTitle()}</div>
            <div className="text-xs text-slate-500">Welcome back, {user?.name?.split(" ")[0]}</div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative" ref={bellRef}>
              <button data-testid="bell-btn" onClick={() => { setOpenBell(o => !o); if (!openBell) markAllSeen(); }}
                className="p-2 rounded-full hover:bg-slate-100 relative" aria-label="Notifications">
                <Bell className="w-5 h-5 text-slate-600" />
                {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white grid place-items-center">{unread}</span>}
              </button>
              {openBell && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                    <div className="font-semibold">Notifications</div>
                    <Link to="/notices" onClick={() => setOpenBell(false)} className="text-xs text-indigo-600 font-semibold">See all</Link>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notices.length === 0 && <div className="p-6 text-sm text-slate-500 text-center">You&apos;re all caught up.</div>}
                    {notices.slice(0, 6).map(n => (
                      <div key={n.id} className="px-4 py-3 border-b border-slate-100 last:border-none hover:bg-slate-50">
                        <div className="text-sm font-semibold text-slate-800">{n.title}</div>
                        <div className="text-xs text-slate-500 line-clamp-2 mt-0.5">{n.body}</div>
                        <div className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <Link to="/profile" className="pill bg-indigo-100 text-indigo-700 capitalize flex items-center gap-1">
              <UserIcon className="w-3 h-3" /> {user?.role}
            </Link>
          </div>
        </header>
        <main className="p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</main>
      </div>
    </div>
  );
}
    