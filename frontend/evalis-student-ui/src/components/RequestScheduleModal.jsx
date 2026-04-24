import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CalendarDays, Clock, Hourglass } from "lucide-react";

export default function RequestScheduleModal({ isOpen, onClose, onSubmit, examName }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState("120");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!date || !time) {
      alert("Please select a date and time.");
      return;
    }

    const requested_start_time = new Date(`${date}T${time}`).toISOString();
    const requested_duration_minutes = parseInt(duration);

    onSubmit({ requested_start_time, requested_duration_minutes });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
          >
            {/* Header Area */}
            <div className="relative bg-gradient-to-r from-blue-600/20 to-indigo-600/10 p-6 border-b border-slate-700/50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <CalendarDays className="text-blue-400" size={24} />
                    Request Schedule
                  </h2>
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1 truncate">
                    {examName || "Finalize your preferred time"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 bg-slate-800/50 hover:bg-slate-700 text-slate-400 hover:text-white rounded-full transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Date & Time Grid */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                    <CalendarDays size={14} /> Requested Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                    <Clock size={14} /> Start Time
                  </label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Duration Select */}
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                  <Hourglass size={14} /> Exam Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 appearance-none transition-all"
                >
                  <option value="30">30 Minutes</option>
                  <option value="60">1 Hour (60 Mins)</option>
                  <option value="90">1.5 Hours (90 Mins)</option>
                  <option value="120">2 Hours (120 Mins)</option>
                  <option value="180">3 Hours (180 Mins)</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-blue-900/50"
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
