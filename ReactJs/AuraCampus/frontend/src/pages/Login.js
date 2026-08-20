import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap, BookOpen, Sparkles, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login, setUser } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [identifier, setIdentifier] = useState(""); // email for teacher, enrollment for student
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isTeacher = role === "teacher";

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = { password, role };
      if (isTeacher) body.email = identifier;
      else body.enrollment_number = identifier;
      const { data } = await api.post("/auth/login", body);
      localStorage.setItem("aura_token", data.token);
      setUser(data.user);
      toast.success("Welcome back!");
      navigate("/dashboard");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col justify-between p-10 aura-hero relative">
        <div className="flex items-center gap-3 z-10">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur grid place-items-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="font-heading font-bold text-2xl">AuraCampus</div>
            <div className="text-xs uppercase tracking-widest text-white/70">Smart Campus Suite</div>
          </div>
        </div>
        <div className="z-10">
          <div className="font-heading text-4xl font-bold leading-tight">
            Where learning meets<br/> a beautiful aura.
          </div>
          <p className="text-white/80 mt-4 max-w-md">
            One unified platform for timetables, QR attendance, assignments, quizzes, notices & lost & found.
          </p>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-md">
            {[
              { icon: BookOpen, label: "Timetable" },
              { icon: Sparkles, label: "Quizzes" },
              { icon: ShieldCheck, label: "Secure QR" },
            ].map((f) => (
              <div key={f.label} className="rounded-2xl bg-white/10 backdrop-blur p-4">
                <f.icon className="w-5 h-5 mb-2" />
                <div className="text-sm font-medium">{f.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-xs text-white/60 z-10">© {new Date().getFullYear()} AuraCampus</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <div className="font-heading text-3xl font-bold text-slate-900">Welcome back</div>
            <div className="text-slate-500 mt-1 text-sm">Sign in to continue to AuraCampus</div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-slate-100 mb-6">
            <button data-testid="role-student-btn" onClick={() => setRole("student")}
              className={`py-2 rounded-full text-sm font-semibold ${!isTeacher ? "bg-white shadow text-indigo-700" : "text-slate-500"}`}>
              I&apos;m a Student
            </button>
            <button data-testid="role-teacher-btn" onClick={() => setRole("teacher")}
              className={`py-2 rounded-full text-sm font-semibold ${isTeacher ? "bg-white shadow text-indigo-700" : "text-slate-500"}`}>
              I&apos;m a Teacher
            </button>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                {isTeacher ? "Email" : "Enrollment Number"}
              </label>
              <input data-testid="login-email" type={isTeacher ? "email" : "text"} required
                value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder={isTeacher ? "you@auracampus.com" : "AC2025001"} />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
                <Link to="/forgot-password" data-testid="forgot-link" className="text-xs text-indigo-600 font-semibold hover:underline">Forgot password?</Link>
              </div>
              <input data-testid="login-password" type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••" />
            </div>
            <button data-testid="login-submit-btn" disabled={loading}
              className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl active:scale-[.98] transition disabled:opacity-60">
              {loading ? "Signing in…" : `Login as ${isTeacher ? "Teacher" : "Student"}`}
            </button>
          </form>

          <div className="text-sm text-slate-500 mt-6 text-center">
            No account yet?{" "}
            <Link to="/signup" data-testid="go-signup" className="text-indigo-600 font-semibold hover:underline">Create one</Link>
          </div>

          <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
            <div className="font-semibold text-slate-700 mb-1">Demo accounts</div>
            Teacher — <span className="font-mono">teacher@auracampus.com / teacher123</span><br/>
            Student — enrollment <span className="font-mono">AC2025001 / student123</span>
          </div>
        </div>
      </div>
    </div>
  );
}
