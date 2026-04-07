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
          {exams.map((exam) => (
            <div
              key={exam._id}
              className={`bg-slate-900 border border-slate-800 p-5 rounded-xl transition 
                hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10
                ${exam.time_status === "expired" ? "opacity-50" : ""}`}
            >
              {/* HEADER */}
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-lg font-semibold">{exam.exam_name}</h2>

                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-sm text-gray-400">Total</p>
                    <h2 className="text-xl font-bold">{stats.total}</h2>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-sm text-gray-400">Active</p>
                    <h2 className="text-xl font-bold text-green-400">
                      {stats.active}
                    </h2>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-sm text-gray-400">Upcoming</p>
                    <h2 className="text-xl font-bold text-yellow-400">
                      {stats.upcoming}
                    </h2>
                  </div>

                  <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
                    <p className="text-sm text-gray-400">Completed</p>
                    <h2 className="text-xl font-bold text-red-400">
                      {stats.completed}
                    </h2>
                  </div>
                </div>

                <span
                  className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(
                    exam.time_status,
                  )}`}
                >
                  {exam.time_status.toUpperCase()}
                </span>
              </div>

              {/* INFO */}
              <p className="text-sm text-slate-400 mb-2">
                {exam.subject_code} • Semester {exam.semester}
              </p>

              <div className="text-sm text-slate-300 space-y-1">
                <p>Duration: {exam.duration_minutes} min</p>
                <p>Units: {exam.units?.join(", ")}</p>

                {exam.start_time && (
                  <p
                    className={`${
                      exam.time_status === "scheduled"
                        ? "text-yellow-400"
                        : exam.time_status === "active"
                          ? "text-green-400"
                          : "text-red-400"
                    }`}
                  >
                    {exam.time_status === "scheduled" && "Starts at: "}
                    {exam.time_status === "active" && "Started at: "}
                    {exam.time_status === "expired" && "Started at: "}
                    {new Date(exam.start_time).toLocaleString()}
                  </p>
                )}
                {exam.time_status === "expired" && (
                  <p className="text-red-400">Exam has ended</p>
                )}
              </div>

              {/* ACTION */}
              <button
                onClick={() => handleStartClick(exam)}
                disabled={exam.time_status !== "active"}
                className={`mt-4 w-full py-2 rounded-lg font-medium ${
                  exam.time_status === "active"
                    ? "bg-blue-500 hover:bg-blue-600"
                    : "bg-gray-600 cursor-not-allowed"
                }`}
              >
                {exam.time_status === "active"
                  ? "Start Exam"
                  : exam.time_status === "scheduled"
                    ? "Not Started"
                    : "Expired"}
              </button>
              {exam.time_status === "expired" && (
                <button className="mt-2 w-full py-2 bg-purple-600 rounded">
                  View Result
                </button>
              )}
            </div>
          ))}
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
