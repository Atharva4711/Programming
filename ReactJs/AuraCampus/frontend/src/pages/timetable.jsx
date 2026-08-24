import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Trash2, CalendarDays, BookOpen, X } from "lucide-react";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const SLOTS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const COLOR_BG = {
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
};
const YEAR_LABEL = { "1": "1st Year", "2": "2nd Year", "3": "3rd Year", "4": "4th Year" };

export default function Timetable() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [meta, setMeta] = useState({ classes: [], academic_years: [] });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ subject_id: "", class_name: "SE-A", academic_year: "2", day: 0, start_time: "09:00", end_time: "10:00", room: "" });
  const [showQuick, setShowQuick] = useState(false);
  const [quickForm, setQuickForm] = useState({ name: "", code: "", color: "indigo" });

  const load = () => api.get("/timetable").then(r => setEntries(r.data));
  const loadSubjects = () => api.get("/subjects").then(r => setSubjects(r.data));
  useEffect(() => {
    load(); loadSubjects();
    api.get("/meta").then(r => setMeta(r.data));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/timetable", form);
      toast.success("Slot added");
      setShowForm(false);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this slot?")) return;
    await api.delete(`/timetable/${id}`); toast.success("Deleted"); load();
  };
  const createSubject = async (e) => {
    e.preventDefault();
    try {
      await api.post("/subjects", quickForm);
      toast.success("Subject added");
      setQuickForm({ name: "", code: "", color: "indigo" });
      setShowQuick(false);
      loadSubjects();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const grid = {};
  entries.forEach(e => {
    const key = `${e.day}|${e.start_time.slice(0, 5)}`;
    grid[key] = grid[key] || [];
    grid[key].push(e);
  });

  return (
    <div className="space-y-6" data-testid="timetable-page">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Timetable</h1>
          <p className="text-slate-500 text-sm">
            {user.role === "teacher"
              ? "Your lectures across classes & years"
              : `Weekly schedule for ${user.class_name || "your class"} ${user.academic_year ? `• ${YEAR_LABEL[user.academic_year] || user.academic_year}` : ""}`}
          </p>
        </div>
        {user.role === "teacher" && (
          <div className="flex gap-2 flex-wrap">
            <button data-testid="quick-subject-btn" onClick={() => setShowQuick(q => !q)}
              className="pill bg-white border border-slate-200 text-slate-700 flex items-center gap-2">
              <BookOpen className="w-4 h-4"/> Add Subject
            </button>
            <button data-testid="new-slot-btn" onClick={() => setShowForm(s => !s)}
              className="pill bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Slot
            </button>
          </div>
        )}
      </div>

      {showQuick && user.role === "teacher" && (
        <form onSubmit={createSubject} className="aura-card p-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input required placeholder="Subject name" value={quickForm.name} data-testid="qs-name"
            onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
            className="rounded-xl border px-3 py-2 sm:col-span-2" />
          <input required placeholder="Code (e.g., CS201)" value={quickForm.code} data-testid="qs-code"
            onChange={(e) => setQuickForm({ ...quickForm, code: e.target.value.toUpperCase() })}
            className="rounded-xl border px-3 py-2" />
          <select value={quickForm.color} onChange={(e) => setQuickForm({ ...quickForm, color: e.target.value })}
            data-testid="qs-color" className="rounded-xl border px-3 py-2">
            {["indigo", "orange", "teal", "purple", "pink"].map(c => <option key={c}>{c}</option>)}
          </select>
          <button data-testid="qs-submit" className="sm:col-span-4 pill py-2 bg-slate-900 text-white">Create subject</button>
        </form>
      )}

      {showForm && user.role === "teacher" && (
        <form onSubmit={create} className="aura-card p-6 grid grid-cols-1 sm:grid-cols-6 gap-3">
          <label className="sm:col-span-2 text-xs font-semibold text-slate-600">
            Subject
            {subjects.length === 0 && (
              <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                You have no subjects yet — click <b>Add Subject</b> above first.
              </div>
            )}
            <select required value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}
              data-testid="tt-subject" className="mt-1 w-full rounded-xl border px-3 py-2">
              <option value="">Subject…</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Class
            <select value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })}
              data-testid="tt-class" className="mt-1 w-full rounded-xl border px-3 py-2">
              {(meta.classes || []).map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Year
            <select value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
              data-testid="tt-year" className="mt-1 w-full rounded-xl border px-3 py-2">
              {(meta.academic_years || []).map(y => <option key={y} value={y}>{YEAR_LABEL[y] || y}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Day
            <select value={form.day} onChange={(e) => setForm({ ...form, day: Number(e.target.value) })}
              data-testid="tt-day" className="mt-1 w-full rounded-xl border px-3 py-2">
              {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            Start
            <select value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              data-testid="tt-start" className="mt-1 w-full rounded-xl border px-3 py-2">
              {SLOTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-slate-600">
            End
            <select value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })}
              data-testid="tt-end" className="mt-1 w-full rounded-xl border px-3 py-2">
              {SLOTS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="sm:col-span-3 text-xs font-semibold text-slate-600">
            Room
            <input placeholder="CS-201" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })}
              data-testid="tt-room" className="mt-1 w-full rounded-xl border px-3 py-2" />
          </label>
          <button data-testid="tt-submit" className="sm:col-span-3 pill bg-indigo-600 text-white self-end">Add slot</button>
        </form>
      )}

      <div className="aura-card p-4 overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left">
              <th className="p-2 text-xs uppercase text-slate-400 w-20">Time</th>
              {DAYS.map(d => (
                <th key={d} className="p-2 text-xs uppercase text-slate-500 font-semibold">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SLOTS.slice(0, -1).map((slot, i) => (
              <tr key={slot} className="border-t border-slate-100">
                <td className="p-2 text-xs font-mono text-slate-500 align-top">{slot}–{SLOTS[i + 1]}</td>
                {DAYS.map((_, d) => {
                  const cells = grid[`${d}|${slot}`] || [];
                  return (
                    <td key={d} className="p-1.5 align-top">
                      {cells.map(c => (
                        <div key={c.id} data-testid={`tt-cell-${c.id}`}
                          className={`rounded-xl px-2.5 py-2 mb-1.5 border ${COLOR_BG[c.subject_color] || COLOR_BG.indigo}`}>
                          <div className="text-xs font-semibold leading-tight">{c.subject_name}</div>
                          <div className="text-[10px] opacity-80">
                            {c.class_name}{c.academic_year ? ` • Y${c.academic_year}` : ""}{c.room ? ` • ${c.room}` : ""}
                          </div>
                          {user.role === "teacher" && (
                            <button onClick={() => remove(c.id)} className="text-[10px] mt-1 opacity-70 hover:opacity-100 inline-flex items-center gap-1">
                              <Trash2 className="w-3 h-3"/> remove
                            </button>
                          )}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 && (
          <div className="text-center py-16 text-slate-500">
            <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {user.role === "teacher" ? "Add slots to publish the timetable." : "No timetable published for your class & year yet."}
          </div>
        )}
      </div>
    </div>
  );
}
