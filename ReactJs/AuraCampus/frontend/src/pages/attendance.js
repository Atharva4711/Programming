import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { QrCode, Timer, ShieldAlert, TrendingUp, AlertTriangle, Camera, X, Download, Minus, Plus, MapPin, Loader2 } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function Attendance() {
  const { user } = useAuth();
  if (user?.role === "teacher") return <TeacherAttendance />;
  return <StudentAttendance />;
}

const FRONT = window.location.origin;

// ---------------- Teacher ----------------
function TeacherAttendance() {
  const [subjects, setSubjects] = useState([]);
  const [subjectId, setSubjectId] = useState("");
  const [meta, setMeta] = useState({ classes: [] });
  const [className, setClassName] = useState("SE-A");
  const [duration, setDuration] = useState(10);
  const [session, setSession] = useState(null);
  const [currentToken, setCurrentToken] = useState(""); // Rotating dynamic token
  const [marks, setMarks] = useState([]);
  const [report, setReport] = useState(null);
  const [tabHidden, setTabHidden] = useState(false);
  const [rotator, setRotator] = useState(0);

  useEffect(() => {
    api.get("/subjects").then(r => { setSubjects(r.data); if (r.data[0]) setSubjectId(r.data[0].id); });
    api.get("/meta").then(r => setMeta(r.data));
    api.get("/attendance/report").then(r => setReport(r.data));
  }, []);

  // Poll server every 5 seconds to update dynamic rotating token and live marks list
  useEffect(() => {
    if (!session) return;

    const fetchLiveSession = () => {
      api.get(`/attendance/session/${session.id}/live`)
        .then(r => {
          if (r.data.rotating_token) {
            setCurrentToken(r.data.rotating_token);
          }
          setMarks(r.data.marks || []);
          setRotator(n => n + 1);
        })
        .catch(e => console.error(e));
    };

    fetchLiveSession();
    const iv = setInterval(fetchLiveSession, 5000); // 5-second dynamic rotation interval
    return () => clearInterval(iv);
  }, [session]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const noCtx = (e) => e.preventDefault();
    document.addEventListener("contextmenu", noCtx);
    return () => { document.removeEventListener("visibilitychange", onVis); document.removeEventListener("contextmenu", noCtx); };
  }, []);

  const start = async () => {
    if (!subjectId) { toast.error("Please add a subject first from the Timetable page."); return; }
    try {
      const { data } = await api.post("/attendance/session", { subject_id: subjectId, class_name: className, duration_min: duration });
      setSession(data);
      setCurrentToken(data.token);
      setMarks([]);
      toast.success("Attendance session started with dynamic rotation");
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const exportDefaulters = () => {
    if (!report) return;
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text("AuraCampus — Defaulter Report (<75%)", 14, 18);
    doc.setFontSize(10); doc.setTextColor(100); doc.text(new Date().toLocaleString(), 14, 25);
    autoTable(doc, {
      startY: 30,
      head: [["Student", "Enrollment", "Class", "Email", "Attendance %"]],
      body: (report.defaulters || []).map(d => [d.student_name, d.enrollment_number || "-", d.class_name, d.email, d.overall_percent + "%"]),
      headStyles: { fillColor: [79, 70, 229] },
    });
    doc.save("defaulters-report.pdf");
  };

  // Uses current rotating token so photos of the screen expire almost immediately
  const activeToken = currentToken || session?.token || "";
  const qrValue = activeToken ? `${FRONT}/attend/${activeToken}` : "";
  const selectedSubjectName = (subjects.find(s => s.id === subjectId) || {}).name || "";

  const teacherSubjectStats = (() => {
    if (!report?.report) return [];
    const acc = {};
    for (const row of report.report) {
      for (const r of row.rows || []) {
        acc[r.subject] = acc[r.subject] || { subject: r.subject, total: 0, present: 0 };
        acc[r.subject].total += r.total;
        acc[r.subject].present += r.present;
      }
    }
    return Object.values(acc).map(s => ({ ...s, percent: s.total ? Math.round((s.present / s.total) * 100) : 0 }));
  })();

  return (
    <div className="space-y-6" data-testid="attendance-teacher">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Attendance</h1>
          <p className="text-slate-500 text-sm">Generate a dynamic rotating QR & monitor live attendance.</p>
        </div>
        <button data-testid="export-defaulters" onClick={exportDefaulters}
          className="pill bg-slate-800 text-white flex items-center gap-2">
          <Download className="w-4 h-4"/> Export Defaulter PDF
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aura-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <div className="font-heading text-lg font-semibold">QR Session</div>
          </div>
          <div className="space-y-3 mb-4">
            <label className="block text-xs font-semibold text-slate-600">
              Subject (from your registered subjects)
              {subjects.length === 0 && (
                <div className="mt-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1.5">
                  You have no subjects yet. Add one from the <b>Timetable</b> page.
                </div>
              )}
              <select data-testid="att-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                {subjects.length === 0 && <option value="">—</option>}
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs font-semibold text-slate-600">
                Class
                <select data-testid="att-class" value={className} onChange={(e) => setClassName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2">
                  {(meta.classes || []).map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Session duration (minutes)
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-200 px-2 py-1.5">
                  <button type="button" onClick={() => setDuration(d => Math.max(1, d - 1))}
                    className="p-1 rounded-lg hover:bg-slate-100" aria-label="decrease">
                    <Minus className="w-4 h-4"/>
                  </button>
                  <input data-testid="att-duration" type="number" min="1" max="60" value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="flex-1 text-center outline-none bg-transparent font-mono font-bold text-lg" />
                  <button type="button" onClick={() => setDuration(d => Math.min(60, d + 1))}
                    className="p-1 rounded-lg hover:bg-slate-100" aria-label="increase">
                    <Plus className="w-4 h-4"/>
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">How long students can mark attendance</div>
              </label>
            </div>
            <button data-testid="att-start" onClick={start}
              className="w-full pill py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4" /> Start Session
            </button>
          </div>

          {session && (
            <div className={`no-shot rounded-2xl p-6 bg-gradient-to-br from-slate-50 to-indigo-50 border border-indigo-100 text-center blur-when-hidden ${tabHidden ? "hidden-tab" : ""}`}>
              <div className="flex items-center justify-center gap-2 text-xs text-amber-700 mb-3">
                <ShieldAlert className="w-4 h-4" /> Auto-Rotating Token • Dynamic Anti-Proxy
              </div>
              <div className="inline-block bg-white rounded-xl p-4 shadow-md relative">
                <QRCodeCanvas value={qrValue} size={240} bgColor="#ffffff" fgColor="#0F1B3D" level="H" includeMargin={true} />
              </div>
              <div className="mt-3 text-slate-700 text-sm">
                <div className="font-semibold text-slate-800">{selectedSubjectName} • {className}</div>
                <div className="text-xs text-slate-500 mt-0.5 break-all">{qrValue}</div>
              </div>
              <div className="text-xs text-slate-500 mt-2">Live Dynamic Code: <span className="font-mono font-bold text-slate-800">{activeToken}</span></div>
              <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-center gap-1"><Timer className="w-3 h-3"/> Session expires {new Date(session.expires_at).toLocaleTimeString()} • Dynamic refreshes: {rotator}×</div>
            </div>
          )}
        </div>

        <div className="aura-card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Live Marks {session && `(${marks.length})`}</div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {marks.map(m => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <div>
                  <div className="font-semibold text-slate-800 text-sm">{m.student_name}</div>
                  <div className="text-xs text-slate-500">{m.subject_name} • {new Date(m.marked_at).toLocaleTimeString()}</div>
                </div>
                <span className="pill bg-emerald-200 text-emerald-800">Present</span>
              </div>
            ))}
            {marks.length === 0 && <div className="text-sm text-slate-500">No marks yet. Waiting for students…</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aura-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-indigo-500" />
            <div className="font-heading text-lg font-semibold">Subject-wise attendance</div>
          </div>
          <div className="space-y-3">
            {teacherSubjectStats.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium text-slate-800">{s.subject}</div>
                  <div className="font-mono text-slate-600">{s.present}/{s.total} <span className={`ml-1 pill ${s.percent >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{s.percent}%</span></div>
                </div>
                <div className="h-2 mt-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.percent >= 75 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${s.percent}%` }}/>
                </div>
              </div>
            ))}
            {teacherSubjectStats.length === 0 && <div className="text-sm text-slate-500">No sessions taken yet.</div>}
          </div>
        </div>

        <div className="aura-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <div className="font-heading text-lg font-semibold">Monthly Defaulters (&lt; 75%)</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-slate-400 border-b">
                <tr><th className="text-left py-2">Student</th><th className="text-left">Enrollment</th><th className="text-right">%</th></tr>
              </thead>
              <tbody>
                {(report?.defaulters || []).map(d => (
                  <tr key={d.student_id} className="border-b last:border-none">
                    <td className="py-3 font-medium text-slate-800">{d.student_name} <span className="text-slate-400 text-xs">({d.class_name})</span></td>
                    <td className="text-slate-500 font-mono">{d.enrollment_number || "-"}</td>
                    <td className="text-right font-bold text-rose-600">{d.overall_percent}%</td>
                  </tr>
                ))}
                {(!report || report.defaulters.length === 0) && (
                  <tr><td colSpan="3" className="text-center text-slate-500 py-6">No defaulters — everyone&apos;s on track!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Student ----------------
function StudentAttendance() {
  const [code, setCode] = useState("");
  const [report, setReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => api.get("/attendance/report").then(r => setReport(r.data));
  useEffect(() => { load(); }, []);

  // Request GPS coordinates and submit token + location to backend
  const mark = async (tokenToUse) => {
    const rawToken = (tokenToUse || code).trim();
    if (!rawToken) {
      toast.error("Please enter a valid attendance code");
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setSubmitting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const payload = {
            token: rawToken,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };

          const { data } = await api.post("/attendance/mark", payload);
          toast.success(data.message || "Attendance marked");
          setCode(""); 
          load();
        } catch (err) { 
          toast.error(formatApiError(err)); 
        } finally {
          setSubmitting(false);
        }
      },
      (geoErr) => {
        setSubmitting(false);
        toast.error("Location permission denied. GPS is required to mark attendance.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode("qr-reader");
    scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
      (decoded) => {
        try {
          const match = decoded.match(/\/attend\/([^/?#]+)/);
          const tok = match ? match[1] : decoded;
          if (tok) { 
            mark(tok); 
            scanner.stop().catch(() => {}); 
            setScanning(false); 
          }
        } catch { 
          mark(decoded); 
          scanner.stop().catch(() => {}); 
          setScanning(false); 
        }
      }, () => {}
    ).catch(() => toast.error("Camera not available. Enter code manually."));
    return () => { scanner.stop().catch(() => {}); };
    // eslint-disable-next-line
  }, [scanning]);

  const summary = report?.summary || [];
  const overall = summary.length
    ? Math.round(summary.reduce((a, s) => a + s.percent, 0) / summary.length)
    : 0;

  return (
    <div className="space-y-6" data-testid="attendance-student">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 text-sm">Scan the dynamic QR or enter the code shown by your teacher.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aura-card p-6 space-y-3">
          <div className="font-heading text-lg font-semibold">Mark Attendance</div>
          <button data-testid="student-scan-btn" onClick={() => setScanning(s => !s)} disabled={submitting}
            className="w-full pill py-3 bg-slate-900 text-white flex items-center justify-center gap-2 disabled:opacity-50">
            {scanning ? <><X className="w-4 h-4"/> Stop scanning</> : <><Camera className="w-4 h-4"/> Scan QR with camera</>}
          </button>
          {scanning && <div id="qr-reader" className="w-full rounded-xl overflow-hidden" />}
          <div className="text-center text-xs text-slate-400 uppercase tracking-widest">— or enter code —</div>
          <form onSubmit={(e) => { e.preventDefault(); mark(); }} className="space-y-3">
            <input data-testid="student-code" required value={code} onChange={(e) => setCode(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 font-mono uppercase tracking-widest"
              placeholder="ATTEND CODE" />
            <button data-testid="student-mark-btn" disabled={submitting}
              className="w-full pill py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-2 disabled:opacity-60">
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying location...</>
              ) : (
                <><MapPin className="w-4 h-4" /> Mark Present</>
              )}
            </button>
          </form>
        </div>
        <div className="aura-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="font-heading text-lg font-semibold">Subject-wise summary</div>
            <div className={`pill ${overall >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>Overall {overall}%</div>
          </div>
          <div className="space-y-4">
            {summary.map(s => (
              <div key={s.subject}>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium text-slate-800">{s.subject}</div>
                    <div className="text-xs text-slate-500">{s.present}/{s.total} sessions</div>
                  </div>
                  <div className={`pill ${s.percent >= 75 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{s.percent}%</div>
                </div>
                <div className="h-2 mt-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${s.percent >= 75 ? "bg-emerald-500" : "bg-rose-500"}`} style={{ width: `${s.percent}%` }}/>
                </div>
              </div>
            ))}
            {summary.length === 0 && <div className="text-sm text-slate-500">No sessions yet.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}