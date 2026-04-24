import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageSquareWarning } from "lucide-react";

export default function AdminRejectModal({ isOpen, onClose, onSubmit, requestDetails }) {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      alert("Please provide a meaningful reason (at least 10 characters).");
      return;
    }
    onSubmit(reason);
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
            {/* Header Area */}
            <div className="relative bg-gradient-to-r from-red-600/20 to-orange-600/10 p-6 border-b border-slate-700/50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    <MessageSquareWarning className="text-red-400" size={24} />
                    Reject Reschedule Request
                  </h2>
                  <p className="text-sm text-slate-400 mt-1">
                    You are rejecting a request for <span className="font-bold text-slate-300">{requestDetails?.exam_name || "Exam"}</span>.
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
              
              <div>
                <label className="text-xs uppercase text-slate-400 font-bold mb-2 block">
                  Rejection Reason (Sent to Student)
                </label>
                <textarea
                  required
                  autoFocus
                  placeholder="E.g., Proof document is invalid, or the selected time falls outside of lab hours..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 text-white p-3 rounded-xl focus:ring-2 focus:ring-red-500/50 focus:border-red-500 min-h-[120px] resize-y text-sm transition-all placeholder:text-slate-600"
                ></textarea>
                <p className="text-xs text-slate-500 mt-2">
                  This exact feedback will be sent via notification to the student, along with your contact email.
                </p>
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
                  className="flex-1 py-3 rounded-xl font-bold bg-gradient-to-r from-red-600 to-red-800 text-white hover:from-red-500 hover:to-red-700 transition-all shadow-lg shadow-red-900/50"
                >
                  Confirm Rejection
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
