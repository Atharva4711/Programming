import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CheckCircle2, Loader2, GraduationCap, AlertTriangle, LogIn } from "lucide-react";

// Public landing page students see when they scan a QR from their phone
// URL: /attend/:token — asks them to sign in if needed, then a single tap
// button marks their attendance in real time.
export default function PublicAttend() {
  const { token } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const [session, setSession] = useState(null);
  const [status, setStatus] = useState({ loading: true, marked: false, error: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/attendance/public/${token}`)
      .then(r => setSession(r.data))
      .catch(e => setStatus(s => ({ ...s, error: formatApiError(e) })))
      .finally(() => setStatus(s => ({ ...s, loading: false })));
  }, [token]);

  const mark = async () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser.");
      return;
    }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const payload = {
            token,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          const { data } = await api.post("/attendance/mark", payload);
          setStatus(s => ({ ...s, marked: true }));
          toast.success(data.message || "Attendance marked");
        } catch (e) { toast.error(formatApiError(e)); }
        finally { setSubmitting(false); }
      },
      (geoErr) => {
        setSubmitting(false);
        toast.error("Location permission denied. GPS is required to mark attendance.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-700 grid place-items-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-6 text-white">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur grid place-items-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="font-heading font-bold text-2xl">AuraCampus</div>
            <div className="text-xs uppercase tracking-widest text-white/70">Quick Attendance</div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center" data-testid="public-attend">
          {status.loading ? (
            <div className="text-slate-500 flex items-center justify-center gap-2 py-8">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading session…
            </div>
          ) : status.error ? (
            <div className="py-6">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 text-rose-600 grid place-items-center mb-3">
                <AlertTriangle className="w-7 h-7"/>
              </div>
              <div className="font-heading text-xl font-bold text-slate-800">{status.error}</div>
              <div className="text-sm text-slate-500 mt-1">Ask your teacher for a fresh code.</div>
            </div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">Class</div>
              <div className="font-heading text-2xl font-bold text-slate-900 mt-1">{session.subject_name}</div>
              <div className="text-sm text-slate-500">{session.class_name} • {session.teacher_name}</div>
              <div className="mt-1 text-xs text-slate-400">Expires {new Date(session.expires_at).toLocaleTimeString()}</div>

              {session.expired ? (
                <div className="mt-6 pill bg-rose-100 text-rose-700 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> Session expired</div>
              ) : !user ? (
                <>
                  <div className="mt-6 text-sm text-slate-600">Sign in to your student account to mark attendance.</div>
                  <button data-testid="public-login-btn" onClick={() => nav(`/login?next=/attend/${token}`)}
                    className="mt-4 w-full pill py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex items-center justify-center gap-2">
                    <LogIn className="w-4 h-4"/> Sign in to continue
                  </button>
                </>
              ) : user.role !== "student" ? (
                <div className="mt-6 pill bg-amber-100 text-amber-700 inline-flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3"/> Only students can mark attendance
                </div>
              ) : status.marked ? (
                <>
                  <div className="mt-6 w-16 h-16 mx-auto rounded-full bg-emerald-100 text-emerald-600 grid place-items-center">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div className="font-heading text-xl font-bold text-emerald-700 mt-2">Attendance marked!</div>
                  <div className="text-sm text-slate-500">You&apos;re all set. Have a great class.</div>
                  <button data-testid="public-goto-dashboard" onClick={() => nav("/dashboard")}
                    className="mt-4 pill py-2 px-6 bg-slate-900 text-white">Go to dashboard</button>
                </>
              ) : (
                <>
                  <div className="mt-6 text-sm text-slate-600">Signed in as <span className="font-semibold">{user.name}</span></div>
                  <button data-testid="public-mark-btn" onClick={mark} disabled={submitting}
                    className="mt-4 w-full pill py-4 text-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold shadow-lg disabled:opacity-60">
                    {submitting ? "Marking…" : "✓ Mark My Attendance"}
                  </button>
                </>
              )}
            </>
          )}
        </div>
        <div className="text-center text-white/70 text-xs mt-4">Powered by AuraCampus • Secure QR</div>
      </div>
    </div>
  );
}
