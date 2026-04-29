import React from "react";
import { User, Book } from "lucide-react";

export default function ExamHeader({ timeLeft, onSubmit, examDetails, studentDetails }) {
  // ⏱ Format time (HH:MM:SS)
  const formatTime = () => {
    const h = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
    const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");

    return `${h}:${m}:${s}`;
  };

  return (
    <div className="h-16 border-b border-gray-300 dark:border-slate-700 flex items-center justify-between px-8 bg-gray-50 dark:bg-slate-900 text-slate-900 dark:text-white">
      {/* LEFT: Evalis & Exam Details */}
      <div className="flex items-center gap-6">
        <span className="text-2xl font-bold tracking-wide text-blue-600 dark:text-blue-400 border-r border-gray-300 dark:border-slate-700 pr-6">Evalis</span>
        
        {examDetails && (
          <div className="hidden md:flex flex-col justify-center">
            <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{examDetails.exam_name}</span>
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium tracking-wide uppercase">
              <Book className="w-3 h-3" />
              <span>{examDetails.course_name}</span>
              {examDetails.course_code && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span>{examDetails.course_code}</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* CENTER: Student Details */}
      {studentDetails && (
        <div className="hidden lg:flex items-center gap-3 bg-white dark:bg-slate-800 px-4 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 shadow-sm">
           <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
           </div>
           <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{studentDetails.name}</span>
              <span className="text-[10px] text-slate-500 font-mono leading-tight">{studentDetails.student_id || studentDetails.email}</span>
           </div>
        </div>
      )}

      {/* RIGHT: Timer & Submit */}
      <div className="flex items-center gap-6">
        {/* TIMER */}
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-500/20">
          <span className="text-red-500 dark:text-red-400 text-xs font-bold uppercase tracking-widest">Time Left</span>
          <span className="font-mono font-bold text-red-600 dark:text-red-400 text-lg">{formatTime()}</span>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          onClick={onSubmit}
          className="bg-red-600 hover:bg-red-700 text-white transition-all px-5 py-2 rounded-lg text-sm font-bold shadow-md shadow-red-600/20"
        >
          Submit Test
        </button>
      </div>
    </div>
  );
}
