import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function RescheduleModal({ isOpen, onClose, onSubmit }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !time || reason.length < 10) {
      alert("Please fill out a valid future date/time and a reason (> 10 chars).");
      return;
    }

    // Combine date and time
    const preferred_time = new Date(`${date}T${time}`).toISOString();
    onSubmit({ preferred_time, reason });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md shadow-xl"
          >
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-white tracking-wide">
                Request Reschedule
              </h2>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white transition"
              >
                ✖
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-bold mb-1">
                    Preferred Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase text-slate-400 font-bold mb-1">
                    Preferred Time
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 text-white p-2.5 rounded-lg focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-400 font-bold mb-1">
                  Reason for Request
                </label>
                <textarea
                  required
                  placeholder="E.g., Medical emergency, clash with another exam..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white p-3 rounded-lg focus:outline-none focus:border-orange-500 min-h-[100px] resize-y text-sm"
                ></textarea>
                <p className="text-xs text-slate-500 mt-1">Minimum 10 characters.</p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl font-semibold bg-orange-600 text-white hover:bg-orange-500 transition shadow-lg shadow-orange-600/20"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
