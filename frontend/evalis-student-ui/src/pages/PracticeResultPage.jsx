import { useEffect, useState, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BarChart2, Clock, RotateCcw, Target, AlertTriangle, CheckCircle2, Zap, TrendingUp, TrendingDown, Flame, Code, ChevronDown, ChevronUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { getPracticeHistory } from "../services/api";

export default function PracticeResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { examId } = useParams();
  
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [codingExpanded, setCodingExpanded] = useState(false);

  const result = location.state;

  useEffect(() => {
    async function fetchHistory() {
      try {
        const data = await getPracticeHistory();
        setHistory(data || []);
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setLoadingHistory(false);
      }
    }
    if (result) fetchHistory();
  }, [result]);

  if (!result) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold mb-4">No Practice Results Found</h2>
        <button 
            onClick={() => navigate("/student")} 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold transition-all"
        >
            Return to Dashboard
        </button>
      </div>
    );
  }

  const { score, analytics, coding_results } = result;

  // Streak & Trend Logic
  const trendData = useMemo(() => {
    // Reverse to chronological order for charts
    const sorted = [...history].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return sorted.map((h, i) => ({
      name: `Attempt ${i + 1}`,
      accuracy: h.analytics?.accuracy ?? (h.score * 10), // Fallback if old data has no analytics
      date: new Date(h.created_at).toLocaleDateString()
    }));
  }, [history]);

  let improvementMessage = "Establishing baseline";
  let improvementValue = null;
  let isImproving = true;
  let isWarning = false;

  if (trendData.length > 1) {
    const current = trendData[trendData.length - 1].accuracy;
    const previous = trendData[trendData.length - 2].accuracy;
    const diff = Math.round(current - previous);
    if (diff > 0) {
      if (current < 40) {
         improvementMessage = `+${diff}% accuracy, but overall score is still critical.`;
         improvementValue = `+${diff}%`;
         isImproving = true;
         isWarning = true;
      } else {
         improvementMessage = `You're improving! +${diff}% accuracy from last test 🚀`;
         improvementValue = `+${diff}%`;
         isImproving = true;
      }
    } else if (diff < 0) {
      improvementMessage = `Slight dip. ${diff}% accuracy from last test. Keep pushing!`;
      improvementValue = `${diff}%`;
      isImproving = false;
    } else {
      if (current < 40) {
         improvementMessage = "Consistently low score. Please review the material.";
         isWarning = true;
      } else {
         improvementMessage = "Consistent performance! Try to beat this next time.";
      }
      improvementValue = "0%";
      isImproving = true;
    }
  } else if (trendData.length === 1) {
    if (analytics.accuracy < 40) {
       improvementMessage = "Below passing threshold. Needs review.";
       isWarning = true;
    } else {
       improvementMessage = "Great start! Let's see your growth on the next attempt.";
    }
  }
  
  let headerTitle = "Mission Accomplished";
  if (analytics.accuracy < 40) {
    headerTitle = "Needs Serious Review";
  } else if (analytics.accuracy < 70) {
    headerTitle = "Practice Completed";
  }



  const formatTime = (seconds) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#0A0A0E] text-slate-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* TOP UNIFIED PERFORMANCE STRIP */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-purple-600/5 to-transparent pointer-events-none"></div>
          
          <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-6 z-10 w-full lg:w-auto">
            <div className="relative shrink-0">
               <svg className="w-24 h-24 transform -rotate-90">
                  <circle cx="48" cy="48" r="40" className="stroke-slate-800" strokeWidth="8" fill="none" />
                  <circle cx="48" cy="48" r="40" className="stroke-indigo-500" strokeWidth="8" fill="none" strokeDasharray="251" strokeDashoffset={251 - (251 * Math.min(score, 100)) / 100} strokeLinecap="round" />
               </svg>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-white leading-none">{score}</span>
               </div>
            </div>
            
            <div>
               <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">{headerTitle}</h1>
               <div className="flex flex-wrap justify-center sm:justify-start items-center gap-3 text-sm font-semibold">
                  {improvementValue && (
                     <span className={`flex items-center gap-1 px-3 py-1.5 rounded-full ${isWarning || !isImproving ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {isImproving ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {improvementMessage}
                     </span>
                  )}

               </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap justify-center gap-4 z-10 w-full lg:w-auto">
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 min-w-[150px] shadow-inner">
               <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400"><Clock className="w-5 h-5"/></div>
               <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Duration</p>
                  <p className="text-xl font-black text-white">{formatTime(analytics.time_spent_total)}</p>
               </div>
            </div>
            <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4 flex items-center gap-4 min-w-[150px] shadow-inner">
               <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400"><Target className="w-5 h-5"/></div>
               <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Accuracy</p>
                  <p className="text-xl font-black text-white">{analytics.accuracy}%</p>
               </div>
            </div>
          </div>
        </div>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT CONTENT (8 Cols) */}
          <div className="lg:col-span-8 space-y-6">
             
             {/* TREND CHART */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-5 h-5 text-indigo-400" /> Performance Trend
                   </h2>
                   <div className="flex gap-2">
                      <span className="text-xs font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full">All Time</span>
                   </div>
                </div>
                
                {loadingHistory ? (
                   <div className="h-64 flex items-center justify-center text-slate-500">Loading history...</div>
                ) : trendData.length > 0 ? (
                   <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={trendData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} tickMargin={10} />
                            <YAxis domain={[0, 100]} tickFormatter={(val) => `${val}%`} stroke="#475569" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#64748b'}} />
                            <RechartsTooltip 
                               contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)' }}
                               itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                               formatter={(value) => [`${value}%`, 'Accuracy']}
                            />
                            <Line type="monotone" dataKey="accuracy" stroke="#818cf8" strokeWidth={4} dot={{ r: 5, fill: '#0f172a', strokeWidth: 3, stroke: '#818cf8' }} activeDot={{ r: 8, fill: '#818cf8', stroke: '#fff' }} />
                         </LineChart>
                      </ResponsiveContainer>
                   </div>
                ) : (
                   <div className="h-64 flex items-center justify-center text-slate-500 font-medium">Complete more practice tests to unlock trend data!</div>
                )}
             </div>

             {/* SECTION PERFORMANCE BLOCK */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                   <Target className="w-5 h-5 text-indigo-400" /> Section Performance
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* MCQ Section */}
                   <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                         <span className="font-bold text-lg text-white">Multiple Choice</span>
                         <span className="text-xs uppercase tracking-widest font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {analytics.accuracy}% Acc
                         </span>
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Attempted</span>
                            <span className="font-bold text-slate-300">{analytics.attempted_mcqs} / {analytics.total_mcqs}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Correct</span>
                            <span className="font-bold text-emerald-400">{analytics.correct_mcqs}</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Time Elapsed</span>
                            <span className="font-bold text-slate-300">{formatTime(analytics.time_spent_mcq)}</span>
                         </div>
                      </div>
                   </div>
                   
                   {/* Coding Section */}
                   <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                         <span className="font-bold text-lg text-white">Coding Assessment</span>
                         <span className="text-xs uppercase tracking-widest font-black text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                            {coding_results?.status === 'pending_manual_review_or_execution' ? 'Processing' : 'Evaluated'}
                         </span>
                      </div>
                      <div className="space-y-3">
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Status</span>
                            <span className="font-bold text-slate-300">Background Queue</span>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                            <span className="text-slate-500 font-medium">Time Elapsed</span>
                            <span className="font-bold text-slate-300">{formatTime(analytics.time_spent_coding)}</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* TOPIC MASTERY SKILL BARS */}
             <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-lg">
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                   <Target className="w-5 h-5 text-purple-400" /> Topic Mastery Breakdown
                </h2>
                <div className="space-y-6">
                   {analytics.topic_breakdown && Object.entries(analytics.topic_breakdown).map(([topic, stat]) => {
                      const rate = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                      let status = "Weak";
                      let colorClass = "bg-rose-500";
                      let textClass = "text-rose-400";
                      let glowClass = "shadow-[0_0_15px_rgba(244,63,94,0.4)]";
                      
                      if (rate >= 70) {
                         status = "Strong";
                         colorClass = "bg-emerald-500";
                         textClass = "text-emerald-400";
                         glowClass = "";
                      } else if (rate >= 40) {
                         status = "Average";
                         colorClass = "bg-amber-500";
                         textClass = "text-amber-400";
                         glowClass = "";
                      }

                      return (
                         <div key={topic} className="group">
                            <div className="flex justify-between items-end mb-2">
                               <div>
                                  <span className="font-bold text-white text-lg block mb-1">{topic}</span>
                                  <div className="flex flex-wrap gap-2 text-xs font-medium">
                                     <span className="bg-slate-800/50 text-slate-300 px-2 py-0.5 rounded border border-slate-700/50">Score: {stat.correct}</span>
                                     <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">Correct: {stat.correct}</span>
                                     <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded border border-rose-500/20">Wrong: {stat.total - stat.correct}</span>
                                  </div>
                               </div>
                               <div className="text-right shrink-0 ml-4">
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${textClass} mb-1 block`}>{status}</span>
                                  <span className="font-black text-white text-lg leading-none block">{rate}% <span className="text-xs text-slate-500 font-medium">Acc</span></span>
                               </div>
                            </div>
                            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/50 mt-3">
                               <div 
                                  className={`h-full rounded-full ${colorClass} ${glowClass} transition-all duration-1000`} 
                                  style={{ width: `${rate}%` }}
                               ></div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>

          </div>

          {/* RIGHT CONTENT (4 Cols) - ACTION PLAN CENTERPIECE */}
          <div className="lg:col-span-4 space-y-6">
             <div className="bg-gradient-to-b from-slate-900 to-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 h-full shadow-2xl relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[80px] pointer-events-none rounded-full"></div>
                
                <div className="relative z-10">
                   <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-2">
                      <Zap className="w-6 h-6 text-rose-400" /> Action Plan
                   </h2>
                   <p className="text-sm text-slate-400 mb-8 font-medium">Targeted recommendations based on your performance.</p>

                   {analytics.weak_topics && analytics.weak_topics.length > 0 ? (
                      <div className="flex-1 flex flex-col gap-4">
                         {analytics.weak_topics.map((topic, idx) => (
                            <div key={topic} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex gap-4 items-start hover:border-slate-700 hover:shadow-lg transition-all group">
                               <div className="mt-0.5 w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-rose-500 group-hover:text-white transition-colors">
                                  {idx + 1}
                               </div>
                               <div className="flex-1">
                                  <div className="flex justify-between items-start mb-1.5">
                                     <span className="font-bold text-slate-200">{topic}</span>
                                     <span className="text-[9px] uppercase tracking-wider font-black text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">High Priority</span>
                                  </div>
                                  <p className="text-xs text-slate-500 mb-0 font-medium">Critical concept review required.</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-10 bg-slate-950 rounded-2xl border border-slate-800">
                         <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                         </div>
                         <h3 className="text-lg font-bold text-emerald-400 mb-1">Flawless Run</h3>
                         <p className="text-sm text-slate-400 font-medium">No immediate weak points detected.</p>
                      </div>
                   )}

                   <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
                      <button onClick={() => navigate(`/student/practice/${examId}`)} className="w-full py-4 bg-white hover:bg-slate-200 text-black rounded-xl font-black transition-all flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                         Practice Now <RotateCcw className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate("/student")} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex justify-center items-center gap-2 border border-slate-700/50">
                         Return to Dashboard
                      </button>
                   </div>
                </div>
             </div>
          </div>
          
        </div>

        {/* CODING LOG ACCORDION */}
        {coding_results && Object.keys(coding_results).length > 0 && (
           <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden transition-all duration-300 shadow-lg">
              <button 
                 onClick={() => setCodingExpanded(!codingExpanded)}
                 className="w-full p-6 md:p-8 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
              >
                 <div className="flex items-center gap-5">
                    <div className="p-3 bg-pink-500/10 rounded-2xl border border-pink-500/20 text-pink-400">
                       <Code className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                       <h2 className="text-xl font-bold text-white mb-1">Coding Execution Log</h2>
                       <p className="text-sm text-slate-400 font-medium">
                          {coding_results.status === 'pending_manual_review_or_execution' 
                             ? "Submissions secured. Unit tests queued in background." 
                             : "Execution completed. Click to view trace."}
                       </p>
                    </div>
                 </div>
                 <div className="text-slate-500 bg-slate-950 p-2.5 rounded-full border border-slate-800 group-hover:text-white transition-colors">
                    {codingExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                 </div>
              </button>
              
              {codingExpanded && (
                 <div className="p-6 md:p-8 pt-0 border-t border-slate-800 mt-4 mx-4 mb-4">
                    <div className="bg-[#050505] p-6 rounded-2xl border border-slate-800 text-sm font-mono text-slate-400 overflow-x-auto shadow-inner">
                       {coding_results.status === 'pending_manual_review_or_execution' ? (
                          <div className="flex flex-col gap-3">
                             <div className="flex items-center gap-2 text-emerald-400">
                                <CheckCircle2 className="w-4 h-4"/> <span>[SYSTEM] Submissions successfully captured.</span>
                             </div>
                             <div className="flex items-center gap-2 text-blue-400">
                                <span className="font-bold text-lg leading-none mr-1">ℹ</span> <span>[INFO] Placed in background queue for practice environment evaluation.</span>
                             </div>
                             <div className="flex items-center gap-2 text-slate-500 animate-pulse">
                                <span>▶</span> <span>Awaiting container assignment...</span>
                             </div>
                          </div>
                       ) : (
                          <pre>{JSON.stringify(coding_results, null, 2)}</pre>
                       )}
                    </div>
                 </div>
              )}
           </div>
        )}

      </div>
    </div>
  );
}
