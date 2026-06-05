import { useEffect, useState, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchSubmissionDetail } from "../services/api";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { LayoutDashboard, BookOpen, Layers, Users, Database, Settings, HelpCircle, Bell, Search, GraduationCap } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function InstructorStudentResult() {
  const { submissionId, examId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedCoding, setExpandedCoding] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const res = await fetchSubmissionDetail(submissionId);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load results", err);
      } finally {
        setLoading(false);
      }
    };

    if (submissionId) loadResults();
  }, [submissionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
         Aggregating Performance Analytics...
      </div>
    );
  }

  if (!data || !data.submission) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center text-red-400">
        Failed to locate submission record.
      </div>
    );
  }

  const sub = data.submission;
  const analytics = sub.analytics || {};
  const accuracy = analytics.accuracy || 0;
  
  // Custom Data Mappings for Charts
  const topicData = (analytics.strong_topics || []).map(t => ({ name: t, score: 90, type: 'strong' }))
    .concat((analytics.weak_topics || []).map(t => ({ name: t, score: 30, type: 'weak' })));
    
  if (topicData.length === 0) {
    topicData.push({ name: "General Knowledge", score: accuracy, type: 'strong' });
  }

  const timeData = [
    { name: 'MCQ', time: Math.round((sub.time_spent_mcq || 0) / 60) },
    { name: 'Coding', time: Math.round((sub.time_spent_coding || 0) / 60) }
  ].filter(d => d.time > 0);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  const NavItem = ({ icon: Icon, text, active }) => (
    <div className={`flex items-center gap-4 px-6 py-3 cursor-pointer border-l-2 transition-all ${active ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}>
      <Icon size={20} strokeWidth={2} className={active ? "text-indigo-400" : "text-slate-500"}/>
      <span className="font-semibold text-sm">{text}</span>
    </div>
  );

  return (
    <div className="space-y-8">
          
          <div className="mb-8 flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Performance Analytics</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Deep dive into the attempt for <span className="text-indigo-650 dark:text-indigo-400 font-medium">{data.exam_title}</span>.</p>
             </div>
             <button onClick={() => navigate(-1)} className="px-5 py-2.5 rounded-full bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-sm">
               ← Back
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* KPI 1: Accuracy */}
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group shadow-sm">
               <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
               <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> System Accuracy</h3>
               <div className="flex items-center gap-6 mt-auto">
                 <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                      <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${accuracy >= 70 ? 'text-indigo-500' : accuracy >= 40 ? 'text-orange-500' : 'text-red-500'} stroke-current drop-shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-all duration-1000`} strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xl font-bold text-slate-900 dark:text-white">{accuracy}%</span>
                    </div>
                 </div>
                 <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Score</p>
                   <p className="text-3xl font-black text-slate-900 dark:text-white">{sub.total_score ?? sub.mcq_score}</p>
                 </div>
               </div>
            </div>

            {/* KPI 2: MCQs */}
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
               <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> MCQ Interactions</h3>
               <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total Valid Output</span>
                    <span className="text-lg font-bold text-emerald-655 dark:text-emerald-400">{analytics.correct_mcqs}</span>
                  </div>
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Attempted</span>
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-200">{analytics.attempted_mcqs} / {analytics.total_mcqs}</span>
                  </div>
               </div>
            </div>

            {/* KPI 3: Coding */}
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
               <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Coding Submissions</h3>
               <div className="flex items-end gap-5 mt-6">
                 <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Recorded</p>
                   <p className="text-4xl font-black text-slate-900 dark:text-white">{Object.keys(sub.coding_answers || {}).length}</p>
                 </div>
                 <div className="flex-1 h-12 flex items-end gap-1 pb-1">
                   {Object.values(sub.coding_review_data || {}).length > 0 ? Object.values(sub.coding_review_data).map((c, i) => {
                     const height = c.max_score ? (c.score / c.max_score) * 100 : 0;
                     return (
                       <div key={i} className="flex-1 bg-orange-500/20 rounded-t-sm relative group" style={{ height: `${Math.max(height, 5)}%` }}>
                         <div className="w-full bg-orange-500 rounded-t-sm" style={{ height: '3px' }}></div>
                         <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 z-10 pointer-events-none whitespace-nowrap">
                            {c.score}/{c.max_score}
                          </div>
                       </div>
                     );
                   }) : (
                     <div className="w-full text-center text-slate-500 dark:text-slate-400 text-xs mt-4">No coding scores recorded</div>
                   )}
                 </div>
               </div>
            </div>
          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6">Time Allocation (Minutes)</h3>
              <div className="flex-1 w-full flex items-center justify-center">
                {timeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={timeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} vertical={false} />
                      <XAxis dataKey="name" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: isDark ? '#020617' : '#ffffff',
                          borderColor: isDark ? '#1e293b' : '#e2e8f0',
                          borderRadius: '8px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }} 
                        itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                        cursor={{fill: isDark ? '#1e293b' : '#f8fafc', opacity: 0.4}}
                      />
                      <Bar dataKey="time" radius={[4, 4, 0, 0]} barSize={40}>
                        {timeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.name === 'MCQ' ? '#10b981' : '#f97316'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-slate-550 dark:text-slate-400 text-sm">No time tracking data available.</div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6">Topic Breakdown (SWOT)</h3>
              <div className="flex-1 w-full overflow-y-auto space-y-6">
                <div>
                   <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-3">Strengths</h4>
                   <div className="flex flex-wrap gap-2">
                      {(analytics.strong_topics || []).length > 0 ? analytics.strong_topics.map((t, i) => (
                         <span key={i} className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-full text-xs font-medium">{t}</span>
                      )) : <span className="text-slate-500 dark:text-slate-400 text-xs">Insufficient data</span>}
                   </div>
                </div>
                <div>
                   <h4 className="text-xs font-bold text-red-650 dark:text-red-400 uppercase tracking-widest mb-3">Weaknesses</h4>
                   <div className="flex flex-wrap gap-2">
                      {(analytics.weak_topics || []).length > 0 ? analytics.weak_topics.map((t, i) => (
                         <span key={i} className="px-3 py-1 bg-red-50 dark:bg-red-500/10 text-red-650 dark:text-red-400 border border-red-100 dark:border-red-500/20 rounded-full text-xs font-medium">{t}</span>
                      )) : <span className="text-slate-500 dark:text-slate-400 text-xs">Insufficient data</span>}
                   </div>
                </div>
              </div>
            </div>

          </div>

          {/* MCQ REVIEW SECTION */}
          {data.exam_sections && data.exam_sections.length > 0 && (
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm mb-8">
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">MCQ Evaluation Review</h3>
              </div>
              <div className="p-6 space-y-6">
                {data.exam_sections.map((sec, secIdx) => (
                  <div key={secIdx} className="space-y-4">
                    {sec.questions && sec.questions.filter(q => q.type !== 'coding').map((q, qIdx) => {
                      const studentAnswer = sub.mcq_answers?.[q.id || q._id] || null;
                      const isCorrect = studentAnswer === q.correct_answer;

                      return (
                        <div key={q.id || q._id || qIdx} className={`p-4 rounded-xl border ${isCorrect ? 'bg-emerald-50 dark:bg-emerald-500/5 border-emerald-100 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/5 border-red-100 dark:border-red-500/20'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Q{qIdx + 1}. {q.question || q.question_text}</h4>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${isCorrect ? 'bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                              {isCorrect ? '+1 Mark' : '0 Marks'}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            {q.options && q.options.map((opt, oIdx) => {
                              const isStudentChoice = studentAnswer === opt;
                              const isActualCorrect = q.correct_answer === opt;

                              let optClass = "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400";
                              if (isActualCorrect) {
                                optClass = "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
                              } else if (isStudentChoice && !isCorrect) {
                                optClass = "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300";
                              }

                              return (
                                <div key={oIdx} className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${optClass}`}>
                                  <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${isActualCorrect ? 'bg-emerald-500 border-emerald-400' : isStudentChoice ? 'bg-red-500 border-red-400' : 'border-slate-300 dark:border-slate-600'}`}></div>
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TABLE */}
          <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
             <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Coding Solutions Report</h3>
                {sub.pending_manual_review ? (
                   <span className="px-3 py-1 flex items-center gap-2 text-xs font-bold rounded-full bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span> Pending Review
                   </span>
                ) : (
                   <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                     Evaluated
                   </span>
                )}
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-slate-50/80 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                     <th className="px-6 py-4">Question Vector</th>
                     <th className="px-6 py-4">Language Stack</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                   {Object.keys(sub.coding_answers || {}).length > 0 ? (
                      Object.entries(sub.coding_answers).map(([key, cData], idx) => {
                        const qInfo = data.exam_sections?.flatMap(s => s.questions).find(q => q.id === key || q._id === key) || {};
                        const isExpanded = expandedCoding === key;

                        return (
                          <Fragment key={key}>
                            <tr
                              onClick={() => setExpandedCoding(isExpanded ? null : key)}
                              className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                            >
                              <td className="px-6 py-4">
                                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-100 dark:border-indigo-500/20">
                                    {idx + 1}
                                  </div>
                                  <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{qInfo.question || qInfo.question_text || `Question Vector ${idx + 1}`}</span>
                                    <span className="text-[10px] text-slate-500 font-normal truncate max-w-[200px]">{qInfo.description || qInfo.statement || qInfo.problem_statement}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                                  {cData.language || "python"}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Code Stored
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button className="text-indigo-650 dark:text-indigo-400 text-sm font-semibold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                                  {isExpanded ? "Hide Code ↑" : "Review Code →"}
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/50 dark:bg-black/20">
                                <td colSpan="4" className="px-6 py-4">
                                  <div className="bg-slate-900 dark:bg-[#0f172a] rounded-xl border border-slate-800 dark:border-white/5 p-4">
                                    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Your Submitted Code</h4>
                                    <pre className="text-sm text-emerald-450 dark:text-emerald-350 font-mono whitespace-pre-wrap bg-slate-955 dark:bg-black/40 p-4 rounded-lg overflow-x-auto border border-slate-800 dark:border-white/5">
                                      {cData.code || "No code provided."}
                                    </pre>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })
                   ) : (
                     <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                           <div className="flex flex-col items-center">
                              <span className="text-4xl opacity-20 mb-3">💻</span>
                              <p className="text-slate-500 font-medium text-sm">No coding submissions detected in this pipeline.</p>
                           </div>
                        </td>
                     </tr>
                   )}
                 </tbody>
              </table>
            </div>
          </div>
    </div>
  );
}
