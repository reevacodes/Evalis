import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FolderOpen, BookOpen, Clock, ChevronRight, ChevronDown, CheckCircle, BarChart2, Calendar, Target, PlayCircle, Trophy, Zap, Sparkles, Activity } from "lucide-react";
import API, { getPastPapers, fetchCurriculum, getPracticeHistory } from "../services/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/Navbar";
import RescheduleModal from "../components/RescheduleModal";
import MockTestGenerator from "../components/MockTestGenerator";
import { formatDateOnly, formatTimeOnly } from "../utils/formatDate";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("live"); // 'live' | 'practice' | 'history'
  const [mockTab, setMockTab] = useState("curriculum"); // 'curriculum' | 'topic'
  const [exams, setExams] = useState([]);
  const [pastPapers, setPastPapers] = useState([]);
  const [practiceHistory, setPracticeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPractice, setLoadingPractice] = useState(false);
  
  // Accordion Controller States
  const [expandedNodes, setExpandedNodes] = useState({});
  const toggleNode = (nodeId) => setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));

  const [selectedExam, setSelectedExam] = useState(null); // 🔥 for modal
  const [rescheduleData, setRescheduleData] = useState({ isOpen: false, examId: null });
  const navigate = useNavigate();

  const stats = {
    total: exams.length,
    active: exams.filter((e) => e.time_status === "active" && !e.has_submitted).length,
    upcoming: exams.filter((e) => e.time_status === "scheduled" && !e.has_submitted).length,
    completed: exams.filter((e) => e.time_status === "expired" || e.has_submitted).length,
  };

  const totalAccuracy = practiceHistory.reduce((acc, attempt) => acc + (attempt.analytics?.accuracy || 0), 0);
  const averageAccuracy = practiceHistory.length > 0 ? (totalAccuracy / practiceHistory.length).toFixed(1) : 0;

  // =========================
  // TIME STATUS HELPER
  // =========================
  // const getTimeStatus = (exam) => {
  //   if (!exam.start_time) return "scheduled";

  //   const now = new Date();
  //   const start = new Date(exam.start_time);
  //   const end = new Date(start.getTime() + exam.duration_minutes * 60000);

  //   if (now < start) return "scheduled";
  //   if (now >= start && now <= end) return "active";
  //   return "expired";
  // };

  // =========================
  // FETCH EXAMS
  // =========================
  const fetchExams = async () => {
    try {
      const res = await API.get("/exam/");
      const allExams = res.data.exams || [];

      const published = allExams.filter((exam) => exam.status === "published");

      setExams(published);
    } catch (err) {
      console.error("ERROR:", err.response?.data);
      alert(err.response?.data?.detail || "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  const fetchPracticePapers = async () => {
    setLoadingPractice(true);
    try {
      const [resPapers, resHistory] = await Promise.all([
        getPastPapers(),
        getPracticeHistory()
      ]);
      setPastPapers(resPapers.data || []);
      setPracticeHistory(resHistory || []);
    } catch (err) {
      console.error("Failed to fetch practice data", err);
    } finally {
      setLoadingPractice(false);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchPracticePapers();
  }, []);

  // =========================
  // START FLOW
  // =========================
  const handleStartClick = (exam) => {
    if (exam.time_status !== "active") return;
    setSelectedExam(exam);
  };

  const confirmStart = () => {
    navigate(`/student/exam/${selectedExam._id}`);
  };

  const openRescheduleModal = (examId) => {
    setRescheduleData({ isOpen: true, examId });
  };

  const handleRescheduleSubmit = async ({ preferred_time, category, reason, proof_file }) => {
    try {
      const formData = new FormData();
      formData.append("preferred_time", preferred_time);
      formData.append("category", category);
      formData.append("reason", reason);
      if (proof_file) {
        formData.append("proof_file", proof_file);
      }

      await API.post(`/exam/${rescheduleData.examId}/reschedule`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("Reschedule request submitted successfully and is pending admin approval.");
      setRescheduleData({ isOpen: false, examId: null });
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to submit request.");
    }
  };

  // =========================
  // STATUS UI
  // =========================
  const getStatusBadge = (status) => {
    if (status === "active")
      return "bg-green-600/20 text-green-400 border border-green-500/30";

    if (status === "scheduled")
      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";

    if (status === "expired")
      return "bg-red-600/20 text-red-400 border border-red-500/30";

    return "bg-gray-500/20 text-gray-400 border border-gray-500/30";
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-4 md:p-6 lg:p-8">
      
      {/* 🌟 PROFESSIONAL HERO BANNER */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-3xl p-6 md:p-8 mb-8 shadow-sm">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/5 dark:bg-blue-500/10 blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
              Welcome back, {user?.name?.split(' ')[0] || "Student"} <span className="animate-waving-hand inline-block">👋</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg max-w-2xl">
              Track your performance, review upcoming assessments, and access your mock testing environment.
            </p>
          </div>
        </div>
      </div>

      {/* 📊 FLOATING STATS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
         <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide uppercase">Active</span>
              <span className="p-1.5 bg-green-500/10 text-green-500 rounded-lg"><Target className="w-4 h-4" /></span>
            </div>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.active}</span>
         </div>
         
         <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide uppercase">Upcoming</span>
              <span className="p-1.5 bg-blue-500/10 text-blue-500 rounded-lg"><Calendar className="w-4 h-4" /></span>
            </div>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{stats.upcoming}</span>
         </div>
         
         <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide uppercase">Mocks Taken</span>
              <span className="p-1.5 bg-purple-500/10 text-purple-500 rounded-lg"><BookOpen className="w-4 h-4" /></span>
            </div>
            <span className="text-3xl font-black text-slate-900 dark:text-white">{practiceHistory.length}</span>
         </div>
         
         <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-2xl p-5 flex flex-col hover:-translate-y-1 transition-transform duration-300">
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-wide uppercase">Avg. Accuracy</span>
              <span className="p-1.5 bg-amber-500/10 text-amber-500 rounded-lg"><Trophy className="w-4 h-4" /></span>
            </div>
            <span className="text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
              {averageAccuracy}<span className="text-lg text-slate-400">%</span>
            </span>
         </div>
      </div>

        {/* 🟢 TABS NAVIGATION */}
        <div className="flex overflow-x-auto no-scrollbar gap-2 mb-8 bg-gray-200/50 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-gray-300/50 dark:border-slate-800 backdrop-blur-sm w-fit max-w-full">
          <button 
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'live' 
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-gray-200 dark:border-slate-700' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <Target className="w-4 h-4" /> Live & Scheduled
          </button>
          
          <button 
            onClick={() => setActiveTab("practice")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'practice' 
                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-gray-200 dark:border-slate-700' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Practice Arena
          </button>

          <button 
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${
              activeTab === 'history' 
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-200 dark:border-slate-700' 
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-slate-800/50'
            }`}
          >
            <BarChart2 className="w-4 h-4" /> Analytics & History
          </button>
        </div>

      {activeTab === "live" ? (
        <>
          {loading ? (
            <p className="text-slate-500 dark:text-slate-400">Loading exams...</p>
          ) : exams.length === 0 ? (
        <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
          <p className="text-lg">No exams available</p>
          <p className="text-sm mt-2">
            Check back later or contact your instructor
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {[...exams]
            .sort((a, b) => {
               const getPriority = (ex) => {
                 if (ex.time_status === 'expired' || ex.has_submitted) return 3;
                 if (ex.time_status === 'active') return 1;
                 return 2;
               };
               
               const pA = getPriority(a);
               const pB = getPriority(b);
               
               if (pA !== pB) return pA - pB;
               
               if (pA === 2) {
                  // Upcoming: closest to now first
                  return new Date(a.start_time) - new Date(b.start_time);
               } else {
                  // Active/Completed: newest first
                  return new Date(b.start_time) - new Date(a.start_time);
               }
            })
            .map((exam) => {
            const isCompleted = exam.time_status === "expired" || exam.has_submitted;
            const isLive = exam.time_status === "active" && !exam.has_submitted;
            const isUpcoming = exam.time_status === "scheduled" && !exam.has_submitted;

            return (
              <div
                key={exam._id}
                className={`flex flex-col bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 shadow-sm ${
                  isLive 
                    ? "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20" 
                    : "hover:border-gray-400 dark:hover:border-slate-700"
                } ${isCompleted ? "opacity-60 grayscale-[30%]" : ""}`}
              >
                {/* 🎨 TOP ACCENT */}
                <div className={`h-1.5 w-full ${isLive ? 'bg-green-500' : isUpcoming ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                
                <div className="p-6 flex-1 flex flex-col bg-gradient-to-b from-transparent to-gray-100/30 dark:to-slate-800/30">
                  {/* 🏷 HEADER */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-wide text-slate-900 dark:text-white flex items-center gap-2">
                         {exam.exam_name}
                         {exam.is_rescheduled && (
                            <span className="px-2 py-0.5 mt-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/20 text-[10px] uppercase font-bold tracking-wider">
                              Rescheduled
                            </span>
                         )}
                      </h2>
                      <p className="text-blue-400 font-medium text-sm mt-1">{exam.subject_code} • Semester {exam.semester}</p>
                    </div>
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wider ${getStatusBadge(
                        exam.time_status,
                      )}`}
                    >
                      {isLive ? "Live" : isUpcoming ? "Upcoming" : "Completed"}
                    </span>
                  </div>

                  {/* 🕒 TIME INFO BOX */}
                  <div className="bg-white dark:bg-slate-950/50 rounded-xl p-4 mb-6 space-y-3 border border-gray-200 dark:border-slate-800/50 mt-auto">
                    <div className="flex items-center text-slate-700 dark:text-slate-300 text-sm">
                      <span className="w-5 font-bold opacity-70">📅</span>
                      <span>
                        {exam.start_time 
                          ? formatDateOnly(exam.start_time)
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-700 dark:text-slate-300 text-sm">
                      <span className="w-5 font-bold opacity-70">⏰</span>
                      <span>
                        {exam.start_time 
                          ? formatTimeOnly(exam.start_time)
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-700 dark:text-slate-300 text-sm">
                      <span className="w-5 font-bold opacity-70">⏳</span>
                      <span>{exam.duration_minutes} Minutes</span>
                    </div>
                  </div>

                  {/* 🚀 ACTIONS */}
                  <div className="mt-auto">
                    {isLive && (
                      <button
                        onClick={() => handleStartClick(exam)}
                        className="w-full py-3.5 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                      >
                       <PlayCircle className="w-5 h-5" />
                       Start Exam Now
                      </button>
                    )}
                    {isUpcoming && (
                      <div className="flex gap-2">
                          <button
                            disabled
                            className="flex-1 py-3 rounded-xl font-semibold bg-white dark:bg-slate-800 text-slate-500 cursor-not-allowed border border-gray-300 dark:border-slate-700/50"
                          >
                            Not Available Yet
                          </button>
                          {exam.reschedule_status === "pending" && (
                            <button
                              disabled
                              className="px-4 py-3 rounded-xl font-semibold bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 cursor-not-allowed"
                            >
                              Requested
                            </button>
                          )}
                          {exam.reschedule_status === "approved" && (
                            <button
                              disabled
                              className="px-4 py-3 rounded-xl font-semibold bg-green-500/10 text-green-400 border border-green-500/30 cursor-not-allowed"
                            >
                              Approved
                            </button>
                          )}
                          {(exam.reschedule_status === "rejected" || !exam.reschedule_status) && !exam.is_rescheduled && (
                            <button
                              onClick={() => openRescheduleModal(exam._id)}
                              className="px-4 py-3 rounded-xl font-semibold bg-orange-600/20 text-orange-400 hover:bg-orange-600/40 border border-orange-500/30 transition-all"
                              title="Request Reschedule"
                            >
                              Reschedule
                            </button>
                          )}
                      </div>
                    )}
                    {isCompleted && (
                      <button 
                         onClick={() => navigate(`/student/results/${exam._id}`)}
                         className="w-full py-3.5 rounded-xl font-semibold bg-purple-600/10 text-purple-600 dark:bg-purple-600/20 dark:text-purple-400 hover:bg-purple-600/20 dark:hover:bg-purple-600/30 transition border border-purple-500/30 flex items-center justify-center gap-2"
                      >
                         <BarChart2 className="w-5 h-5" /> View Analytics
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      ) : activeTab === "practice" ? (
        /* 🟠 PRACTICE ARENA HIERARCHY TAB */
        <>
          <div className="mt-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Mock Library</h3>
              <div className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700/50 rounded-lg p-1 flex">
                 <button 
                    onClick={() => setMockTab('curriculum')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mockTab === 'curriculum' ? 'bg-indigo-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                 >
                    Year-wise Mocks
                 </button>
                 <button 
                    onClick={() => setMockTab('chapter')}
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${mockTab === 'chapter' ? 'bg-purple-600 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200'}`}
                 >
                    Chapter-wise Mocks
                 </button>
              </div>
            </div>
            {mockTab === 'curriculum' ? (
              <PracticeHierarchy 
                  pastPapers={pastPapers} 
                  loadingPractice={loadingPractice} 
                  navigate={navigate} 
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
              />
            ) : (
              <div className="space-y-8">
                <MockTestGenerator navigate={navigate} />
                
                {pastPapers.filter(p => p.exam_type === "Practice" && p.is_instant === false).length > 0 && (
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Scheduled Mock Tests</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {pastPapers.filter(p => p.exam_type === "Practice" && p.is_instant === false).map(mock => {
                        const rawTime = mock.start_time || new Date().toISOString();
                        const d = new Date(rawTime.endsWith('Z') || rawTime.includes('+') ? rawTime : rawTime + 'Z');
                        const isReady = d <= new Date();
                        return (
                          <div key={mock._id} className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700/50 rounded-xl p-4 flex justify-between items-center shadow-sm">
                            <div>
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white">{mock.exam_name}</h4>
                              <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 mt-2">
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {formatDateOnly(mock.start_time)} • {formatTimeOnly(mock.start_time)}</span>
                                <span className="flex items-center gap-1"><BookOpen className="w-4 h-4" /> {mock.duration_minutes} Mins</span>
                              </div>
                            </div>
                            <button
                              disabled={!isReady}
                              onClick={() => navigate(`/student/practice/${mock._id}`)}
                              className={`px-6 py-2 rounded-lg font-bold transition-all ${
                                isReady 
                                  ? "bg-purple-600 hover:bg-purple-500 text-slate-900 dark:text-white shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                                  : "bg-white dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                              }`}
                            >
                              {isReady ? "Start Now" : "Waiting"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : activeTab === "history" ? (
         /* 📊 PERFORMANCE HISTORY TAB */
         <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {practiceHistory.length === 0 ? (
               <div className="text-center text-slate-500 dark:text-slate-400 mt-16 bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 p-12">
                 <div className="w-20 h-20 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Trophy className="w-10 h-10 text-slate-400" />
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">No Practice History Yet</h3>
                 <p className="text-lg max-w-md mx-auto">
                   Head over to the Practice Arena to take your first mock test and start building your analytics profile!
                 </p>
                 <button onClick={() => setActiveTab("practice")} className="mt-6 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl transition shadow-lg shadow-purple-500/25">
                   Go to Practice Arena
                 </button>
               </div>
            ) : (
               <div className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200 dark:border-slate-800">
                     <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                        <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                     </div>
                     <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Recent Mock Attempts</h3>
                  </div>
                  
                  <div className="grid gap-4">
                    {practiceHistory.map((attempt) => (
                       <div key={attempt._id} className="bg-white dark:bg-[#0c0c11] border border-gray-300 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-400 dark:hover:border-indigo-500/50 transition-all hover:shadow-md hover:shadow-indigo-500/5 group">
                          <div className="flex gap-4 items-center">
                             <div className="hidden md:flex w-12 h-12 rounded-full bg-white dark:bg-slate-800 items-center justify-center border border-gray-200 dark:border-slate-700 shadow-sm">
                                <Zap className={`w-6 h-6 ${attempt.analytics.accuracy >= 70 ? 'text-emerald-500' : attempt.analytics.accuracy >= 40 ? 'text-amber-500' : 'text-rose-500'}`} />
                             </div>
                             <div>
                                <h4 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{attempt.exam_name}</h4>
                                <p className="text-sm text-slate-500 font-medium mt-1 flex items-center gap-2">
                                  <Calendar className="w-4 h-4" /> {formatDateOnly(attempt.created_at)} • {formatTimeOnly(attempt.created_at)}
                                </p>
                             </div>
                          </div>
                          
                          <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent p-4 md:p-0 rounded-xl border border-gray-200 md:border-transparent dark:border-slate-800 md:dark:border-transparent">
                             <div className="text-center md:text-right">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-1">Total Score</p>
                                <p className="font-black text-2xl text-slate-900 dark:text-white leading-none">{attempt.score}</p>
                             </div>
                             <div className="w-px h-10 bg-gray-200 dark:bg-slate-800 hidden md:block"></div>
                             <div className="text-center md:text-right">
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mb-1">Accuracy</p>
                                <p className={`font-black text-2xl leading-none ${attempt.analytics.accuracy >= 70 ? 'text-emerald-500 dark:text-emerald-400' : attempt.analytics.accuracy >= 40 ? 'text-amber-500 dark:text-amber-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                   {attempt.analytics.accuracy}%
                                </p>
                             </div>
                             <button 
                                onClick={() => navigate(`/student/practice-result/${attempt.paper_id}`, { state: attempt })}
                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 rounded-xl font-bold transition-all text-sm whitespace-nowrap shadow-sm"
                             >
                                Full Report
                             </button>
                          </div>
                       </div>
                    ))}
                  </div>
               </div>
            )}
         </div>
      ) : null}
      {/* 🔥 GUIDELINES MODAL */}
      {/* 🔥 RESCHEDULE MODAL */}
      <RescheduleModal 
        isOpen={rescheduleData.isOpen}
        onClose={() => setRescheduleData({ isOpen: false, examId: null })}
        onSubmit={handleRescheduleSubmit}
      />

      {selectedExam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-xl max-w-md w-full border border-gray-300 dark:border-slate-700">
            <h2 className="text-lg font-semibold mb-3">Exam Instructions</h2>

            <ul className="text-sm text-slate-700 dark:text-slate-300 space-y-2 mb-4">
              <li>• Do not refresh or close the tab</li>
              <li>• Timer will start immediately</li>
              <li>• Each question must be answered carefully</li>
              <li>• Auto-submit on time completion</li>
            </ul>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedExam(null)}
                className="px-4 py-2 bg-gray-600 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmStart}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Start Exam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// 📂 STATIC LAZY-LOAD HIERARCHICAL FOLDER TREE
// ==========================================
const PracticeHierarchy = ({ pastPapers, loadingPractice, navigate }) => {
    // Standard Scale Variables
    const semesters = [1, 2, 3, 4, 5, 6, 7, 8];
    const years = [2025, 2024, 2023, 2022, 2021, 2020];

    // Local Tree State
    const [expandedSemesters, setExpandedSemesters] = useState({});
    const [expandedSubjects, setExpandedSubjects] = useState({});
    const [expandedYears, setExpandedYears] = useState({});

    const [subjectCache, setSubjectCache] = useState({});
    const [loadingSubjects, setLoadingSubjects] = useState({}); // tracking active network fetches

    // Scheduling State
    const [schedulingPaper, setSchedulingPaper] = useState(null);
    const [scheduledTime, setScheduledTime] = useState("");
    const [schedulingLoading, setSchedulingLoading] = useState(false);

    const handleScheduleSubmit = async (paperId) => {
        if (!scheduledTime) return alert("Please select a time.");
        setSchedulingLoading(true);
        try {
            await API.post(`/past-papers/${paperId}/schedule`, { scheduled_time: new Date(scheduledTime).toISOString() });
            alert("Year-wise Mock Test Scheduled successfully! Check your scheduled mocks.");
            setSchedulingPaper(null);
            setScheduledTime("");
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.detail || "Failed to schedule");
        } finally {
            setSchedulingLoading(false);
        }
    };

    // Toggler: Semester
    const toggleSemester = async (sem) => {
        const isCurrentlyOpen = expandedSemesters[sem];
        setExpandedSemesters(prev => ({ ...prev, [sem]: !isCurrentlyOpen }));

        // Lazy Load Ping! If we haven't fetched subjects for this semester yet, grab them!
        if (!isCurrentlyOpen && !subjectCache[sem]) {
            try {
                setLoadingSubjects(prev => ({ ...prev, [sem]: true }));
                const res = await fetchCurriculum(sem);
                
                // Curriculum API returns: { semester: N, subjects: [ {name, code}, ... ] }
                setSubjectCache(prev => ({ ...prev, [sem]: res.data?.subjects || [] }));
            } catch (err) {
                console.error(`Failed to fetch subjects for Semester ${sem}`, err);
                setSubjectCache(prev => ({ ...prev, [sem]: [] })); // Set empty on fail to prevent refetch loops
            } finally {
                setLoadingSubjects(prev => ({ ...prev, [sem]: false }));
            }
        }
    };

    const toggleSubject = (sem, subjCode) => {
        const key = `${sem}_${subjCode}`;
        setExpandedSubjects(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const toggleYear = (sem, subjCode, year) => {
        const key = `${sem}_${subjCode}_${year}`;
        setExpandedYears(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Filter Helper: matches dynamically fetched Past Papers against our static tree location
    const getPapersForNode = (sem, subjCode, year) => {
        if (!pastPapers) return [];
        return pastPapers.filter(p => 
            p.semester === sem && 
            p.subject_code && p.subject_code.includes(subjCode) && 
            p.year === year
        );
    };

    if (loadingPractice) return <p className="text-slate-500 dark:text-slate-400">Booting infrastructure...</p>;

    return (
        <div className="flex flex-col gap-4">
            {semesters.map(sem => {
               const semOpen = expandedSemesters[sem];
               const hasLoadedSubjects = !!subjectCache[sem];
               const isFetching = loadingSubjects[sem];

               return (
                <div key={sem} className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-md">
                    
                    {/* 🔹 LEVEL 1: SEMESTER FOLDER */}
                    <button 
                        onClick={() => toggleSemester(sem)}
                        className="w-full flex justify-between items-center bg-white dark:bg-slate-800 p-5 hover:bg-gray-100 dark:hover:bg-slate-700 transition group"
                    >
                        <span className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                            {semOpen ? <FolderOpen className="text-blue-400 w-6 h-6" /> : <Folder className="text-blue-500 w-6 h-6 group-hover:text-blue-400 transition" />}
                            Semester {sem}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 text-sm font-semibold flex items-center gap-1">
                            {semOpen ? <ChevronDown className="w-5 h-5 text-blue-400" /> : <ChevronRight className="w-5 h-5" />}
                        </span>
                    </button>

                    {/* 🔹 LEVEL 2: SUBJECTS LISTING */}
                    <AnimatePresence initial={false}>
                    {semOpen && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="overflow-hidden"
                        >
                        <div className="p-4 pl-10 border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-950/20 flex flex-col gap-4">
                            {isFetching ? (
                                <p className="text-purple-400 animate-pulse font-mono text-sm py-2">Ping: Querying Question Bank for subjects...</p>
                            ) : hasLoadedSubjects && subjectCache[sem].length === 0 ? (
                                <p className="text-slate-500 italic py-2">No formal subjects registered in curriculum for Semester {sem}.</p>
                            ) : hasLoadedSubjects ? (
                                subjectCache[sem].map((subject) => {
                                    const subjOpen = expandedSubjects[`${sem}_${subject.code}`];

                                    return (
                                        <div key={subject.code} className="border border-gray-300 dark:border-slate-700/50 rounded-lg overflow-hidden bg-gray-50 dark:bg-slate-900/50">
                                            
                                            <button 
                                                onClick={() => toggleSubject(sem, subject.code)} 
                                                className="w-full text-left p-4 hover:bg-white dark:hover:bg-slate-800 transition flex justify-between items-center"
                                            >
                                                <span className="text-lg font-bold text-purple-400 flex items-center gap-2.5">
                                                    <BookOpen className="w-5 h-5 opacity-90" /> {subject.name} <span className="opacity-60 text-sm tracking-wide ml-1">[{subject.code}]</span>
                                                </span>
                                                <span className="text-slate-500">
                                                    {subjOpen ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4" />}
                                                </span>
                                            </button>

                                            {/* 🔹 LEVEL 3: YEARS (2020 - 2025) */}
                                            <AnimatePresence initial={false}>
                                            {subjOpen && (
                                                <motion.div 
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                                    className="overflow-hidden"
                                                >
                                                <div className="p-4 pl-8 border-t border-gray-300 dark:border-slate-700/50 flex flex-col gap-3">
                                                    {years.map(year => {
                                                        const yearOpen = expandedYears[`${sem}_${subject.code}_${year}`];
                                                        const matchingPapers = getPapersForNode(sem, subject.code, year);

                                                        return (
                                                            <div key={year} className="bg-white dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg p-2.5">
                                                                <button 
                                                                    onClick={() => toggleYear(sem, subject.code, year)} 
                                                                    className="w-full text-left flex justify-between items-center text-slate-700 dark:text-slate-300 font-semibold hover:text-slate-900 dark:hover:text-white p-1"
                                                                >
                                                                    <span className="flex items-center gap-2.5">
                                                                        <Clock className="w-4 h-4 text-slate-500" /> {year} Session
                                                                        {matchingPapers.length > 0 && (
                                                                           <span className="ml-3 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full flex items-center gap-1">
                                                                               <CheckCircle className="w-3 h-3" /> {matchingPapers.length} Available
                                                                           </span>
                                                                        )}
                                                                    </span>
                                                                    <span className="text-slate-600">
                                                                        {yearOpen ? <ChevronDown className="w-4 h-4 text-slate-500 dark:text-slate-400" /> : <ChevronRight className="w-4 h-4" />}
                                                                    </span>
                                                                </button>

                                                                {/* 🔹 LEVEL 4: PAPERS LEAF NODE */}
                                                                <AnimatePresence initial={false}>
                                                                {yearOpen && (
                                                                    <motion.div 
                                                                        initial={{ height: 0, opacity: 0 }}
                                                                        animate={{ height: "auto", opacity: 1 }}
                                                                        exit={{ height: 0, opacity: 0 }}
                                                                        transition={{ duration: 0.2, ease: "easeInOut" }}
                                                                        className="overflow-hidden"
                                                                    >
                                                                    <div className="mt-3 flex flex-col gap-3 pl-4 border-l-2 border-gray-200 dark:border-slate-800 pt-1 pb-2">
                                                                        {matchingPapers.length === 0 ? (
                                                                            <p className="text-sm text-slate-500 italic p-2 border border-dashed border-gray-200 dark:border-slate-800 rounded-lg">
                                                                                No sample papers uploaded for this cycle yet.
                                                                            </p>
                                                                        ) : (
                                                                            matchingPapers.map((paper) => (
                                                                                <div key={paper._id} className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-4 rounded-lg flex justify-between items-center hover:border-purple-500 transition shadow-sm">
                                                                                    <div>
                                                                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{paper.exam_name}</h3>
                                                                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                                                                            Format: <span className="text-slate-900 dark:text-white font-mono bg-white dark:bg-slate-800 px-2 py-0.5 rounded mr-2">{paper.pattern || 'MIXED'}</span>
                                                                                            {paper.duration_minutes} Mins
                                                                                        </p>
                                                                                    </div>
                                                                                    <div className="flex flex-col gap-2">
                                                                                        {schedulingPaper === paper._id ? (
                                                                                            <div className="flex flex-col gap-2 bg-white dark:bg-slate-950 p-2 rounded border border-purple-500/30">
                                                                                                <input 
                                                                                                    type="datetime-local" 
                                                                                                    value={scheduledTime}
                                                                                                    onChange={(e) => setScheduledTime(e.target.value)}
                                                                                                    className="text-xs p-1 border rounded dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
                                                                                                />
                                                                                                <div className="flex gap-1">
                                                                                                    <button 
                                                                                                        disabled={schedulingLoading}
                                                                                                        onClick={() => handleScheduleSubmit(paper._id)}
                                                                                                        className="flex-1 bg-purple-600 text-white text-xs py-1 rounded"
                                                                                                    >
                                                                                                        {schedulingLoading ? "..." : "Confirm"}
                                                                                                    </button>
                                                                                                    <button 
                                                                                                        onClick={() => setSchedulingPaper(null)}
                                                                                                        className="flex-1 bg-gray-300 dark:bg-slate-700 text-xs py-1 rounded"
                                                                                                    >
                                                                                                        Cancel
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <div className="flex gap-2">
                                                                                                <button 
                                                                                                    onClick={() => navigate(`/student/practice/${paper._id}`)}
                                                                                                    className="px-4 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg font-bold hover:bg-purple-600 hover:text-slate-900 dark:text-white transition"
                                                                                                >
                                                                                                    Instant
                                                                                                </button>
                                                                                                <button 
                                                                                                    onClick={() => setSchedulingPaper(paper._id)}
                                                                                                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg font-bold hover:bg-blue-600 hover:text-white transition"
                                                                                                >
                                                                                                    Schedule
                                                                                                </button>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        )}
                                                                    </div>
                                                                    </motion.div>
                                                                )}
                                                                </AnimatePresence>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                                </motion.div>
                                            )}
                                            </AnimatePresence>
                                        </div>
                                    )
                                })
                            ) : null}
                        </div>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </div>
               )
            })}
        </div>
    )
}
