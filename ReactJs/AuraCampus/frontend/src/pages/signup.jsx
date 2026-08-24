import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("student");
  const [meta, setMeta] = useState({ departments: [], classes: [], academic_years: [] });
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    department: "", class_name: "", academic_year: "",
    subjects: "", enrollment_number: "",
  });
  const [loading, setLoading] = useState(false);
  useEffect(() => { api.get("/meta").then(r => {
    setMeta(r.data);
    setForm(f => ({ ...f, department: r.data.departments[0] || "", class_name: r.data.classes[2] || "", academic_year: r.data.academic_years[1] || "" }));
  }); }, []);
  const update = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body = { name: form.name, email: form.email, password: form.password,
        phone: form.phone, department: form.department, role };
      if (role === "student") { body.class_name = form.class_name; body.academic_year = form.academic_year; body.enrollment_number = form.enrollment_number; }
      else body.subjects = form.subjects.split(",").map(s => s.trim()).filter(Boolean);
      await signup(body);
      toast.success("Account created!");
      navigate("/dashboard");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-lg aura-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-heading text-2xl font-bold">Create account</div>
            <div className="text-xs text-slate-500">Join AuraCampus in seconds</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-slate-100 mb-6">
          <button data-testid="signup-role-student" onClick={() => setRole("student")}
            className={`py-2 rounded-full text-sm font-semibold ${role==="student" ? "bg-white shadow text-indigo-700" : "text-slate-500"}`}>Student</button>
          <button data-testid="signup-role-teacher" onClick={() => setRole("teacher")}
            className={`py-2 rounded-full text-sm font-semibold ${role==="teacher" ? "bg-white shadow text-indigo-700" : "text-slate-500"}`}>Teacher</button>
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Full name" testid="signup-name">
            <input required value={form.name} onChange={(e) => update("name", e.target.value)} className="input"/>
          </Field>
          <Field label="Phone" testid="signup-phone">
            <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="input"/>
          </Field>
          <Field label="Email" span testid="signup-email">
            <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className="input"/>
          </Field>
          <Field label="Password" span testid="signup-password">
            <input type="password" required value={form.password} onChange={(e) => update("password", e.target.value)} className="input"/>
          </Field>
          <Field label="Department" span testid="signup-department">
            <select value={form.department} onChange={(e) => update("department", e.target.value)} className="input">
              {meta.departments.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
          {role === "student" ? (
            <>
              <Field label="Enrollment number" testid="signup-enrollment">
                <input required value={form.enrollment_number} onChange={(e) => update("enrollment_number", e.target.value.toUpperCase())} className="input" placeholder="AC2025001"/>
              </Field>
              <Field label="Class" testid="signup-class">
                <select value={form.class_name} onChange={(e) => update("class_name", e.target.value)} className="input">
                  {meta.classes.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Academic year" span testid="signup-year">
                <select value={form.academic_year} onChange={(e) => update("academic_year", e.target.value)} className="input">
                  {meta.academic_years.map(y => <option key={y}>{y}</option>)}
                </select>
              </Field>
            </>
          ) : (
            <Field label="Subjects (comma-separated)" span testid="signup-subjects">
              <input value={form.subjects} onChange={(e) => update("subjects", e.target.value)} className="input" placeholder="DSA, DBMS"/>
            </Field>
          )}
          <button data-testid="signup-submit" disabled={loading}
            className="sm:col-span-2 py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-xl active:scale-[.98] transition disabled:opacity-60">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        <div className="text-sm text-slate-500 mt-4 text-center">
          Already registered? <Link to="/login" className="text-indigo-600 font-semibold">Sign in</Link>
        </div>
      </div>
      <style>{`.input{ width:100%; margin-top:.25rem; border:1px solid #E2E8F0; border-radius:.75rem; padding:.65rem .9rem; outline:none; background:#fff;} .input:focus{ border-color:#818CF8; box-shadow:0 0 0 3px rgba(99,102,241,.15);} `}</style>
    </div>
  );
}
function Field({ label, testid, span, children }) {
  return (
    <div className={span ? "sm:col-span-2" : ""} data-testid={testid}>
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</label>
      {children}
    </div>
  );
}
