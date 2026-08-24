import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Plus, Download, Upload, Check, X, Clock, Paperclip } from "lucide-react";

export default function Assignments() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [meta, setMeta] = useState({ classes: [] });
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [active, setActive] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", subject_id: "", class_name: "SE-A", due_date: "" });
  const [teacherFile, setTeacherFile] = useState(null);

  const load = () => {
    const q = subjectFilter !== "all" ? `?subject_id=${subjectFilter}` : "";
    return api.get(`/assignments${q}`).then(r => setItems(r.data));
  };
  useEffect(() => { load(); }, [subjectFilter]);
  useEffect(() => {
    api.get("/subjects").then(r => setSubjects(r.data));
    api.get("/meta").then(r => setMeta(r.data));
  }, []);

  const uploadFile = async (file) => {
    if (!file) return null;
    const b64 = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
    const { data } = await api.post("/upload", { filename: file.name, content_type: file.type, data_base64: b64 });
    return data;
  };

  const create = async (e) => {
    e.preventDefault();
    try {
      let file_url = "", file_id = "";
      if (teacherFile) {
        const up = await uploadFile(teacherFile);
        file_url = up.url; file_id = up.id;
      }
      await api.post("/assignments", { ...form, file_url, file_id });
      toast.success("Assignment created");
      setShowForm(false);
      setTeacherFile(null);
      setForm({ title: "", description: "", subject_id: "", class_name: "SE-A", due_date: "" });
      load();
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const openDetail = async (a) => {
    setActive(a);
    if (user.role === "teacher") {
      const { data } = await api.get(`/assignments/${a.id}/submissions`);
      setDetail(data);
    }
  };

  return (
    <div className="space-y-6" data-testid="assignments-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Assignments</h1>
          <p className="text-slate-500 text-sm">
            {user.role === "teacher" ? "Publish work & track submissions" : "Your pending & submitted work"}
          </p>
        </div>
        {user.role === "teacher" && (
          <button data-testid="new-assignment-btn" onClick={() => setShowForm(s => !s)}
            className="pill bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Assignment
          </button>
        )}
      </div>

      {/* Subject filter chips */}
      <div className="flex gap-2 flex-wrap">
        <button data-testid="filter-all"
          className={`pill ${subjectFilter === "all" ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
          onClick={() => setSubjectFilter("all")}>All subjects</button>
        {subjects.map(s => (
          <button key={s.id} data-testid={`filter-${s.id}`}
            className={`pill ${subjectFilter === s.id ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
            onClick={() => setSubjectFilter(s.id)}>{s.name}</button>
        ))}
      </div>

      {showForm && (
        <form onSubmit={create} className="aura-card p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input required placeholder="Title" value={form.title} data-testid="asg-title"
            onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-xl border px-3 py-2 sm:col-span-2" />
          <textarea required placeholder="Description" value={form.description} data-testid="asg-desc"
            onChange={(e) => setForm({ ...form, description: e.target.value })} className="rounded-xl border px-3 py-2 sm:col-span-2" rows={3}/>
          <select required value={form.subject_id} data-testid="asg-subject"
            onChange={(e) => setForm({ ...form, subject_id: e.target.value })} className="rounded-xl border px-3 py-2">
            <option value="">Select subject…</option>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select value={form.class_name} data-testid="asg-class"
            onChange={(e) => setForm({ ...form, class_name: e.target.value })} className="rounded-xl border px-3 py-2">
            {(meta.classes || []).map(c => <option key={c}>{c}</option>)}
          </select>
          <input required type="date" value={form.due_date} data-testid="asg-due"
            onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="rounded-xl border px-3 py-2" />
          <label className="rounded-xl border border-dashed border-slate-300 px-3 py-2 flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <Paperclip className="w-4 h-4"/> {teacherFile ? teacherFile.name : "Attach PDF (optional)"}
            <input type="file" hidden accept=".pdf,.doc,.docx,.png,.jpg" onChange={(e) => setTeacherFile(e.target.files[0])}
              data-testid="asg-file" />
          </label>
          <button data-testid="asg-submit" className="sm:col-span-2 pill py-3 bg-indigo-600 text-white">Publish</button>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.map(a => {
          const overdue = new Date(a.due_date) < new Date();
          return (
            <div key={a.id} data-testid={`asg-${a.id}`} className="aura-card p-6 hover:-translate-y-0.5 transition cursor-pointer" onClick={() => openDetail(a)}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-slate-400">{a.subject_name}</div>
                  <div className="font-heading text-xl font-semibold text-slate-800 mt-1">{a.title}</div>
                </div>
                <span className={`pill ${overdue ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"} inline-flex items-center gap-1`}>
                  <Clock className="w-3 h-3" /> Due {a.due_date}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-3 line-clamp-2">{a.description}</p>
              <div className="mt-4 flex items-center gap-3 flex-wrap">
                {a.file_url && (
                  <a href={`${import.meta.env.VITE_BACKEND_URL}${a.file_url}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}
                    className="pill bg-slate-100 text-slate-700 inline-flex items-center gap-1">
                    <Download className="w-3 h-3" /> Download
                  </a>
                )}
                {user.role === "teacher"
                  ? <span className="pill bg-indigo-100 text-indigo-700">{a.submissions_count} submissions</span>
                  : a.my_submission
                    ? <span className="pill bg-emerald-100 text-emerald-700 inline-flex items-center gap-1"><Check className="w-3 h-3"/> Submitted{a.my_submission.grade ? ` • ${a.my_submission.grade}` : ""}</span>
                    : <span className="pill bg-rose-100 text-rose-700 inline-flex items-center gap-1"><X className="w-3 h-3"/> Not submitted</span>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && <div className="col-span-full text-center text-slate-500 py-16">No assignments in this subject.</div>}
      </div>

      {active && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => { setActive(null); setDetail(null); }}>
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-400">{active.subject_name}</div>
                <div className="font-heading text-2xl font-bold mt-1">{active.title}</div>
              </div>
              <button onClick={() => { setActive(null); setDetail(null); }} className="p-1 rounded hover:bg-slate-100"><X className="w-5 h-5"/></button>
            </div>
            <p className="text-slate-600 mt-3">{active.description}</p>
            <div className="mt-3 text-sm text-slate-500">Due: {active.due_date}</div>
            {active.file_url && (
              <a href={`${import.meta.env.VITE_BACKEND_URL}${active.file_url}`} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 mt-2 text-indigo-600 text-sm font-semibold">
                <Download className="w-4 h-4"/> Download attachment
              </a>
            )}
            {user.role === "student" ? (
              <StudentSubmit assignment={active} uploadFile={uploadFile} onDone={() => { load(); setActive(null); }} />
            ) : (
              detail && <TeacherReview data={detail} onGrade={() => openDetail(active)} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StudentSubmit({ assignment, uploadFile, onDone }) {
  const [text, setText] = useState(assignment.my_submission?.text_content || "");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      let file_url = assignment.my_submission?.file_url || "";
      let file_id = assignment.my_submission?.file_id || "";
      let file_name = assignment.my_submission?.file_name || "";
      if (file) {
        const up = await uploadFile(file);
        file_url = up.url; file_id = up.id; file_name = up.original_filename;
      }
      await api.post(`/assignments/${assignment.id}/submit`, { text_content: text, file_url, file_id, file_name });
      toast.success("Submission saved");
      onDone();
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setBusy(false); }
  };
  return (
    <div className="mt-4 space-y-3">
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} data-testid="submit-text"
        className="w-full rounded-xl border border-slate-200 p-3" placeholder="Write your answer or notes…" />
      <label className="rounded-xl border border-dashed border-slate-300 p-3 flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
        <Paperclip className="w-4 h-4"/> {file ? file.name : (assignment.my_submission?.file_name || "Attach a file (PDF/DOCX/Image)")}
        <input type="file" hidden accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(e) => setFile(e.target.files[0])} data-testid="submit-file" />
      </label>
      <button data-testid="submit-btn" onClick={submit} disabled={busy}
        className="pill py-2 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center gap-2 disabled:opacity-60">
        <Upload className="w-4 h-4" /> {busy ? "Uploading…" : "Submit"}
      </button>
      {assignment.my_submission?.grade && (
        <div className="text-sm mt-2 p-3 rounded-xl bg-emerald-50 text-emerald-800">
          <div className="font-semibold">Grade: {assignment.my_submission.grade}</div>
          {assignment.my_submission.feedback && <div className="text-xs mt-1">{assignment.my_submission.feedback}</div>}
        </div>
      )}
    </div>
  );
}

function TeacherReview({ data, onGrade }) {
  const submitted = data.rows.filter(r => r.submitted).length;
  const total = data.rows.length;
  const pct = total ? Math.round((submitted / total) * 100) : 0;
  const grade = async (row) => {
    const g = window.prompt(`Grade for ${row.student_name}?`, row.submission?.grade || "A");
    if (!g) return;
    const f = window.prompt("Feedback?", row.submission?.feedback || "");
    try {
      await api.post(`/assignments/${data.assignment.id}/grade/${row.student_id}`, { grade: g, feedback: f || "" });
      toast.success("Graded");
      onGrade();
    } catch (e) { toast.error(formatApiError(e)); }
  };
  return (
    <div className="mt-4">
      <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 mb-4">
        <div className="text-sm text-slate-600">Progress</div>
        <div className="font-heading text-2xl font-bold">{submitted}/{total} <span className="text-indigo-600">({pct}%)</span></div>
      </div>
      <table className="w-full text-sm">
        <thead className="text-xs uppercase text-slate-400 border-b">
          <tr><th className="text-left py-2">Student</th><th>Status</th><th>File</th><th>Grade</th><th></th></tr>
        </thead>
        <tbody>
          {data.rows.map(r => (
            <tr key={r.student_id} className="border-b last:border-none">
              <td className="py-3">{r.student_name} <span className="text-xs text-slate-400 font-mono">({r.enrollment_number || "-"})</span></td>
              <td className="text-center">{r.submitted ? <span className="pill bg-emerald-100 text-emerald-700">Submitted</span> : <span className="pill bg-rose-100 text-rose-700">Pending</span>}</td>
              <td className="text-center">
                {r.submission?.file_url ? (
                  <a href={`${import.meta.env.VITE_BACKEND_URL}${r.submission.file_url}`} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs font-semibold">Download</a>
                ) : "—"}
              </td>
              <td className="text-center font-semibold">{r.submission?.grade || "—"}</td>
              <td className="text-right">{r.submitted && <button onClick={() => grade(r)} className="pill bg-indigo-600 text-white text-xs">Grade</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
