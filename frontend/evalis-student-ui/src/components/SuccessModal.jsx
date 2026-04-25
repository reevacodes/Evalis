import { motion } from "framer-motion";

export default function SuccessModal({
  title = "Success 🎉",
  message = "Operation completed successfully",
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.7, opacity: 0 }}
        className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-8 w-[350px] text-center shadow-xl"
      >
        {/* ✅ Animated Tick */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
        >
          <svg
            className="w-10 h-10 text-green-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            viewBox="0 0 24 24"
          >
            <motion.path
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </motion.div>

        {/* ✅ Dynamic Title */}
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{title}</h2>

        {/* ✅ Dynamic Message */}
        <p className="text-slate-500 dark:text-slate-400 text-sm">{message}</p>
      </motion.div>
    </div>
  );
}
