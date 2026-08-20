import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { User, Mail, Phone, Building2, GraduationCap, Hash, KeyRound } from "lucide-react";

export default function Profile() {
  const { user, setUser } = useAuth();
  const [meta, setMeta] = useState({ departments: [], classes: [], academic_years: [] });
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", department: user?.department || "",
    class_name: user?.class_name || "", academic_year: user?.academic_year || "",
  });
  const [pw, setPw] = useState({ current_password: "", new_password: "" });

  useEffect(() => { api.get("/meta").then(r => setMeta(r.data)); }, []);

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.patch("/auth/profile", form);
      setUser(data.user);
      toast.success("Profile updated");
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const changePw = async (e) => {
    e.preventDefault();
    try {
      await api.post("/auth/change-password", pw);
      toast.success("Password changed");
      setPw({ current_password: "", new_password: "" });
    } catch (err) { toast.error(formatApiError(err)); }
  };

  const initials = (user?.name || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6" data-testid="profile-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-slate-900">My Profile</h1>
        <p className="text-slate-500 text-sm">Your credentials and account details.</p>
      </div>

      <div className="aura-hero rounded-3xl p-6 flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur grid place-items-center text-white font-heading font-bold text-3xl">{initials}</div>
        <div className="text-white">
          <div className="font-heading text-2xl font-bold">{user?.name}</div>
          <div className="text-white/80 capitalize text-sm">{user?.role} • {user?.department || "—"}</div>
          {user?.enrollment_number && (
            <div className="mt-1 pill bg-white/20 inline-flex items-center gap-1">
              <Hash className="w-3 h-3" /> {user.enrollment_number}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aura-card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Account details</div>
          <div className="space-y-3 text-sm">
            <Row icon={Mail} label="Email" value={user?.email} />
            <Row icon={Phone} label="Phone" value={user?.phone || "—"} />
            <Row icon={Building2} label="Department" value={user?.department || "—"} />
            {user?.role === "student" && <>
              <Row icon={GraduationCap} label="Class" value={user?.class_name || "—"} />
              <Row icon={GraduationCap} label="Academic year" value={user?.academic_year || "—"} />
              <Row icon={Hash} label="Enrollment number" value={user?.enrollment_number || "—"} />
            </>}
            {user?.role === "teacher" && user?.subjects?.length ? (
              <Row icon={GraduationCap} label="Subjects" value={user.subjects.join(", ")} />
            ) : null}
          </div>
        </div>

        <div className="aura-card p-6">
          <div className="font-heading text-lg font-semibold mb-4">Edit profile</div>
          <form onSubmit={save} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-slate-600 sm:col-span-2">
              Full name
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                data-testid="profile-name" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Phone
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                data-testid="profile-phone" className="mt-1 w-full rounded-xl border px-3 py-2" />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              Department
              <select value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                data-testid="profile-dept" className="mt-1 w-full rounded-xl border px-3 py-2">
                {(meta.departments || []).map(d => <option key={d}>{d}</option>)}
              </select>
            </label>
            {user?.role === "student" && <>
              <label className="text-xs font-semibold text-slate-600">
                Class
                <select value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })}
                  data-testid="profile-class" className="mt-1 w-full rounded-xl border px-3 py-2">
                  {(meta.classes || []).map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">
                Academic year
                <select value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })}
                  data-testid="profile-year" className="mt-1 w-full rounded-xl border px-3 py-2">
                  {(meta.academic_years || []).map(y => <option key={y}>{y}</option>)}
                </select>
              </label>
            </>}
            <button data-testid="profile-save" className="sm:col-span-2 pill bg-indigo-600 text-white py-2">Save changes</button>
          </form>
        </div>
      </div>

      <div className="aura-card p-6 max-w-lg">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-slate-500" />
          <div className="font-heading text-lg font-semibold">Change password</div>
        </div>
        <form onSubmit={changePw} className="space-y-3">
          <input type="password" required placeholder="Current password" value={pw.current_password}
            onChange={(e) => setPw({ ...pw, current_password: e.target.value })}
            data-testid="cur-pw" className="w-full rounded-xl border px-3 py-2" />
          <input type="password" required placeholder="New password" value={pw.new_password}
            onChange={(e) => setPw({ ...pw, new_password: e.target.value })}
            data-testid="new-pw" className="w-full rounded-xl border px-3 py-2" />
          <button data-testid="pw-submit" className="pill bg-slate-900 text-white px-6 py-2">Update password</button>
        </form>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 mt-0.5 text-indigo-500 flex-shrink-0" />
      <div>
        <div className="text-xs uppercase text-slate-400 tracking-wider">{label}</div>
        <div className="text-slate-800">{value}</div>
      </div>
    </div>
  );
}
