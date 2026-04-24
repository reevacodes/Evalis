import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, CalendarDays, Clock, FileText, AlertCircle } from "lucide-react";

export default function RescheduleModal({ isOpen, onClose, onSubmit }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("Medical Emergency");
  const [proofFile, setProofFile] = useState(null);

  if (!isOpen) return null;

  const validateTime = (selectedTime) => {
    const hours = parseInt(selectedTime.split(":")[0]);
    return hours >= 9 && hours < 17; // 9 AM to 5 PM
  };

  const validateDate = (selectedDate) => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    return day !== 0 && day !== 6; // Not Sunday (0) or Saturday (6)
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!date || !time) {
      alert("Please select a valid date and time.");
      return;
    }

    if (!validateDate(date)) {
      alert("Lab exams can only be scheduled on weekdays (Monday - Friday).");
      return;
    }

    if (!validateTime(time)) {
      alert("Lab exams must be scheduled during working hours (9:00 AM - 5:00 PM).");
      return;
    }

    if (reason.length < 10) {
      alert("Please provide a detailed reason for the reschedule request.");
      return;
    }

    if (!proofFile) {
      alert("Official documentation is strictly required to process this request.");
      return;
    }

    // Combine date and time
    const preferred_time = new Date(`${date}T${time}`).toISOString();
    onSubmit({ preferred_time, category, reason, proof_file: proofFile });
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
            className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
          >
            {/* Header Area with subtle gradient */}
            <div className="relative bg-gradient-to-r from-orange-600/20 to-red-600/10 p-6 border-b border-slate-700/50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <CalendarDays className="text-orange-400" size={24} />
                    Reschedule Exam
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    Strict on-campus lab rescheduling policy enforced.
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
              
              {/* Category Selection */}
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                  <AlertCircle size={14} /> Official Reason Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 appearance-none transition-all"
                >
                  <option value="Medical Emergency">Medical Emergency (Requires Doctor Note)</option>
                  <option value="University Representation">University Representation (Requires Dean Approval)</option>
                  <option value="Bereavement">Bereavement/Family Emergency (Requires Documentation)</option>
                </select>
              </div>

              {/* Date & Time Grid */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                    <CalendarDays size={14} /> Date (Mon-Fri)
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                    <Clock size={14} /> Time (9AM-5PM)
                  </label>
                  <input
                    type="time"
                    required
                    min="09:00"
                    max="17:00"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* File Upload Area */}
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold mb-2 flex items-center gap-1.5">
                  <UploadCloud size={14} /> Official Documentation <span className="text-red-400">*</span>
                </label>
                <div className="relative border-2 border-dashed border-slate-700 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl p-4 transition-colors group">
                  <input
                    type="file"
                    required
                    accept=".pdf,image/*"
                    onChange={(e) => setProofFile(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex items-center gap-4 text-sm text-slate-300">
                    <div className="bg-slate-700 p-3 rounded-lg group-hover:bg-slate-600 transition-colors">
                      <FileText size={20} className={proofFile ? "text-orange-400" : "text-slate-400"} />
                    </div>
                    <div className="flex-1 truncate">
                      {proofFile ? (
                        <span className="text-white font-medium">{proofFile.name}</span>
                      ) : (
                        <span className="text-slate-400">Click or drag PDF/Image here</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Reason Textarea */}
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">
                  Detailed Explanation
                </label>
                <textarea
                  required
                  placeholder="Provide context for the administration team..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 min-h-[100px] resize-y text-sm transition-all placeholder:text-slate-600"
                ></textarea>
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
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-orange-600 to-red-600 text-white hover:from-orange-500 hover:to-red-500 transition-all shadow-lg shadow-orange-900/50"
                >
                  Submit Official Request
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
