import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function AuthSuccessModal({ type, onClose }) {
  const navigate = useNavigate();
  const handleContinue = () => {
    const user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
      navigate("/");
      return;
    }

    if (user.role === "admin") {
      navigate("/admin");
    } else if (user.role === "teacher") {
      navigate("/teacher");
    } else {
      navigate("/student");
    }

    onClose(); // optional (closes modal)
  };
  const message =
    type === "signup" ? "Account created successfully" : "Welcome back!";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="bg-[#0b0f19] border border-white/10 rounded-2xl p-8 w-[90%] max-w-sm text-center shadow-2xl"
      >
        {/* Animated Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-5xl mb-4"
        ></motion.div>

        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
          {type === "signup" ? "Signup Successful" : "Login Successful"}
        </h2>

        <p className="text-gray-400 mb-6">{message}</p>

        <button
          onClick={handleContinue}
          className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:opacity-90"
        >
          Continue
        </button>
      </motion.div>
    </div>
  );
}
