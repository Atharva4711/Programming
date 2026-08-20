import { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { CalendarCheck, FileText, Brain, CalendarDays, ArrowUpRight, Megaphone, Search } from "lucide-react";
import { Link } from "react-router-dom";

const QUICK = [
  { to: "/attendance", label: "Attendance", icon: CalendarCheck, tint: "bg-orange-100 text-orange-600" },
  { to: "/assignments", label: "Assignments", icon: FileText, tint: "bg-teal-100 text-teal-600" },
  { to: "/quizzes", label: "Quizzes", icon: Brain, tint: "bg-purple-100 text-purple-600" },
  { to: "/timetable", label: "Timetable", icon: CalendarDays, tint: "bg-pink-100 text-pink-600" },
];
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [notices, setNotices] = useState([]);
  const [timetable, setTimetable] = useState([]);

  useEffect(() => {
    api.get("/dashboard/stats").then(r => setStats(r.data)).catch(() => {});
    api.get("/notices").then(r => setNotices(r.data.slice(0, 4))).catch(() => {});
    api.get("/timetable").then(r => setTimetable(r.data)).catch(() => {});
  }, []);

  const today = (new Date().getDay() + 6) % 7; // Mon=0
  const todaySlots = timetable.filter(t => t.day === today).slice(0, 5);

  return (
    <div className="space-y-6" data-testid="dashboard-page">
      <div className="aura-hero rounded-3xl p-8 lg:p-10 relative">
        <div className="relative z-10 max-w-2xl">
          <div className="text-white/80 text-sm">Good day,</div>
          <h1 className="font-heading text-4xl lg:text-5xl font-bold mt-1">Hello, {user?.name?.split(" ")[0]} 👋</h1>
          <p className="text-white/80 mt-3 max-w-md">
            {user?.role === "teacher"
              ? "Ready to inspire? Manage classes, run quizzes and track attendance in one place."
              : "Let's crush today. Check your timetable, submit assignments and mark attendance quickly."}
          </p>
          <div className="flex gap-3 mt-6 flex-wrap">
            <Link to="/attendance" className="pill bg-white text-indigo-700 hover:shadow-lg transition">Open Attendance</Link>
            <Link to="/quizzes" className="pill bg-white/15 text-white hover:bg-white/25 transition">Quiz Center</Link>
            <Link to="/timetable" className="pill bg-white/15 text-white hover:bg-white/25 transition">View Timetable</Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {user?.role === "teacher" ? (
          <>
            <Stat label="Subjects" value={stats.subjects ?? 0} tone="indigo"/>
            <Stat label="Assignments" value={stats.assignments ?? 0} tone="orange"/>
            <Stat label="Quizzes" value={stats.quizzes ?? 0} tone="purple"/>
            <Stat label="Sessions" value={stats.attendance_sessions ?? 0} tone="teal"/>
          </>
        ) : (
          <>
            <Stat label="Attendance" value={`${stats.attendance_percent ?? 0}%`} tone="indigo"/>
            <Stat label="Assignments" value={stats.assignments ?? 0} tone="orange"/>
            <Stat label="Quizzes" value={stats.quizzes ?? 0} tone="purple"/>
            <Stat label="Sessions" value={stats.total_sessions ?? 0} tone="teal"/>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 aura-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-heading text-xl font-semibold text-slate-800">{DAY_NAMES[today]}&apos;s Timetable</div>
              <div className="text-xs text-slate-500">Your schedule for today</div>
            </div>
            <Link to="/timetable" className="text-sm text-indigo-600 font-semibold flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4"/>
            </Link>
          </div>
          <div className="space-y-3">
            {todaySlots.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-mono text-slate-500 w-28">{t.start_time} – {t.end_time}</div>
                  <div>
                    <div className="font-semibold text-slate-800">{t.subject_name}</div>
                    <div className="text-xs text-slate-500">{t.class_name}{t.room ? ` • Room ${t.room}` : ""}</div>
                  </div>
                </div>
                <span className="pill bg-indigo-100 text-indigo-700">Lecture</span>
              </div>
            ))}
            {todaySlots.length === 0 && (
              <div className="text-center text-slate-500 py-8 text-sm">
                No classes today. Enjoy the calm!
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-4 space-y-6">
          <div className="aura-card p-6">
            <div className="font-heading text-lg font-semibold mb-4">Quick Access</div>
            <div className="grid grid-cols-2 gap-3">
              {QUICK.map(q => (
                <Link key={q.to} to={q.to} data-testid={`quick-${q.label.toLowerCase()}`}
                  className="rounded-2xl p-4 border border-slate-100 hover:-translate-y-0.5 hover:shadow-md transition">
                  <div className={`w-10 h-10 rounded-xl grid place-items-center ${q.tint} mb-3`}>
                    <q.icon className="w-5 h-5"/>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">{q.label}</div>
                </Link>
              ))}
            </div>
          </div>

          <div className="aura-card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-lg font-semibold">Recent Notices</div>
              <Link to="/notices" className="text-xs text-indigo-600 font-semibold">See all</Link>
            </div>
            <div className="space-y-3">
              {notices.length === 0 && <div className="text-sm text-slate-500">No notices yet.</div>}
              {notices.map(n => (
                <div key={n.id} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 grid place-items-center flex-shrink-0">
                    <Megaphone className="w-4 h-4"/>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">{n.title}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{n.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }) {
  const map = { indigo: "from-indigo-500 to-indigo-600", orange: "from-orange-500 to-orange-600", purple: "from-purple-500 to-purple-600", teal: "from-teal-500 to-teal-600" };
  return (
    <div className="aura-card p-5" data-testid={`stat-${label.toLowerCase()}`}>
      <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
      <div className={`font-heading text-3xl font-bold mt-2 bg-gradient-to-br ${map[tone]} bg-clip-text text-transparent`}>{value}</div>
    </div>
  );
}
