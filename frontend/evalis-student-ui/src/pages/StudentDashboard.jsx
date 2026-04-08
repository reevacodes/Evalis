import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function StudentDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState(null); // 🔥 for modal
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

  useEffect(() => {
    fetchExams();
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
      <h1 className="text-2xl font-semibold mb-6">Available Exams</h1>

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
            const isLive = exam.time_status === "active";
            const isUpcoming = exam.time_status === "scheduled";
            const isCompleted = exam.time_status === "expired";

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
                      <h2 className="text-xl font-bold tracking-wide text-white">{exam.exam_name}</h2>
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
                      <button
                        disabled
                        className="w-full py-3 rounded-xl font-semibold bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50"
                      >
                        Not Available Yet
                      </button>
                    )}
                    {isCompleted && (
                      <button className="w-full py-3 rounded-xl font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors border border-slate-700">
                        View Result
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 🔥 GUIDELINES MODAL */}
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
