import { useState } from "react";
import { signup, login, forgotPassword } from "../services/api";
import AuthSuccessModal from "../components/AuthSuccessModal";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AuthModal({ onClose, hideClose = false, isInline = false }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [role, setRole] = useState("student");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState(""); // "login" or "signup"
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
        await signup({ email, password, role, name });

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
      alert(err.response?.data?.detail || "Server error");
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
              {/* 👇 ROLE SELECTOR (ONLY FOR SIGNUP) */}
              {!isLogin && (
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("student")}
                    className={`flex-1 py-2 rounded-lg border ${
                      role === "student"
                        ? "bg-white text-black"
                        : "border-white/20 text-white"
                    }`}
                  >
                    Student
                  </button>

                  <button
                    type="button"
                    onClick={() => setRole("teacher")}
                    className={`flex-1 py-2 rounded-lg border ${
                      role === "teacher"
                        ? "bg-white text-black"
                        : "border-white/20 text-white"
                    }`}
                  >
                    Teacher
                  </button>
                </div>
              )}

              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              <input
                type="email"
                placeholder="Email"
                className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <div className="flex flex-col gap-1">
                <input
                  type="password"
                  placeholder="Password"
                  className="bg-white/5 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-white/30"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
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
                className="bg-white text-black py-3 rounded-lg font-medium hover:opacity-90 transition mt-2"
              >
                {isLogin ? "Login" : "Sign up"}
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
