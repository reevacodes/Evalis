import { useState, useEffect } from "react";
import { X, AlertCircle, CheckCircle2, Info } from "lucide-react";

export default function AlertModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [type, setType] = useState("info"); // 'info', 'success', 'error'
  const [title, setTitle] = useState("Notification");

  useEffect(() => {
    const originalAlert = window.alert;
    
    window.alert = (msg) => {
      // 1. Strip emojis using Unicode properties
      let cleanMsg = typeof msg === 'string' 
        ? msg.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu, '') 
        : msg;
      
      // 2. Clean up resulting formatting
      if (typeof cleanMsg === 'string') {
        cleanMsg = cleanMsg.replace(/\s+/g, ' ').trim();
        
        const lowerMsg = cleanMsg.toLowerCase();
        if (lowerMsg.includes("success") || lowerMsg.includes("saved") || lowerMsg.includes("sent")) {
          setType("success");
          setTitle("Success");
        } else if (lowerMsg.includes("fail") || lowerMsg.includes("error") || lowerMsg.includes("warn") || lowerMsg.includes("limit") || lowerMsg.includes("prohibited")) {
          setType("error");
          setTitle("Action Required");
        } else {
          setType("info");
          setTitle("System Notification");
        }
      }

      setMessage(cleanMsg);
      setIsOpen(true);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5">
            {type === "success" && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {type === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
            {type === "info" && <Info className="w-5 h-5 text-blue-500" />}
            <h3 className="font-semibold text-slate-900 dark:text-white tracking-wide">
              {title}
            </h3>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={() => setIsOpen(false)}
            className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
              type === 'error' 
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-sm shadow-red-500/20' 
                : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-gray-100'
            }`}
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}
