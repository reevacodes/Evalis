import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExamSubmissions, applyGraceMarks } from "../services/api";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { LayoutDashboard, BookOpen, Layers, Users, Database, Settings, HelpCircle, Bell, Search, GraduationCap } from "lucide-react";
import { formatTimeOnly } from "../utils/formatDate";
import { useTheme } from "../context/ThemeContext";


export default function InstructorSubmissions() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [submissions, setSubmissions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeStatus, setTimeStatus] = useState("expired");
  const [enrolledCount, setEnrolledCount] = useState(0);

  useEffect(() => {
    const loadLedger = async () => {
      try {
        const res = await fetchExamSubmissions(examId);
        setExamTitle(res.data.exam_title);
        setTotalMarks(res.data.total_marks);
        setSubmissions(res.data.submissions);
        setEnrolledCount(res.data.enrolled_count || 0);

        if (res.data.start_time && res.data.duration_minutes) {
          const now = new Date();
          const start = new Date(res.data.start_time);
          const end = new Date(start.getTime() + res.data.duration_minutes * 60000);
          if (now < start) setTimeStatus("scheduled");
          else if (now >= start && now <= end) setTimeStatus("active");
          else setTimeStatus("expired");
        } else {
          setTimeStatus("expired");
        }
      } catch (err) {
        console.error("Failed to load ledger", err);
      } finally {
        setLoading(false);
      }
    };

    loadLedger();
  }, [examId]);

  const handleGraceMark = async (questionId, marksToAdd) => {
    try {
      if (!window.confirm(`WARNING: You are about to blanket cascade +${marksToAdd} points mathematically across all students who encountered broken Question UUID: ${questionId}.\n\nProceed with Grace Marking?`)) return;

      const res = await applyGraceMarks(examId, { question_id: questionId, marks_to_add: marksToAdd });
      alert(`✅ Success: ${res.data.total_students_updated} specific target records successfully updated across Set loops: [${res.data.affected_sets.join(", ")}].`);

      const refresh = await fetchExamSubmissions(examId);
      setSubmissions(refresh.data.submissions);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to execute Grace Mark override sequence.");
    }
  };

  const NavItem = ({ icon: Icon, text, active }) => (
    <div className={`flex items-center gap-4 px-6 py-3 cursor-pointer border-l-2 transition-all ${active ? 'border-blue-500 text-blue-400 bg-blue-500/10' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-300'}`}>
      <Icon size={20} strokeWidth={2} className={active ? "text-blue-400" : "text-slate-500"} />
      <span className="font-semibold text-sm">{text}</span>
    </div>
  );

  // Derived KPI variables
  const totalSubmissions = submissions.length;
  const pendingReviewCount = submissions.filter(s => s.pending_manual_review).length;
  const gradingCompletePercentage = totalSubmissions > 0
    ? Math.round(((totalSubmissions - pendingReviewCount) / totalSubmissions) * 100)
    : 100;

  const filteredSubmissions = useMemo(() => {
    if (!searchTerm) return submissions;
    const term = searchTerm.toLowerCase();
    return submissions.filter(sub => {
      const email = (sub.student_email || "").toLowerCase();
      const id = (sub.student_id || "").toLowerCase();
      return email.includes(term) || id.includes(term);
    });
  }, [submissions, searchTerm]);

  // Chart 1: Timeline (Cumulative submissions)
  const timelineData = useMemo(() => {
    if (totalSubmissions === 0) return [{ name: '0m', val: 0 }, { name: '10m', val: 0 }];

    const sorted = [...submissions].sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
    let cumulative = 0;

    return sorted.map(sub => {
      cumulative++;
      const d = new Date(sub.submitted_at);
      const label = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
      return { name: label, val: cumulative };
    });
  }, [submissions, totalSubmissions]);

  // Chart 2: Score Distribution Array
  const scoreDistribution = useMemo(() => {
    let ranges = { weak: 0, mid: 0, strong: 0, excellent: 0 };
    submissions.forEach(sub => {
      const acc = sub.analytics?.accuracy || 0;
      if (acc <= 40) ranges.weak++;
      else if (acc <= 70) ranges.mid++;
      else if (acc <= 90) ranges.strong++;
      else ranges.excellent++;
    });

    if (totalSubmissions === 0) {
      return [
        { name: "0-40%", score: 5, type: "weak" },
        { name: "41-70%", score: 20, type: "mid" },
        { name: "71-90%", score: 45, type: "strong" },
        { name: "91-100%", score: 30, type: "strong" },
      ];
    }
    return [
      { name: "0-40%", score: ranges.weak, type: "weak" },
      { name: "41-70%", score: ranges.mid, type: "mid" },
      { name: "71-90%", score: ranges.strong, type: "strong" },
      { name: "91-100%", score: ranges.excellent, type: "strong" },
    ];
  }, [submissions, totalSubmissions]);

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (gradingCompletePercentage / 100) * circumference;

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center text-slate-500 dark:text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
        Aggregating Instructor Dashboard...
      </div>
    );
  }

  return (
    <div className="space-y-8">

          <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Instructor Report Dashboard</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tracking aggregate cohort analytics for <span className="text-blue-650 dark:text-blue-400 font-medium">{examTitle}</span>.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  const qid = prompt("Identify the natively generated broken Question ID (UUID):");
                  if (!qid) return;
                  const points = prompt("Specify explicit numerical Grace Override points to cascade mathematically:", "1");
                  if (!points) return;
                  handleGraceMark(qid, parseFloat(points));
                }}
                className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-full bg-indigo-50 dark:bg-indigo-600/20 border border-indigo-200 dark:border-indigo-500/30 text-indigo-600 dark:text-indigo-400 text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-600/30 transition-colors flex items-center gap-2"
              >
                ⚡ Issue Grace Override
              </button>
              <button onClick={() => navigate(-1)} className="w-full sm:w-auto justify-center px-5 py-2.5 rounded-full bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors shadow-sm">
                ← Back to Exams
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* KPI 1: Needs Grading */}
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col relative overflow-hidden group shadow-sm">
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div> Need to Grade
              </h3>
              <div className="flex items-center gap-6 mt-auto">
                <div className="relative w-20 h-20">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                    <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${gradingCompletePercentage === 100 ? 'text-emerald-500' : 'text-blue-500'} stroke-current drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] transition-all duration-1000`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-lg font-bold text-slate-900 dark:text-white">{gradingCompletePercentage}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Graded</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{totalSubmissions - pendingReviewCount}</p>
                </div>
              </div>
            </div>

            {/* KPI 2: Active Students */}
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div> Active Students
              </h3>
              <div className="space-y-4 mt-6">
                {timeStatus === "active" && (
                  <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Attempting (Live)</span>
                    <span className="text-xl font-bold text-red-655 dark:text-red-400">{Math.max(0, enrolledCount - totalSubmissions)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Submitted</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalSubmissions}</span>
                </div>
              </div>
            </div>

            {/* KPI 3: Max Payload */}
            <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 flex flex-col justify-between shadow-sm">
              <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div> Max Exam Payload
              </h3>
              <div className="flex items-end gap-5 mt-6">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Points</p>
                  <p className="text-5xl font-black text-slate-900 dark:text-white">{totalMarks}</p>
                </div>
                <div className="flex-1 h-12 flex items-end gap-1 pb-1">
                  {[40, 60, 30, 80, 50, 90, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-purple-500/20 rounded-t-sm" style={{ height: `${h}%` }}>
                      <div className="w-full bg-purple-500 rounded-t-sm" style={{ height: '3px' }}></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* CHARTS GRID */}
          {timeStatus === "expired" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

              <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6 font-sans">Exam Taken Times</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
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
                        itemStyle={{ color: '#3b82f6', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-6">Average Results Distribution</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scoreDistribution} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} horizontal={false} />
                      <XAxis type="number" stroke={isDark ? "#64748b" : "#94a3b8"} fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} tickLine={false} axisLine={false} width={80} />
                      <Tooltip
                        cursor={{ fill: isDark ? '#1e293b' : '#f8fafc', opacity: 0.4 }}
                        contentStyle={{
                          backgroundColor: isDark ? '#020617' : '#ffffff',
                          borderColor: isDark ? '#1e293b' : '#e2e8f0',
                          borderRadius: '8px',
                          color: isDark ? '#f8fafc' : '#0f172a',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }}
                      />
                      <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                        {scoreDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.type === 'strong' ? '#10b981' : entry.type === 'mid' ? '#eab308' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}


          {/* TABLE */}
          <div className="bg-white dark:bg-[#151c2c] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                {timeStatus === "active" ? (
                  <span className="flex items-center gap-2">Live Submissions Feed <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span></span>
                ) : "Browse test results"}
              </h3>
              <div className="relative w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg leading-5 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                  placeholder="Search name or ID..."
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                    <th className="px-6 py-4">Student Identity</th>
                    <th className="px-6 py-4">Total Score</th>
                    <th className="px-6 py-4">Score Analytics</th>
                    <th className="px-6 py-4">Integrity Profile</th>
                    <th className="px-6 py-4">Status & Time</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredSubmissions.length > 0 ? (
                    filteredSubmissions.map((sub, idx) => {
                      const acc = sub.analytics?.accuracy || 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer border-b border-slate-100 dark:border-slate-800/40 last:border-0">
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs border border-blue-100 dark:border-blue-500/20 uppercase">
                                {sub.student_name && sub.student_name !== "Anonymous" ? sub.student_name[0] : sub.student_email ? sub.student_email[0] : "S"}
                              </div>
                              <div>
                                <div className="text-sm font-semibold">{sub.student_name && sub.student_name !== "Anonymous" ? sub.student_name : sub.student_email || "Anonymous"}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 max-w-[150px] truncate">{sub.student_email || sub.student_id || sub._id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                              {sub.total_score ?? sub.mcq_score}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="w-32 bg-slate-100 dark:bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-200/60 dark:border-slate-800">
                              <div
                                className={`h-full ${acc > 70 ? 'bg-emerald-500' : acc > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${acc}%` }}
                              ></div>
                            </div>
                            <span className="text-[10px] mt-1 font-semibold text-slate-500 dark:text-slate-400 block">{acc}% Accuracy</span>
                          </td>
                          <td className="px-6 py-4">
                            {(() => {
                              const tabSwitches = sub.tab_switches || 0;
                              const cvViolations = sub.cv_violations || 0;
                              const totalInfractions = tabSwitches + cvViolations;

                              if (sub.is_suspended) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-red-650 dark:text-red-400 font-bold text-[10px] bg-red-50 dark:bg-red-500/20 px-2 py-1 rounded border border-red-100 dark:border-red-500/40 w-max uppercase tracking-wider">🚨 SUSPENDED</span>
                                    <span className="text-[10px] text-red-650 dark:text-red-400 mt-1 font-semibold max-w-[150px] leading-tight">{sub.suspension_reason || "Proctoring Violation"}</span>
                                  </div>
                                );
                              } else if (totalInfractions === 0) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded border border-emerald-100 dark:border-emerald-500/20 w-max">🟢 Validated</span>
                                    <span className="text-[10px] text-slate-500 mt-1 font-semibold">High Trust</span>
                                  </div>
                                );
                              } else if (totalInfractions >= 3) {
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded border border-red-100 dark:border-red-500/20 w-max">🔴 Terminated</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">{cvViolations} CV, {tabSwitches} Tabs</span>
                                  </div>
                                );
                              } else {
                                return (
                                  <div className="flex flex-col">
                                    <span className="text-orange-600 dark:text-orange-400 font-bold text-xs bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded border border-orange-100 dark:border-orange-500/20 w-max">🟠 Suspicious</span>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-semibold">{cvViolations} CV, {tabSwitches} Tabs</span>
                                  </div>
                                );
                              }
                            })()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              {sub.is_suspended 
                                ? <span className="text-red-655 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-500/10 px-2 py-1 rounded">Suspended</span>
                                : sub.pending_manual_review
                                ? <span className="text-orange-600 dark:text-orange-400 font-bold text-xs bg-orange-50 dark:bg-orange-500/10 px-2 py-1 rounded">Needs Review</span>
                                : <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded">Validated</span>
                              }
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                              {formatTimeOnly(sub.submitted_at)}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => {
                                const basePath = window.location.pathname.startsWith('/admin') ? '/admin' : '/teacher';
                                navigate(`${basePath}/exam/${examId}/submissions/${sub._id}`);
                              }}
                              className="text-blue-600 dark:text-blue-400 text-sm font-bold hover:bg-blue-500/25 transition-all flex items-center justify-center gap-1.5 w-full border border-blue-100 dark:border-blue-500/20 bg-blue-50 dark:bg-blue-500/10 px-3 py-2 rounded-xl shadow-sm"
                            >
                              Open Report <span className="text-xs">↗</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <span className="text-4xl opacity-20 mb-3">🗂️</span>
                          <p className="text-slate-500 font-medium text-sm">No submissions have been aggregated yet.</p>
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
