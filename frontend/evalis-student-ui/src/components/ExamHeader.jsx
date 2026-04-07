import React from "react";

export default function ExamHeader({ timeLeft, onSubmit }) {
  // ⏱ Format time (HH:MM:SS)
  const formatTime = () => {
    const h = String(Math.floor(timeLeft / 3600)).padStart(2, "0");
    const m = String(Math.floor((timeLeft % 3600) / 60)).padStart(2, "0");
    const s = String(timeLeft % 60).padStart(2, "0");

    return `${h}:${m}:${s}`;
  };

  return (
    <div className="h-16 border-b border-slate-700 flex items-center justify-between px-8 bg-slate-900 text-white">
      {/* LEFT */}
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold tracking-wide">Evalis</span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6">
        {/* TIMER */}
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Time Left</span>
          <span className="font-bold text-red-400 text-lg">{formatTime()}</span>
        </div>

        {/* SUBMIT BUTTON */}
        <button
          onClick={onSubmit}
          className="bg-red-500 hover:bg-red-600 transition px-4 py-2 rounded-lg text-sm font-semibold"
        >
          Submit Test
        </button>
      </div>
    </div>
  );
}
