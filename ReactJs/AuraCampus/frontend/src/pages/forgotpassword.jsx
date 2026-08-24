import { useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export default function ForgotPassword() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", { identifier });
      toast.success("If the account exists, a reset email has been sent.");
      setDone(true);
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
          <div>
            <div className="font-heading text-2xl font-bold">Forgot password?</div>
            <div className="text-xs text-slate-500">We&apos;ll email a reset link.</div>
          </div>
        </div>
        {!done ? (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Email or Enrollment number</label>
              <input data-testid="forgot-identifier" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="you@auracampus.com or AC2025001" />
            </div>
            <button data-testid="forgot-submit" disabled={loading}
              className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        ) : (
          <div className="text-sm text-slate-600">
            Check your inbox for a link. It expires in one hour.
          </div>
        )}
        <div className="mt-6 text-center text-sm text-slate-500">
          Remembered it? <Link to="/login" className="text-indigo-600 font-semibold">Back to login</Link>
        </div>
      </div>
    </div>
  );
}
