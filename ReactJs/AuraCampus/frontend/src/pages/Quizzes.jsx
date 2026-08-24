import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Brain, Plus, Trophy, BarChart3, X, Timer, Download } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Quizzes() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [meta, setMeta] = useState({ classes: [], academic_years: [] });
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [attemptQuiz, setAttemptQuiz] = useState(null);
  const [analyticsQuiz, setAnalyticsQuiz] = useState(null);

  const load = () => {
    const params = new URLSearchParams();
    if (subjectFilter !== "all") params.set("subject_id", subjectFilter);
    if (yearFilter !== "all") params.set("academic_year", yearFilter);
    return api.get(`/quizzes?${params.toString()}`).then(r => setItems(r.data));
  };
  useEffect(() => { load(); }, [subjectFilter, yearFilter]);
  useEffect(() => {
    api.get("/subjects").then(r => setSubjects(r.data));
    api.get("/meta").then(r => setMeta(r.data));
  }, []);

  return (
    <div className="space-y-6" data-testid="quizzes-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Quiz Center</h1>
          <p className="text-slate-500 text-sm">
            {user.role === "teacher" ? "Design quizzes & see analytics" : "Attempt quizzes across subjects & years"}
          </p>
        </div>
        {user.role === "teacher" && (
          <button data-testid="new-quiz-btn" onClick={() => setShowForm(s => !s)}
            className="pill bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Quiz
          </button>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <button className={`pill ${subjectFilter === "all" ? "bg-indigo-600 text-white" : "bg-white border"}`}
          onClick={() => setSubjectFilter("all")}>All subjects</button>
        {subjects.map(s => (
          <button key={s.id} className={`pill ${subjectFilter === s.id ? "bg-indigo-600 text-white" : "bg-white border"}`}
            onClick={() => setSubjectFilter(s.id)}>{s.name}</button>
        ))}
        <div className="w-px bg-slate-200 mx-2"></div>
        <button className={`pill ${yearFilter === "all" ? "bg-slate-900 text-white" : "bg-white border"}`}
          onClick={() => setYearFilter("all")}>All years</button>
        {(meta.academic_years || []).map(y => (
          <button key={y} className={`pill ${yearFilter === y ? "bg-slate-900 text-white" : "bg-white border"}`}
            onClick={() => setYearFilter(y)}>{y}</button>
        ))}
      </div>

      {showForm && <QuizForm subjects={subjects} meta={meta} onClose={() => setShowForm(false)} onCreated={load} />}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(q => (
          <div key={q.id} data-testid={`quiz-${q.id}`} className="aura-card p-6 hover:-translate-y-0.5 transition">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-slate-400">
              <Brain className="w-4 h-4 text-purple-500" /> {q.subject_name}
            </div>
            <div className="font-heading text-xl font-semibold mt-2 text-slate-800">{q.title}</div>
            <div className="flex items-center gap-3 mt-3 text-xs text-slate-500 flex-wrap">
              <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> {q.duration_min}m</span>
              <span>{q.question_count} questions</span>
              {q.academic_year && <span className="pill bg-slate-100 text-slate-600 text-[10px]">{q.academic_year}</span>}
              {q.class_name && <span className="pill bg-slate-100 text-slate-600 text-[10px]">{q.class_name}</span>}
            </div>
            <div className="text-xs text-slate-400 mt-1">by {q.teacher_name || "—"}</div>
            <div className="mt-5">
              {user.role === "teacher" ? (
                <button data-testid={`analytics-${q.id}`} onClick={() => setAnalyticsQuiz(q)}
                  className="pill w-full py-2 bg-indigo-100 text-indigo-700 flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" /> Analytics
                </button>
              ) : q.my_attempt ? (
                <div className="pill w-full py-2 bg-emerald-100 text-emerald-700 text-center inline-flex justify-center items-center gap-2">
                  <Trophy className="w-4 h-4" /> Scored {q.my_attempt.percent}%
                </div>
              ) : (
                <button data-testid={`attempt-${q.id}`} onClick={() => setAttemptQuiz(q)}
                  className="pill w-full py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Start Quiz</button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="col-span-full text-center text-slate-500 py-16">No quizzes match these filters.</div>}
      </div>

      {attemptQuiz && <AttemptModal quiz={attemptQuiz} onClose={() => setAttemptQuiz(null)} onDone={() => { setAttemptQuiz(null); load(); }} />}
      {analyticsQuiz && <AnalyticsModal quiz={analyticsQuiz} onClose={() => setAnalyticsQuiz(null)} />}
    </div>
  );
}

function QuizForm({ subjects, meta, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [className, setClassName] = useState(meta.classes?.[2] || "SE-A");
  const [academicYear, setAcademicYear] = useState(meta.academic_years?.[1] || "");
  const [duration, setDuration] = useState(15);
  const [qs, setQs] = useState([{ question: "", options: ["", "", "", ""], correct_index: 0, points: 1 }]);
  const addQ = () => setQs(a => [...a, { question: "", options: ["", "", "", ""], correct_index: 0, points: 1 }]);
  const updateQ = (i, patch) => setQs(a => a.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  const updateOpt = (i, oi, v) => setQs(a => a.map((q, idx) => idx === i ? { ...q, options: q.options.map((o, k) => k === oi ? v : o) } : q));
  const submit = async (e) => {
    e.preventDefault();
    try {
      await api.post("/quizzes", { title, subject_id: subjectId, class_name: className, academic_year: academicYear, duration_min: duration, questions: qs });
      toast.success("Quiz created");
      onCreated(); onClose();
    } catch (err) { toast.error(formatApiError(err)); }
  };
  return (
    <form onSubmit={submit} className="aura-card p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        <input required placeholder="Quiz title" value={title} onChange={(e) => setTitle(e.target.value)}
          data-testid="quiz-title" className="rounded-xl border px-3 py-2 sm:col-span-2" />
        <select required value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
          data-testid="quiz-subject" className="rounded-xl border px-3 py-2">
          <option value="">Subject…</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={className} onChange={(e) => setClassName(e.target.value)}
          data-testid="quiz-class" className="rounded-xl border px-3 py-2">
          {(meta.classes || []).map(c => <option key={c}>{c}</option>)}
        </select>
        <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
          data-testid="quiz-year" className="rounded-xl border px-3 py-2">
          {(meta.academic_years || []).map(y => <option key={y}>{y}</option>)}
        </select>
        <input type="number" min="1" value={duration} onChange={(e) => setDuration(Number(e.target.value))}
          data-testid="quiz-duration" className="rounded-xl border px-3 py-2 sm:col-span-5" placeholder="Duration (minutes)" />
      </div>
      <div className="space-y-4">
        {qs.map((q, i) => (
          <div key={i} className="rounded-xl border p-4">
            <input required placeholder={`Question ${i + 1}`} value={q.question}
              onChange={(e) => updateQ(i, { question: e.target.value })}
              data-testid={`q-${i}`} className="w-full rounded-lg border px-3 py-2 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${q.correct_index === oi ? "border-emerald-400 bg-emerald-50" : ""}`}>
                  <input type="radio" name={`correct-${i}`} checked={q.correct_index === oi} onChange={() => updateQ(i, { correct_index: oi })}/>
                  <input required placeholder={`Option ${oi + 1}`} value={opt} onChange={(e) => updateOpt(i, oi, e.target.value)}
                    data-testid={`q-${i}-opt-${oi}`} className="flex-1 outline-none bg-transparent" />
                </label>
              ))}
            </div>
          </div>
        ))}
        <button type="button" onClick={addQ} className="pill bg-slate-100 text-slate-700">+ Add question</button>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="pill bg-slate-100 text-slate-700">Cancel</button>
        <button data-testid="quiz-submit" className="pill bg-indigo-600 text-white">Publish Quiz</button>
      </div>
    </form>
  );
}

function AttemptModal({ quiz, onClose, onDone }) {
  const [answers, setAnswers] = useState(quiz.questions.map(() => -1));
  const submit = async () => {
    try {
      const { data } = await api.post(`/quizzes/${quiz.id}/attempt`, { answers });
      toast.success(`Scored ${data.percent}%!`);
      onDone();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="font-heading text-2xl font-bold">{quiz.title}</div>
          <button onClick={onClose}><X className="w-5 h-5"/></button>
        </div>
        <div className="space-y-4">
          {quiz.questions.map((q, i) => (
            <div key={i} className="rounded-xl border p-4">
              <div className="font-semibold text-slate-800 mb-3">Q{i + 1}. {q.question}</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} data-testid={`ans-${i}-${oi}`}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${answers[i] === oi ? "border-indigo-400 bg-indigo-50" : ""}`}>
                    <input type="radio" name={`a-${i}`} checked={answers[i] === oi}
                      onChange={() => setAnswers(a => a.map((x, idx) => idx === i ? oi : x))} />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        <button data-testid="attempt-submit" onClick={submit} className="mt-4 w-full pill py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">Submit Quiz</button>
      </div>
    </div>
  );
}

function AnalyticsModal({ quiz, onClose }) {
  const [data, setData] = useState(null);
  useEffect(() => { api.get(`/quizzes/${quiz.id}/analytics`).then(r => setData(r.data)); }, [quiz.id]);
  const exportPdf = () => {
    if (!data) return;
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`AuraCampus — ${quiz.title} Analytics`, 14, 18);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Subject: ${quiz.subject_name}   Class: ${quiz.class_name || "-"}   Year: ${quiz.academic_year || "-"}`, 14, 25);
    doc.text(`Attempts: ${data.stats.count}   Average: ${data.stats.avg}%   Top: ${data.stats.top}%   Lowest: ${data.stats.low}%`, 14, 31);
    autoTable(doc, {
      startY: 38,
      head: [["Student", "Score", "Percent"]],
      body: data.attempts.map(a => [a.student_name, `${a.score}/${a.total}`, `${a.percent}%`]),
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save(`quiz-${quiz.title.replace(/\s+/g,'_')}.pdf`);
  };
  if (!data) return null;
  const distData = Object.entries(data.stats.distribution).map(([range, count]) => ({ range, count }));
  const colors = ["#F43F5E", "#F59E0B", "#3B82F6", "#10B981"];
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="font-heading text-2xl font-bold">{quiz.title} — Analytics</div>
          <div className="flex items-center gap-2">
            <button data-testid="export-quiz-pdf" onClick={exportPdf} className="pill bg-slate-800 text-white flex items-center gap-1 text-sm">
              <Download className="w-3 h-3"/> Export PDF
            </button>
            <button onClick={onClose}><X className="w-5 h-5"/></button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3 mb-6">
          <Stat label="Attempts" value={data.stats.count}/>
          <Stat label="Average" value={`${data.stats.avg}%`}/>
          <Stat label="Top" value={`${data.stats.top}%`}/>
          <Stat label="Lowest" value={`${data.stats.low}%`}/>
        </div>
        <div className="h-64 mb-4">
          <ResponsiveContainer>
            <BarChart data={distData}>
              <XAxis dataKey="range" fontSize={12}/>
              <YAxis fontSize={12}/>
              <Tooltip/>
              <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                {distData.map((_, i) => <Cell key={i} fill={colors[i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-slate-400 border-b"><tr><th className="text-left py-2">Student</th><th>Score</th><th>Percent</th></tr></thead>
            <tbody>
              {data.attempts.map(a => (
                <tr key={a.id} className="border-b last:border-none">
                  <td className="py-2">{a.student_name}</td>
                  <td className="text-center">{a.score}/{a.total}</td>
                  <td className="text-center font-semibold">{a.percent}%</td>
                </tr>
              ))}
              {data.attempts.length === 0 && <tr><td colSpan="3" className="text-center py-6 text-slate-500">No attempts yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value }) {
  return <div className="p-4 rounded-xl bg-indigo-50"><div className="text-xs uppercase text-slate-500">{label}</div><div className="font-heading text-2xl font-bold text-indigo-700">{value}</div></div>;
}
