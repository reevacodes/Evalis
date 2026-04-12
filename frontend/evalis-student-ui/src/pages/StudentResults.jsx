import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUserExamResults } from "../services/api";

export default function StudentResults() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const res = await fetchUserExamResults(examId);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load results", err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Extracting Performance Analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
        Failed to locate submission record.
      </div>
    );
  }

  // =====================
  // 🔒 LOCKED STATE
  // =====================
  if (!data.is_published) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl md:w-[500px] text-center shadow-xl">
          <div className="w-20 h-20 bg-blue-500/10 text-blue-400 border-2 border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-wide">
            Results Locked
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Your instructor has not yet verified the final coding submissions and pushed the global analytics graph. 
            Check back later!
          </p>
          <button
            onClick={() => navigate("/student")}
            className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 py-3 rounded-xl transition font-medium border border-slate-700"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // =====================
  // 📊 UNLOCKED STATE
  // =====================
  const sub = data.submission;
  const analytics = sub.analytics || {};
  const accuracy = analytics.accuracy || 0;
  
  // Radial Circle Math
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* 🔥 HEADER */}
        <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 border-b border-slate-800 pb-6">
          <div>
            <button 
              onClick={() => navigate("/student")}
              className="text-sm font-semibold text-blue-400 hover:text-blue-300 mb-2 flex items-center gap-1 transition-colors"
            >
              ← Back to Dashboard
            </button>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-100">
              Performance Analytics
            </h1>
            <p className="text-slate-400 mt-1 font-medium">
              Deep dive into your attempt for <span className="text-blue-400">{data.exam_title}</span>
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl shrink-0">
            <span className="block text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">
              Raw MCQ Auto-Score
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {sub.mcq_score} <span className="text-slate-600 text-lg">/ {data.total_marks || "?"}</span>
            </span>
          </div>
        </div>

        {/* 🔥 TOP METRICS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* ACCURACY RADIAL */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex items-center justify-center relative md:col-span-1 shadow-lg overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition duration-500"></div>
            <div className="relative w-32 h-32">
              {/* Background Track */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  className="text-slate-800"
                />
                {/* Foreground Track */}
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="10"
                  fill="transparent"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={`${accuracy > 75 ? "text-emerald-500" : accuracy > 40 ? "text-yellow-500" : "text-red-500"} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-black">{accuracy}%</span>
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Accuracy</span>
              </div>
            </div>
          </div>

          {/* QUICK STATS */}
          <div className="grid grid-rows-3 gap-4 md:col-span-1">
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-400">Attempted</span>
                <span className="text-xl font-bold">{analytics.attempted_mcqs} / {analytics.total_mcqs}</span>
             </div>
             <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-emerald-400/80">Correct</span>
                <span className="text-xl font-bold text-emerald-400">{analytics.correct_mcqs}</span>
             </div>
             <div className="bg-red-900/10 border border-red-500/20 rounded-2xl p-4 flex items-center justify-between">
                <span className="text-sm font-medium text-red-400/80">Incorrect</span>
                <span className="text-xl font-bold text-red-400">
                  {analytics.attempted_mcqs - analytics.correct_mcqs}
                </span>
             </div>
          </div>

          {/* SWOT ANALYSIS */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:col-span-2 shadow-lg flex flex-col">
             <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-6">Topic Insight (SWOT)</h3>
             
             <div className="grid grid-cols-2 gap-6 flex-1">
                {/* STRONG */}
                <div>
                   <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                     <span className="p-1 bg-emerald-500/20 rounded">🚀</span> Strong Topics
                   </h4>
                   {analytics.strong_topics?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analytics.strong_topics.map(t => (
                          <span key={t} className="px-3 py-1 bg-slate-800 border border-emerald-500/30 text-slate-200 text-xs rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                   ) : (
                     <p className="text-slate-600 text-sm mt-3 italic">No significantly strong topics detected.</p>
                   )}
                </div>

                {/* WEAK */}
                <div>
                   <h4 className="text-red-400 font-semibold mb-3 flex items-center gap-2">
                     <span className="p-1 bg-red-500/20 rounded">⚠️</span> Needs Review
                   </h4>
                   {analytics.weak_topics?.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {analytics.weak_topics.map(t => (
                          <span key={t} className="px-3 py-1 bg-slate-800 border border-red-500/30 text-slate-200 text-xs rounded-full">
                            {t}
                          </span>
                        ))}
                      </div>
                   ) : (
                     <p className="text-slate-600 text-sm mt-3 italic">Excellent, no weak topics detected!</p>
                   )}
                </div>
             </div>
          </div>

        </div>
        
        {/* CODING SECTION STATUS */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white tracking-wide">Coding Sandboxes</h3>
              {sub.pending_manual_review ? (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 animate-pulse">
                  Pending Manual Evaluation
                </span>
              ) : (
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Evaluated
                </span>
              )}
           </div>

           {Object.keys(sub.coding_answers || {}).length > 0 ? (
             <div className="grid gap-4">
               {Object.entries(sub.coding_answers).map(([key, data], idx) => (
                 <div key={key} className="bg-slate-950 border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 text-sm font-semibold uppercase tracking-wider block mb-1">
                        Question {idx + 1}
                      </span>
                      <span className="text-white font-mono text-sm bg-slate-800 px-2 py-0.5 rounded">
                        {data.language || "python"}
                      </span>
                    </div>
                    <span className="text-slate-500 text-sm italic">
                      Code snippet successfully stored
                    </span>
                 </div>
               ))}
             </div>
           ) : (
             <p className="text-center text-slate-500 py-6 italic">No coding submissions detected in this exam.</p>
           )}
        </div>

      </div>
    </div>
  );
}
