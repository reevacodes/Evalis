import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import API from "../services/api";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";

export default function SetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid or missing invite token.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await API.post("/auth/set-password", {
        token,
        new_password: password,
      });

      setSuccess(true);
      setTimeout(() => {
        navigate("/");
      }, 3000);
    } catch (err) {
      console.error("Set password error:", err);
      setError(err.response?.data?.detail || "Failed to set password. Token may be invalid or expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans p-6">
        <div className="bg-[#0b0f19] border border-red-500/20 p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Invalid Invite Link</h2>
          <p className="text-gray-400">Please check your email and click the exact link provided.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans p-6">
        <div className="bg-[#0b0f19] border border-green-500/20 p-8 rounded-2xl max-w-md w-full flex flex-col items-center text-center">
          <ShieldCheck className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Account Activated</h2>
          <p className="text-gray-400 mb-6">Your password has been successfully set. You can now access your teacher dashboard.</p>
          <div className="flex items-center gap-2 text-sm text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to login...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen pointer-events-none" />

      <div className="relative z-10 bg-[#0b0f19] border border-white/10 rounded-2xl p-8 w-full max-w-md shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div className="flex justify-center mb-6">
          <img 
            src="/evalis_logo_transparent.png" 
            alt="Evalis" 
            className="h-12 object-contain"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>

        <h2 className="text-2xl font-semibold mb-2 text-center text-white">Activate Your Account</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Set a secure password to activate your teacher profile.</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center mb-6 flex items-center justify-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold pl-1">New Password</label>
            <input
              type="password"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500/50 w-full text-white transition-colors"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider font-semibold pl-1">Confirm Password</label>
            <input
              type="password"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500/50 w-full text-white transition-colors"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-3 rounded-lg font-bold transition mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
          >
            {loading && <Loader2 className="w-5 h-5 animate-spin" />}
            {loading ? "Activating..." : "Set Password & Activate"}
          </button>
        </form>
      </div>
    </div>
  );
}
