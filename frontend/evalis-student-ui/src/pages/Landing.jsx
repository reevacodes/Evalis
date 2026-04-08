import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AuthModal from "../components//AuthModal";
import { useAuth } from "../context/AuthContext";

export default function Landing() {
  const navigate = useNavigate();
  const [showAuth, setShowAuth] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "teacher") navigate("/teacher");
      else navigate("/student");
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-center min-h-screen px-6 md:px-20">
        <h2 className="text-lg md:text-xl font-medium text-white/80 mb-6 tracking-wide">
          Evalis
        </h2>
        {/* Heading */}
        <h1 className="text-5xl md:text-7xl font-semibold leading-tight max-w-4xl">
          Build and evaluate exams
          <span className="block text-gray-400">
            with intelligence and control
          </span>
        </h1>

        {/* Subtext */}
        <p className="mt-6 text-lg text-gray-400 max-w-xl">
          A unified platform for creating structured exams, managing question
          banks, and executing code securely in real time.
        </p>

        {/* Actions */}
        <div className="mt-10 flex gap-4">
          <button
            onClick={() => setShowAuth(true)}
            className="bg-white text-black px-6 py-3 rounded-lg font-medium hover:opacity-90 transition"
          >
            Get started
          </button>
        </div>
      </div>

      {/* Right side subtle visual */}
      <div className="absolute right-0 top-0 h-full w-1/2 hidden md:flex items-center justify-center">
        <div className="w-[400px] h-[400px] bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-3xl rounded-full" />
      </div>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}
