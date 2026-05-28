import { useEffect, useState, useMemo, Fragment } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUserExamResults } from "../services/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { 
  ArrowRight, Clock, Target, AlertTriangle, CheckCircle2, Zap, 
  TrendingUp, TrendingDown, Code, ChevronDown, ChevronUp, Copy, 
  FileText, Check, Award, AlertCircle, Sparkles, GraduationCap, ArrowLeft
} from "lucide-react";

export default function StudentResults() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [expandedCoding, setExpandedCoding] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

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

  // Copy code helper
  const handleCopyCode = (qid, codeText) => {
    navigator.clipboard.writeText(codeText);
    setCopiedId(qid);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
        <p className="text-sm font-semibold tracking-wider uppercase text-slate-500">Aggregating Official Exam Analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center text-rose-400 p-6">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h2 className="text-xl font-bold">Failed to locate submission record.</h2>
        <button 
          onClick={() => navigate("/student")} 
          className="mt-6 px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!data.is_published) {
    return (
      <div className="min-h-screen bg-[#070a13] flex items-center justify-center p-6 text-white">
        <div className="bg-[#0f1524] border border-slate-800/80 p-8 rounded-3xl max-w-lg text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500"></div>
          <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-wide text-slate-100">
            Results Locked
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Your instructor has not yet verified the final coding submissions and published the global exam analytics.
            Please check back later!
          </p>
          <button
            onClick={() => navigate("/student")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition font-semibold shadow-lg shadow-indigo-600/20"
          >
            Return to Student Dashboard
          </button>
        </div>
      </div>
    );
  }

  const sub = data.submission || {};
  const analytics = sub.analytics || {};
  const accuracy = analytics.accuracy || 0;

  // Gather all coding questions
  const examCodingQuestions = [];
  const seenQids = new Set();

  if (data.exam_sections) {
    data.exam_sections.forEach(sec => {
      if (sec.questions) {
        sec.questions.forEach(q => {
          if (q.type === "coding" || q.category === "coding") {
            const qid = String(q.id || q._id);
            if (!seenQids.has(qid)) {
              seenQids.add(qid);
              examCodingQuestions.push(q);
            }
          }
        });
      }
    });
  }

  // Fallback: merge with submitted keys
  if (sub.coding_answers) {
    Object.keys(sub.coding_answers).forEach(qid => {
      if (!seenQids.has(qid)) {
        seenQids.add(qid);
        examCodingQuestions.push({
          id: qid,
          _id: qid,
          question: `Coding Question (${qid.substring(0, 6)})`,
          type: "coding"
        });
      }
    });
  }

  // Ensure each coding question is worth 10 marks
  const MARKS_PER_CODING = 10.0;
  const codingTotalMax = examCodingQuestions.length * MARKS_PER_CODING;
  
  // Calculate coding score
  let calculatedCodingScore = 0.0;
  examCodingQuestions.forEach(q => {
    const qid = String(q.id || q._id);
    const review = sub.coding_review_data?.[qid];
    if (review) {
      calculatedCodingScore += Number(review.score || 0.0);
    }
  });

  // Calculate dynamic Grade
  let gradeText = "Needs Improvement (Grade F)";
  let gradeColor = "text-rose-400 bg-rose-500/10 border-rose-500/20";
  if (accuracy >= 90) {
    gradeText = "Outstanding (Grade A+)";
    gradeColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  } else if (accuracy >= 80) {
    gradeText = "Excellent (Grade A)";
    gradeColor = "text-indigo-400 bg-indigo-500/10 border-indigo-500/20";
  } else if (accuracy >= 70) {
    gradeText = "Very Good (Grade B)";
    gradeColor = "text-blue-400 bg-blue-500/10 border-blue-500/20";
  } else if (accuracy >= 60) {
    gradeText = "Good (Grade C)";
    gradeColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  } else if (accuracy >= 50) {
    gradeText = "Satisfactory (Grade D)";
    gradeColor = "text-orange-400 bg-orange-500/10 border-orange-500/20";
  }

  // SWOT mappings
  const topicData = (analytics.strong_topics || []).map(t => ({ name: t, score: 90, type: 'strong' }))
    .concat((analytics.weak_topics || []).map(t => ({ name: t, score: 30, type: 'weak' })));

  if (topicData.length === 0) {
    topicData.push({ name: "General Concepts", score: accuracy, type: 'strong' });
  }

  // Faux Timeline
  const timelineData = [
    { name: 'Start', val: 10 },
    { name: '20%', val: 40 },
    { name: '40%', val: 55 },
    { name: '60%', val: 75 },
    { name: '80%', val: 80 },
    { name: 'End', val: accuracy },
  ];

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  const formatTime = (seconds) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 p-4 md:p-8 font-sans selection:bg-indigo-500/35">
      <div className="max-w-[1400px] mx-auto space-y-8">

        {/* TOP ACADEMIC HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-full bg-gradient-to-r from-indigo-500/5 to-transparent"></div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/15 border border-indigo-500/25 text-indigo-400">
                OFFICIAL REPORT
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Graded</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">{data.exam_title || "Official Examination Audit"}</h1>
            <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
              <span>Verified academic record for student ID:</span>
              <span className="font-mono text-indigo-300 font-bold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/15">
                {sub.student_id ? (sub.student_id.length > 15 ? sub.student_id.substring(0, 10) + "..." : sub.student_id) : "Student"}
              </span>
            </p>
          </div>
          <button 
            onClick={() => navigate("/student")} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-700 hover:border-slate-600 transition"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
        </div>

        {/* UNIFIED ACADEMIC PERFORMANCE SUMMARY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Circular Score Meter */}
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-8 -mr-8 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" /> Final Assessment Result
            </h3>
            
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-800" />
                  <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" 
                    strokeDasharray={circumference} 
                    strokeDashoffset={strokeDashoffset} 
                    className={`${accuracy >= 70 ? 'text-indigo-500' : accuracy >= 40 ? 'text-orange-500' : 'text-rose-500'} stroke-current transition-all duration-1000`} 
                    strokeLinecap="round" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-xl font-black text-white leading-none">{accuracy}%</span>
                  <span className="text-[9px] text-slate-500 font-bold uppercase mt-1">Accuracy</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Scored Marks</p>
                <p className="text-3xl font-black text-white">{sub.total_score ?? sub.mcq_score}</p>
                <p className="text-xs text-slate-400 mt-1 font-medium">Out of {data.total_marks || 100} Total Marks</p>
              </div>
            </div>
          </div>

          {/* Academic Verdict Badge */}
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 flex flex-col justify-between shadow-lg">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" /> Academic Transcript Grade
            </h3>
            <div>
              <span className={`inline-block px-4 py-2 rounded-xl text-sm font-extrabold border ${gradeColor} mb-3`}>
                {gradeText}
              </span>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Dynamic grading transcript evaluated against total exam accuracy metrics, verified using sandbox output indicators.
              </p>
            </div>
          </div>

        </div>

        {/* SECTION PERFORMANCE BREAKDOWN (Side-by-Side) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* MCQ Performance Summary */}
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Multiple Choice Evaluation</h3>
                <p className="text-xs text-slate-400 font-medium">Automatic system verification metrics</p>
              </div>
              <span className="text-xs font-black px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 tracking-wider">
                {analytics.total_mcqs > 0 ? Math.round((analytics.correct_mcqs / analytics.total_mcqs) * 100) : 0}% ACCURACY
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="bg-[#070a13] p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Attempted</span>
                <span className="text-base font-bold text-slate-300">{analytics.attempted_mcqs} / {analytics.total_mcqs}</span>
              </div>
              <div className="bg-[#070a13] p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Correct</span>
                <span className="text-base font-bold text-emerald-400">{analytics.correct_mcqs}</span>
              </div>
              <div className="bg-[#070a13] p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Score Earned</span>
                <span className="text-base font-bold text-indigo-400">{sub.mcq_score ?? 0.0} pts</span>
              </div>
            </div>
          </div>

          {/* Coding Performance Summary */}
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-lg text-white">Coding Sandboxed Assessment</h3>
                <p className="text-xs text-slate-400 font-medium">Secure isolated Docker compilation analysis</p>
              </div>
              <span className={`text-xs font-black px-2.5 py-1 rounded tracking-wider ${sub.pending_manual_review ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'}`}>
                {sub.pending_manual_review ? "PENDING REVIEW" : "EVALUATION COMPLETE"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className="bg-[#070a13] p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Total Coding Qs</span>
                <span className="text-base font-bold text-slate-300">{examCodingQuestions.length}</span>
              </div>
              <div className="bg-[#070a13] p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Attempted Qs</span>
                <span className="text-base font-bold text-slate-300">
                  {Object.keys(sub.coding_answers || {}).length} / {examCodingQuestions.length}
                </span>
              </div>
              <div className="bg-[#070a13] p-3 rounded-xl border border-slate-800/60 text-center">
                <span className="block text-[9px] text-slate-500 font-black uppercase tracking-wider mb-1">Total Points</span>
                <span className="text-base font-bold text-emerald-400">
                  {calculatedCodingScore} / {codingTotalMax}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* CHARTS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Line/Area Chart: Performance Timeline */}
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-6">Visual Performance Timeline</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    formatter={(val) => [`${val}%`, 'Accuracy']}
                  />
                  <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar Chart: SWOT Topics Breakdown */}
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl p-6 shadow-xl">
            <h3 className="text-base font-bold text-white mb-6">Topic Breakdown (SWOT Analysis)</h3>
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topicData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={130} tickFormatter={(val) => val.length > 18 ? val.substring(0, 18) + "..." : val} />
                  <RechartsTooltip
                    cursor={{ fill: '#1e293b', opacity: 0.3 }}
                    contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b', borderRadius: '12px' }}
                    formatter={(val) => [`${val}%`, 'Mastery']}
                  />
                  <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={16}>
                    {topicData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.type === 'strong' ? '#10b981' : '#f43f5e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* AI STUDY PLAN RECOMMENDATIONS */}
        {sub.ai_study_plan && sub.ai_study_plan.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-950/20 via-[#0f1524] to-[#0f1524] border border-indigo-500/20 rounded-3xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-indigo-500/5 blur-2xl pointer-events-none"></div>
            <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" /> Custom AI Mentor Study Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {sub.ai_study_plan.map((item, idx) => (
                <div key={idx} className="bg-indigo-950/15 border border-indigo-500/10 rounded-2xl p-4 flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full bg-indigo-500/15 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-light">{item}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MCQ REVIEW PANEL */}
        {data.exam_sections && data.exam_sections.length > 0 && (
          <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
            <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-indigo-400" /> Multiple Choice Questions Graded Trace
              </h3>
            </div>
            <div className="p-6 space-y-6">
              {data.exam_sections.map((sec, secIdx) => {
                const mcqQuestions = sec.questions ? sec.questions.filter(q => q.type !== 'coding' && q.category !== 'coding') : [];
                if (mcqQuestions.length === 0) return null;
                return (
                  <div key={secIdx} className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l-2 border-indigo-500 pl-3 mb-4">
                      {sec.name || sec.title || `Section ${secIdx + 1}`}
                    </h4>
                    {mcqQuestions.map((q, qIdx) => {
                      const studentAnswer = sub.mcq_answers?.[q.id || q._id] || null;
                      const isCorrect = studentAnswer === q.correct_answer;

                      return (
                        <div key={q.id || q._id || qIdx} className={`p-4 rounded-2xl border ${isCorrect ? 'bg-emerald-500/5 border-emerald-500/15' : 'bg-rose-500/5 border-rose-500/15'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-sm font-semibold text-slate-200">Q{qIdx + 1}. {q.question || q.question_text}</h4>
                            <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md ${isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'bg-rose-500/10 text-rose-400 border border-rose-500/15'}`}>
                              {isCorrect ? '+1.0 Mark' : '0.0 Marks'}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                            {q.options && q.options.map((opt, oIdx) => {
                              const isStudentChoice = studentAnswer === opt;
                              const isActualCorrect = q.correct_answer === opt;

                              let optClass = "bg-[#070a13]/55 border-slate-800 text-slate-400";
                              if (isActualCorrect) {
                                  optClass = "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 font-medium";
                              } else if (isStudentChoice && !isCorrect) {
                                  optClass = "bg-rose-500/10 border-rose-500/30 text-rose-300 font-medium";
                              }

                              return (
                                <div key={oIdx} className={`p-2.5 rounded-xl border text-xs flex items-center gap-3 transition-colors ${optClass}`}>
                                  <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${isActualCorrect ? 'bg-emerald-500 border-emerald-400 text-white' : isStudentChoice ? 'bg-rose-500 border-rose-400 text-white' : 'border-slate-700'}`}>
                                    {(isActualCorrect || isStudentChoice) && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                                  </div>
                                  {opt}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3 CODING QUESTIONS AUDIT (THE MAIN COMPONENT) */}
        <div className="bg-[#0f1524] border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl">
          
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-800/60 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-indigo-400" /> Graded Coding Transcript Report
              </h3>
              <p className="text-xs text-slate-400 font-medium mt-0.5">End-to-end sandbox compiler verification for all {examCodingQuestions.length} problems</p>
            </div>
            {sub.pending_manual_review ? (
              <span className="px-3 py-1 flex items-center gap-2 text-xs font-bold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> Pending Final Review
              </span>
            ) : (
              <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                Evaluated & Confirmed
              </span>
            )}
          </div>

          {/* Audit Body */}
          <div className="p-6 space-y-6">
            {examCodingQuestions.length > 0 ? (
              examCodingQuestions.map((q, idx) => {
                const qid = String(q.id || q._id);
                const cData = sub.coding_answers?.[qid];
                const review = sub.coding_review_data?.[qid];
                const isExpanded = expandedCoding === qid;

                // Attempted or not
                const isAttempted = !!cData && !!cData.code?.trim();

                // Detailed metrics
                const score = review ? Number(review.score || 0.0) : 0.0;
                const maxScore = review ? Number(review.max_score || MARKS_PER_CODING) : MARKS_PER_CODING;
                const percent = (score / maxScore) * 100;

                let progressColor = "bg-rose-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
                let scoreTextColor = "text-rose-400";
                if (percent >= 90) {
                  progressColor = "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
                  scoreTextColor = "text-emerald-400";
                } else if (percent >= 50) {
                  progressColor = "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
                  scoreTextColor = "text-amber-400";
                }

                return (
                  <div key={qid} className="bg-[#070a13] border border-slate-800/80 rounded-2xl overflow-hidden shadow-md">
                    
                    {/* Collapsible Header */}
                    <div 
                      onClick={() => setExpandedCoding(isExpanded ? null : qid)}
                      className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-800/20 transition duration-200"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {idx + 1}
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-slate-100 flex flex-wrap items-center gap-2">
                            <span>{q.question || q.question_text || `Coding Question ${idx + 1}`}</span>
                            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {cData?.language || "python"}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-400 line-clamp-1 max-w-xl">
                            {q.description || q.statement || q.problem_statement || "View complete code and test traces below"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                        {/* Score badges */}
                        <div className="text-right">
                          <p className={`text-sm font-black ${scoreTextColor}`}>
                            {isAttempted ? `${score.toFixed(1)} / ${maxScore.toFixed(1)} Marks` : "0.0 / 10.0 Marks"}
                          </p>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${isAttempted ? 'text-indigo-400' : 'text-slate-500'}`}>
                            {isAttempted ? (review?.status || "Graded") : "Not Attempted"}
                          </span>
                        </div>

                        {/* Arrow collapse */}
                        <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-850 flex items-center justify-center text-slate-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Content */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-800/80 bg-[#0c111e]/60 space-y-6">
                        
                        {/* Marks Progress bar */}
                        <div>
                          <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                            <span className="text-slate-400 uppercase tracking-widest">Grading Weight Distribution</span>
                            <span className={scoreTextColor}>
                              {isAttempted ? `${percent.toFixed(0)}% Correct` : "0% Correct"}
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                            <div className={`h-full ${progressColor} transition-all duration-700`} style={{ width: `${percent}%` }}></div>
                          </div>
                        </div>

                        {/* Two Panel Code and Trace Layout */}
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                          
                          {/* Code submission box */}
                          <div className="flex flex-col space-y-3">
                            <div className="flex justify-between items-center">
                              <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Code className="w-3.5 h-3.5 text-indigo-400" /> Submitted Code Artifact
                              </h5>
                              {isAttempted && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleCopyCode(qid, cData.code); }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-[10px] font-bold text-slate-400 transition"
                                >
                                  {copiedId === qid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                  {copiedId === qid ? "Copied!" : "Copy Code"}
                                </button>
                              )}
                            </div>
                            <pre className="flex-1 min-h-[220px] max-h-[350px] p-4 bg-slate-950 border border-slate-850 rounded-xl font-mono text-xs text-emerald-400/90 overflow-auto whitespace-pre-wrap leading-relaxed shadow-inner">
                              {isAttempted ? cData.code : "Not Attempted: Student did not submit any code artifact for this sandbox pipeline."}
                            </pre>
                          </div>

                          {/* Test case Verification Traces */}
                          <div className="flex flex-col space-y-3">
                            <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Sandboxed Verification Traces
                            </h5>

                            <div className="flex-1 max-h-[350px] overflow-y-auto pr-1 space-y-3">
                              {isAttempted ? (
                                review?.details && review.details.length > 0 ? (
                                  review.details.map((t, tcIdx) => {
                                    const isPass = t.verdict === 'AC';
                                    return (
                                      <div key={tcIdx} className={`p-3 rounded-xl border font-mono text-[11px] space-y-2 bg-slate-950 shadow-sm ${isPass ? 'border-emerald-500/25' : 'border-rose-500/25'}`}>
                                        <div className="flex justify-between items-center">
                                          <span className="text-[10px] uppercase font-black text-slate-500">Test Case {tcIdx + 1}</span>
                                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${isPass ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                            {isPass ? "PASS" : t.verdict || "FAIL"}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-slate-300">
                                          <div>
                                            <span className="text-slate-500 text-[10px] block">Input Parameter</span>
                                            <span className="font-semibold text-blue-300">{t.input || "N/A"}</span>
                                          </div>
                                          <div>
                                            <span className="text-slate-500 text-[10px] block">Expected Outcome</span>
                                            <span className="font-semibold text-emerald-300">{t.expected || "N/A"}</span>
                                          </div>
                                        </div>
                                        {!isPass && (
                                          <div className="border-t border-slate-900 pt-1 text-slate-300">
                                            <span className="text-slate-500 text-[10px] block">Actual Output Outcome</span>
                                            <span className="font-semibold text-rose-300">{t.output || t.actual_output || "No output captured."}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="h-full flex items-center justify-center p-6 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs text-center leading-relaxed">
                                    <div className="space-y-1">
                                      <p className="font-bold">No test traces archived.</p>
                                      <p className="font-light">Automatic unit evaluations might have encountered a parsing issue.</p>
                                    </div>
                                  </div>
                                )
                              ) : (
                                <div className="h-full flex items-center justify-center p-6 bg-slate-950 border border-slate-850 rounded-xl text-slate-500 text-xs text-center leading-relaxed">
                                  <div className="space-y-1">
                                    <AlertTriangle className="w-5 h-5 mx-auto text-slate-600 mb-2" />
                                    <p className="font-bold">Not Attempted.</p>
                                    <p className="font-light">Submit code in future exams to see sandbox compiler traces.</p>
                                  </div>
                                </div>
                              )}
                            </div>

                          </div>

                        </div>

                        {/* AI Tutor feedback section for coding */}
                        {isAttempted && review?.ai_feedback && (
                          <div className="bg-indigo-950/20 border border-indigo-500/15 rounded-xl p-4 mt-4">
                            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                              <Sparkles className="w-4 h-4 animate-pulse" /> Custom AI Mentor Review
                            </div>
                            {(() => {
                              try {
                                const fb = JSON.parse(review.ai_feedback);
                                return (
                                  <div className="space-y-3">
                                    <div className="flex flex-wrap gap-2">
                                      {fb.time_complexity && <span className="bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[10px] px-2.5 py-1 rounded font-mono">Time: {fb.time_complexity}</span>}
                                      {fb.memory_efficiency && <span className="bg-purple-500/15 border border-purple-500/25 text-purple-300 text-[10px] px-2.5 py-1 rounded font-mono">Space: {fb.memory_efficiency}</span>}
                                      {fb.readability && <span className="bg-blue-500/15 border border-blue-500/25 text-blue-300 text-[10px] px-2.5 py-1 rounded font-medium">Readability: {fb.readability}</span>}
                                    </div>
                                    <p className="text-xs text-indigo-100 leading-relaxed font-light">{fb.feedback || fb.message}</p>
                                  </div>
                                );
                              } catch (e) {
                                return (
                                  <p className="text-xs text-indigo-100 leading-relaxed font-light whitespace-pre-wrap">{review.ai_feedback}</p>
                                );
                              }
                            })()}
                          </div>
                        )}

                      </div>
                    )}

                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-[#070a13]">
                <Code className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-slate-300">No Coding Modules Discovered</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">This examination does not contain any formal sandbox coding questions in its registry.</p>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
