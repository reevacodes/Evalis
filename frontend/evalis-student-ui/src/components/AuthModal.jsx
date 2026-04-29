import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API, { login, signup, forgotPassword } from "../services/api";
import { useAuth } from "../context/AuthContext";
import AuthSuccessModal from "./AuthSuccessModal";
import { Loader2 } from "lucide-react";

export default function AuthModal({ onClose, hideClose = false, isInline = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [collegeEmail, setCollegeEmail] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [semester, setSemester] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState(""); // "login" or "signup"
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      const res = await forgotPassword({ email });
      setForgotMessage(res.data.message || "If the email is registered, a new password will be sent.");
    } catch (err) {
      console.error(err);
      setForgotMessage("Failed to send reset request.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let res;

      if (isLogin) {
        res = await login({ email, password });

        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user); // 🔥 INSTANT STATE UPDATE

        // ✅ ADD THIS LINE
        API.defaults.headers.common["Authorization"] =
          `Bearer ${res.data.access_token}`;

        setSuccessType("login");
        setShowSuccess(true);
      } else {
        await signup({ 
            email, 
            password, 
            role, 
            name,
            ...(role === 'student' && {
                college_email: collegeEmail || null,
                college_name: collegeName || null,
                student_id: studentId || null,
                semester: semester ? parseInt(semester) : null
            })
        });

        res = await login({ email, password });

        localStorage.setItem("token", res.data.access_token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        setUser(res.data.user); // 🔥 INSTANT STATE UPDATE

        // ✅ ADD THIS LINE
        API.defaults.headers.common["Authorization"] =
          `Bearer ${res.data.access_token}`;

        setSuccessType("signup");
        setShowSuccess(true);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const containerClasses = isInline 
    ? "w-full max-w-md" 
    : "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50";

  return (
    <div className={containerClasses}>
      {/* Modal */}
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-8 w-full shadow-2xl relative">
        {/* Close */}
        {!hideClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            ✕
          </button>
        )}

        {/* Title */}
        <h2 className="text-2xl font-semibold mb-6 text-center">
          {isForgotPassword ? "Reset Password" : (isLogin ? "Welcome back" : "Create account")}
        </h2>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPasswordSubmit} className="flex flex-col gap-4">
            {forgotMessage && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-3 rounded-lg text-sm text-center">
                {forgotMessage}
              </div>
            )}
            <input
              type="email"
              placeholder="Email"
              className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-white text-black py-3 rounded-lg font-medium hover:opacity-90 transition mt-2"
            >
              Send Reset Email
            </button>
            <p className="text-center text-sm text-gray-400 mt-4">
              Remember your password? 
              <span
                onClick={() => { setIsForgotPassword(false); setForgotMessage(""); }}
                className="ml-2 text-white cursor-pointer hover:underline"
              >
                Back to Login
              </span>
            </p>
          </form>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Role selector removed - signup defaults to student */}

              {!isLogin && (
                <>
                  <input
                    type="text"
                    placeholder="Full Name"
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  
                  {role === "student" && (
                    <div className="flex flex-col gap-4 mt-2 mb-2 p-4 border border-white/10 rounded-xl bg-white/[0.02]">
                        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Institutional Details</p>
                        <input
                            type="email"
                            placeholder="College Email Address"
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                            value={collegeEmail}
                            onChange={(e) => setCollegeEmail(e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="College / University Name"
                            className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                            value={collegeName}
                            onChange={(e) => setCollegeName(e.target.value)}
                        />
                        <div className="flex gap-4">
                            <input
                                type="text"
                                placeholder="Student ID / Roll No."
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 flex-1"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                            />
                            <input
                                type="number"
                                placeholder="Semester"
                                min="1"
                                max="10"
                                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 w-32"
                                value={semester}
                                onChange={(e) => setSemester(e.target.value)}
                            />
                        </div>
                    </div>
                  )}
                </>
              )}

              <input
                type="email"
                placeholder="Email"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30 w-full"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-gray-400 hover:text-white"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
                {isLogin && (
                  <div className="text-right mt-1">
                    <span 
                      className="text-xs text-gray-400 hover:text-white cursor-pointer transition"
                      onClick={() => setIsForgotPassword(true)}
                    >
                      Forgot Password?
                    </span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-white text-black py-3 rounded-lg font-medium hover:opacity-90 transition mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                {loading ? (isLogin ? "Logging in..." : "Signing up...") : (isLogin ? "Login" : "Sign up")}
              </button>
            </form>

            {/* Toggle */}
            <p className="text-center text-sm text-gray-400 mt-6">
              {isLogin ? "Don’t have an account?" : "Already have an account?"}
              <span
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-white cursor-pointer hover:underline"
              >
                {isLogin ? "Sign up" : "Login"}
              </span>
            </p>
          </>
        )}
      </div>

      {/* ✅ Success Modal */}
      {showSuccess && (
        <AuthSuccessModal
          type={successType}
          onClose={() => {
            setShowSuccess(false);

            // 🔥 GET USER FROM LOCAL STORAGE
            const user = JSON.parse(localStorage.getItem("user"));

            // 🔥 ROLE BASED NAVIGATION
            if (user?.role === "admin") {
              navigate("/admin");
            } else if (user?.role === "teacher") {
              navigate("/teacher");
            } else {
              navigate("/student");
            }

            onClose();
          }}
        />
      )}
    </div>
  );
}
