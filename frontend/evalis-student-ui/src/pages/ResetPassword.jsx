import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { resetPasswordToken } from "../services/api";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!token) {
      setError("Invalid or missing reset token. Please request a new link.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await resetPasswordToken({ token, new_password: password });
      setMessage(res.data.message || "Password successfully reset.");
      setIsSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/10 blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/10 blur-[120px] mix-blend-screen pointer-events-none" />

      <div className="w-full max-w-md bg-[#0b0f19] border border-white/10 rounded-2xl p-8 shadow-2xl relative z-10 mx-4">
        <div className="flex justify-center mb-6">
          <img 
            src="/evalis_logo_transparent.png" 
            alt="Evalis Logo" 
            className="h-12 object-contain drop-shadow-[0_0_15px_rgba(37,99,235,0.3)]" 
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
        </div>

        <h2 className="text-2xl font-bold mb-2 text-center text-white">Reset Password</h2>
        <p className="text-gray-400 text-sm text-center mb-8">Enter your new credentials below</p>

        {isSuccess ? (
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center border border-green-500/30">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-center text-green-400">{message}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full bg-white text-black py-3 rounded-lg font-medium hover:opacity-90 transition"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center">
                {error}
              </div>
            )}
            
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider ml-1">New Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-400 uppercase tracking-wider ml-1">Confirm Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 transition-colors"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-500 hover:to-indigo-500 transition mt-4 disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>

            <div className="text-center mt-4">
              <Link to="/" className="text-sm text-gray-400 hover:text-white transition">
                Return to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
