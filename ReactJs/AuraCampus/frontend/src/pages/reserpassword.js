import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, new_password: password });
      toast.success("Password reset. Please sign in.");
      nav("/login");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <div className="w-full max-w-md aura-card p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 grid place-items-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="font-heading text-2xl font-bold">Choose a new password</div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            data-testid="reset-password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3" placeholder="New password" />
          <button data-testid="reset-submit" disabled={loading || !token}
            className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
            {loading ? "Updating…" : "Update password"}
          </button>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500">
          <Link to="/login" className="text-indigo-600 font-semibold">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
