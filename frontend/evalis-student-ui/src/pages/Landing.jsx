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
    <div className="min-h-screen bg-[#0b0f19] text-white relative overflow-hidden flex items-center justify-center">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10" />

      <div className="relative z-10 w-full max-w-7xl px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left Side: Marketing Context */}
        <div className="flex flex-col justify-center">
          <h2 className="text-lg md:text-xl font-medium text-white/80 mb-6 tracking-wide">
            Evalis
          </h2>
          <h1 className="text-4xl md:text-6xl font-semibold leading-tight max-w-2xl">
            Build and evaluate exams
            <span className="block text-gray-400 mt-2">
              with intelligence and control
            </span>
          </h1>
          <p className="mt-6 text-lg text-gray-400 max-w-md">
            A unified platform for creating structured exams, managing question
            banks, and executing code securely in real time.
          </p>
        </div>

        {/* Right Side: AuthModal Injected Natively */}
        <div className="flex items-center justify-center w-full lg:justify-end">
          <div className="w-full max-w-md">
            <AuthModal onClose={() => {}} hideClose={true} isInline={true} />
          </div>
        </div>
      </div>
    </div>
  );
}
