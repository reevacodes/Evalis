import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FolderOpen, BookOpen, Clock, ChevronRight, ChevronDown, CheckCircle } from "lucide-react";
import API, { getPastPapers, fetchCurriculum } from "../services/api";
import RescheduleModal from "../components/RescheduleModal";

export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState("live"); // 'live' | 'practice'
  const [exams, setExams] = useState([]);
  const [pastPapers, setPastPapers] = useState([]);
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
    active: exams.filter((e) => e.time_status === "active").length,
    upcoming: exams.filter((e) => e.time_status === "scheduled").length,
    completed: exams.filter((e) => e.time_status === "expired").length,
  };

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
      const res = await getPastPapers();
      setPastPapers(res.data || []);
    } catch (err) {
      console.error("Failed to fetch past papers", err);
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

  const handleRescheduleSubmit = async ({ preferred_time, reason }) => {
    try {
      await API.post(`/exam/${rescheduleData.examId}/reschedule`, {
        reason,
        preferred_time
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

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      
      {/* 🟢 TABS HEADER */}
      <div className="flex items-center gap-6 mb-8 border-b border-slate-800 pb-3">
        <button 
          onClick={() => setActiveTab("live")}
          className={`text-xl font-semibold transition-colors ${activeTab === 'live' ? 'text-white border-b-2 border-blue-500 pb-2 -mb-[14px]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Live Exams
        </button>
        <button 
          onClick={() => setActiveTab("practice")}
          className={`text-xl font-semibold transition-colors ${activeTab === 'practice' ? 'text-white border-b-2 border-purple-500 pb-2 -mb-[14px]' : 'text-slate-500 hover:text-slate-300'}`}
        >
          Previous Year Papers
        </button>
      </div>

      {activeTab === "live" ? (
        <>
          {loading ? (
            <p className="text-slate-400">Loading exams...</p>
          ) : exams.length === 0 ? (
        <div className="text-center text-slate-400 mt-10">
          <p className="text-lg">No exams available</p>
          <p className="text-sm mt-2">
            Check back later or contact your instructor
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-5">
          {exams.map((exam) => {
            const isCompleted = exam.time_status === "expired" || exam.has_submitted;
            const isLive = exam.time_status === "active" && !exam.has_submitted;
            const isUpcoming = exam.time_status === "scheduled" && !exam.has_submitted;

            return (
              <div
                key={exam._id}
                className={`flex flex-col bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300 ${
                  isLive 
                    ? "hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20" 
                    : "hover:border-slate-700"
                } ${isCompleted ? "opacity-60 grayscale-[30%]" : ""}`}
              >
                {/* 🎨 TOP ACCENT */}
                <div className={`h-1.5 w-full ${isLive ? 'bg-green-500' : isUpcoming ? 'bg-yellow-500' : 'bg-gray-600'}`}></div>
                
                <div className="p-6 flex-1 flex flex-col">
                  {/* 🏷 HEADER */}
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-xl font-bold tracking-wide text-white flex items-center gap-2">
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
                  <div className="bg-slate-950/50 rounded-xl p-4 mb-6 space-y-3 border border-slate-800/50 mt-auto">
                    <div className="flex items-center text-slate-300 text-sm">
                      <span className="w-5 font-bold opacity-70">📅</span>
                      <span>
                        {exam.start_time 
                          ? new Date(exam.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) 
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-300 text-sm">
                      <span className="w-5 font-bold opacity-70">⏰</span>
                      <span>
                        {exam.start_time 
                          ? new Date(exam.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) 
                          : "TBD"}
                      </span>
                    </div>
                    <div className="flex items-center text-slate-300 text-sm">
                      <span className="w-5 font-bold opacity-70">⏳</span>
                      <span>{exam.duration_minutes} Minutes</span>
                    </div>
                  </div>

                  {/* 🚀 ACTIONS */}
                  <div className="mt-auto">
                    {isLive && (
                      <button
                        onClick={() => handleStartClick(exam)}
                        className="w-full py-3 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
                      >
                       <span className="animate-pulse h-2 w-2 bg-white rounded-full"></span>
                       Start Exam Now
                      </button>
                    )}
                    {isUpcoming && (
                      <div className="flex gap-2">
                          <button
                            disabled
                            className="flex-1 py-3 rounded-xl font-semibold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                          >
                            Not Available Yet
                          </button>
                          {!exam.is_rescheduled && (
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
                         className="w-full py-3 rounded-xl font-semibold bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 transition border border-purple-500/30 flex items-center justify-center gap-2"
                      >
                         <span className="text-lg">📊</span> View Analytics
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
      ) : (
        /* 🟠 PRACTICE ARENA HIERARCHY TAB */
        <PracticeHierarchy 
            pastPapers={pastPapers} 
            loadingPractice={loadingPractice} 
            navigate={navigate} 
            expandedNodes={expandedNodes}
            toggleNode={toggleNode}
        />
      )}

      {/* 🔥 GUIDELINES MODAL */}
      {/* 🔥 RESCHEDULE MODAL */}
      <RescheduleModal 
        isOpen={rescheduleData.isOpen}
        onClose={() => setRescheduleData({ isOpen: false, examId: null })}
        onSubmit={handleRescheduleSubmit}
      />

      {selectedExam && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-xl max-w-md w-full border border-slate-700">
            <h2 className="text-lg font-semibold mb-3">Exam Instructions</h2>

            <ul className="text-sm text-slate-300 space-y-2 mb-4">
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

    // Caching Subjects Fetched dynamically from Backend (/curriculum)
    const [subjectCache, setSubjectCache] = useState({});
    const [loadingSubjects, setLoadingSubjects] = useState({}); // tracking active network fetches

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

    if (loadingPractice) return <p className="text-slate-400">Booting infrastructure...</p>;

    return (
        <div className="flex flex-col gap-4">
            {semesters.map(sem => {
               const semOpen = expandedSemesters[sem];
               const hasLoadedSubjects = !!subjectCache[sem];
               const isFetching = loadingSubjects[sem];

               return (
                <div key={sem} className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-md">
                    
                    {/* 🔹 LEVEL 1: SEMESTER FOLDER */}
                    <button 
                        onClick={() => toggleSemester(sem)}
                        className="w-full flex justify-between items-center bg-slate-800 p-5 hover:bg-slate-700 transition group"
                    >
                        <span className="text-xl font-bold text-white flex items-center gap-3">
                            {semOpen ? <FolderOpen className="text-blue-400 w-6 h-6" /> : <Folder className="text-blue-500 w-6 h-6 group-hover:text-blue-400 transition" />}
                            Semester {sem}
                        </span>
                        <span className="text-slate-400 text-sm font-semibold flex items-center gap-1">
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
                        <div className="p-4 pl-10 border-t border-slate-800 bg-slate-950/20 flex flex-col gap-4">
                            {isFetching ? (
                                <p className="text-purple-400 animate-pulse font-mono text-sm py-2">Ping: Querying Question Bank for subjects...</p>
                            ) : hasLoadedSubjects && subjectCache[sem].length === 0 ? (
                                <p className="text-slate-500 italic py-2">No formal subjects registered in curriculum for Semester {sem}.</p>
                            ) : hasLoadedSubjects ? (
                                subjectCache[sem].map((subject) => {
                                    const subjOpen = expandedSubjects[`${sem}_${subject.code}`];

                                    return (
                                        <div key={subject.code} className="border border-slate-700/50 rounded-lg overflow-hidden bg-slate-900/50">
                                            
                                            <button 
                                                onClick={() => toggleSubject(sem, subject.code)} 
                                                className="w-full text-left p-4 hover:bg-slate-800 transition flex justify-between items-center"
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
                                                <div className="p-4 pl-8 border-t border-slate-700/50 flex flex-col gap-3">
                                                    {years.map(year => {
                                                        const yearOpen = expandedYears[`${sem}_${subject.code}_${year}`];
                                                        const matchingPapers = getPapersForNode(sem, subject.code, year);

                                                        return (
                                                            <div key={year} className="bg-slate-950 border border-slate-800 rounded-lg p-2.5">
                                                                <button 
                                                                    onClick={() => toggleYear(sem, subject.code, year)} 
                                                                    className="w-full text-left flex justify-between items-center text-slate-300 font-semibold hover:text-white p-1"
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
                                                                        {yearOpen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4" />}
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
                                                                    <div className="mt-3 flex flex-col gap-3 pl-4 border-l-2 border-slate-800 pt-1 pb-2">
                                                                        {matchingPapers.length === 0 ? (
                                                                            <p className="text-sm text-slate-500 italic p-2 border border-dashed border-slate-800 rounded-lg">
                                                                                No sample papers uploaded for this cycle yet.
                                                                            </p>
                                                                        ) : (
                                                                            matchingPapers.map((paper) => (
                                                                                <div key={paper._id} className="bg-slate-900 border border-slate-700 p-4 rounded-lg flex justify-between items-center hover:border-purple-500 transition shadow-sm">
                                                                                    <div>
                                                                                        <h3 className="font-bold text-white text-lg">{paper.exam_name}</h3>
                                                                                        <p className="text-sm text-slate-400 mt-1">
                                                                                            Format: <span className="text-white font-mono bg-slate-800 px-2 py-0.5 rounded mr-2">{paper.pattern || 'MIXED'}</span>
                                                                                            {paper.duration_minutes} Mins
                                                                                        </p>
                                                                                    </div>
                                                                                    <button 
                                                                                        onClick={() => navigate(`/student/practice/${paper._id}`)}
                                                                                        className="px-6 py-2 bg-purple-600/20 text-purple-400 border border-purple-500/30 rounded-lg font-bold hover:bg-purple-600 hover:text-white transition"
                                                                                    >
                                                                                        Practice
                                                                                    </button>
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
