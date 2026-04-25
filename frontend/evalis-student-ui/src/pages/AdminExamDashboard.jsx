import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { formatDateTime } from "../utils/formatDate";

export default function AdminExamDashboard() {
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ NEW: schedule state
  const [scheduleData, setScheduleData] = useState({});

  // =========================
  // FETCH EXAMS
  // =========================
  const fetchExams = async () => {
    try {
      const res = await API.get("/exam/");
      const allExams = res.data.exams || [];

      const filtered = allExams.filter((exam) =>
        ["finalized", "draft", "published"].includes(exam.status),
      );

      setExams(filtered);
    } catch (err) {
      console.error(err);
      alert("Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();

    const interval = setInterval(fetchExams, 5000); // 🔥 auto refresh

    return () => clearInterval(interval);
  }, []);

  // =========================
  // TIME STATUS CALCULATOR
  // =========================
  const getTimeStatus = (exam) => {
    if (!exam.start_time) return "unscheduled";

    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(start.getTime() + exam.duration_minutes * 60000);

    if (now < start) return "scheduled";
    if (now >= start && now <= end) return "active";
    return "expired";
  };

  // =========================
  // SCHEDULE EXAM
  // =========================
  const handleScheduleWithDefaults = async (examId, startTime, duration) => {
    const exam = exams.find((e) => e._id === examId);

    const timeStatus = getTimeStatus(exam);
    if (timeStatus === "active") {
      alert("Cannot reschedule while exam is live");
      return;
    }

    try {
      await API.put(`/exam/${examId}/schedule`, {
        start_time: startTime,
        duration_minutes: duration,
      });

      setExams((prev) =>
        prev.map((e) =>
          e._id === examId
            ? {
                ...e,
                start_time: startTime,
                duration_minutes: duration,
                schedule_requested: false,
              }
            : e,
        ),
      );

      alert("Exam scheduled successfully");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to schedule exam");
    }
  };

  const handleSchedule = async (examId) => {
    // 🔥 GET CURRENT EXAM
    const exam = exams.find((e) => e._id === examId);

    // 🔥 BLOCK IF LIVE
    const timeStatus = getTimeStatus(exam);
    if (timeStatus === "active") {
      alert("Cannot reschedule while exam is live");
      return;
    }

    const data = scheduleData[examId];

    if (!data?.start_time || !data?.duration) {
      alert("Please set start time and duration");
      return;
    }

    try {
      await API.put(`/exam/${examId}/schedule`, {
        start_time: data.start_time,
        duration_minutes: data.duration,
      });

      // update locally
      setExams((prev) =>
        prev.map((e) =>
          e._id === examId
            ? {
                ...e,
                start_time: data.start_time,
                duration_minutes: data.duration,
                schedule_requested: false,
              }
            : e,
        ),
      );

      alert("Exam scheduled successfully");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to schedule exam");
    }
  };
  // =========================
  // PUBLISH
  // =========================
  const handlePublish = async (examId) => {
    const exam = exams.find((e) => e._id === examId);

    // ✅ prevent publish without schedule
    if (!exam.start_time) {
      alert("Schedule exam before publishing");
      return;
    }

    try {
      await API.put(`/exam/${examId}/publish`);

      setExams((prev) =>
        prev.map((e) => (e._id === examId ? { ...e, status: "published" } : e)),
      );
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to publish exam");
    }
  };
  // =========================
  // PUBLISH RESULTS (PHASE 6)
  // =========================
  const handlePublishResults = async (examId) => {
    try {
      const res = await API.put(`/exam/${examId}/publish-results`);
      
      setExams((prev) =>
        prev.map((e) =>
          e._id === examId
            ? { ...e, is_results_published: res.data.is_results_published }
            : e,
        ),
      );
    } catch (err) {
      console.error(err);
      alert("Failed to toggle results visibility");
    }
  };
  // =========================
  // ARCHIVE (SOFT DELETE)
  // =========================
  const handleArchive = async (examId) => {
    if (!window.confirm("Are you sure you want to archive this expired exam? It will be permanently hidden from this dashboard.")) {
      return;
    }
    
    try {
      await API.delete(`/exam/${examId}`);
      
      // Remove it locally from the UI
      setExams((prev) => prev.filter((e) => e._id !== examId));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to archive exam");
    }
  };
  // =========================
  // STATUS BADGE
  // =========================
  const getStatusBadge = (status) => {
    if (status === "finalized")
      return "bg-amber-500/20 text-amber-400 border border-amber-500/30";
    if (status === "published")
      return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    return "bg-slate-500/20 text-slate-700 dark:text-slate-300 border border-slate-500/30";
  };

  // ✅ NEW: TIME BADGE
  const getTimeBadge = (exam) => {
    const t = getTimeStatus(exam);

    if (t === "scheduled")
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    if (t === "active")
      return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (t === "expired")
      return "bg-red-500/20 text-red-400 border border-red-500/30";
    return "bg-slate-600/20 text-slate-500 dark:text-slate-400 border border-slate-600/30";
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6">
      <h1 className="text-2xl font-semibold mb-6">Admin Exam Dashboard</h1>

      {loading ? (
        <p className="text-slate-500 dark:text-slate-400">Loading exams...</p>
      ) : exams.length === 0 ? (
        <p className="text-slate-500 dark:text-slate-400">No exams available</p>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => {
            const timeStatus = getTimeStatus(exam);

            return (
              <div
                key={exam._id}
                className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-5 rounded-lg shadow-sm"
              >
                {/* HEADER */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-medium">{exam.exam_name}</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {exam.subject_code} • Semester {exam.semester}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <span
                      className={`text-xs px-3 py-1 rounded-full capitalize ${getStatusBadge(
                        exam.status,
                      )}`}
                    >
                      {exam.status}
                    </span>

                    {/* ✅ TIME BADGE */}
                    <span
                      className={`text-xs px-3 py-1 rounded-full capitalize ${getTimeBadge(
                        exam,
                      )}`}
                    >
                      {timeStatus}
                    </span>
                  </div>
                </div>

                {/* DETAILS */}
                <div className="mt-3 text-sm text-slate-700 dark:text-slate-300 grid grid-cols-2 gap-2">
                  <p>Teacher: {exam.teacher_name}</p>
                  <p>Duration: {exam.duration_minutes} min</p>
                  <p className="col-span-2">Units: {exam.units?.join(", ")}</p>

                  {/* ✅ SHOW START TIME */}
                  {exam.start_time && (
                    <p className="col-span-2 text-blue-600 dark:text-blue-400">
                      Starts: {formatDateTime(exam.start_time)}
                    </p>
                  )}
                </div>
                {exam.schedule_requested && (
                  <div className="mt-2 text-xs text-purple-600 dark:text-purple-400 flex flex-col gap-1">
                    <span className="font-bold flex items-center gap-1">
                       <span className="text-sm">📩</span> Schedule Requested by Instructor
                    </span>
                    {exam.requested_start_time && (
                       <span className="text-slate-700 dark:text-slate-300 ml-5">
                          Requested Time: <span className="text-slate-900 dark:text-white font-semibold">{formatDateTime(exam.requested_start_time)}</span> 
                          <span className="text-slate-500 ml-2">({exam.requested_duration_minutes} mins)</span>
                       </span>
                    )}
                  </div>
                )}

                {/* ✅ SCHEDULING UI */}
                {/* ================= SCHEDULING UI ================= */}

                {/* ✅ BEFORE PUBLISH → ONLY IF REQUESTED */}
                {exam.status === "finalized" && exam.schedule_requested && (
                  <div className="mt-4 p-4 rounded-lg bg-white dark:bg-slate-800/50 border border-gray-300 dark:border-slate-700/50">
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-3 flex items-center gap-1.5 whitespace-nowrap">
                      <span>⚡</span> Sets A/B/C/D will be dynamically generated upon scheduling.
                    </p>
                    <div className="flex gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      value={
                         scheduleData[exam._id]?.start_time !== undefined 
                         ? scheduleData[exam._id]?.start_time 
                         : (exam.requested_start_time ? new Date(new Date(exam.requested_start_time).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "")
                      }
                      onChange={(e) =>
                        setScheduleData((prev) => ({
                          ...prev,
                          [exam._id]: {
                            ...prev[exam._id],
                            start_time: e.target.value,
                          },
                        }))
                      }
                      className="bg-white dark:bg-slate-800 px-2 py-1 text-sm rounded border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />

                    <input
                      type="number"
                      placeholder="Duration (min)"
                      value={
                         scheduleData[exam._id]?.duration !== undefined 
                         ? scheduleData[exam._id]?.duration 
                         : (exam.requested_duration_minutes || "")
                      }
                      onChange={(e) =>
                        setScheduleData((prev) => ({
                          ...prev,
                          [exam._id]: {
                            ...prev[exam._id],
                            duration: Number(e.target.value),
                          },
                        }))
                      }
                      className="bg-white dark:bg-slate-800 px-2 py-1 text-sm rounded border border-gray-300 dark:border-slate-700 w-40 text-slate-900 dark:text-white"
                    />

                    <button
                      onClick={() => {
                          // Handle default values if input hasn't triggered onChange
                          const finalStartTime = scheduleData[exam._id]?.start_time !== undefined 
                              ? scheduleData[exam._id]?.start_time 
                              : (exam.requested_start_time ? new Date(exam.requested_start_time).toISOString() : null);
                          const finalDuration = scheduleData[exam._id]?.duration !== undefined 
                              ? scheduleData[exam._id]?.duration 
                              : (exam.requested_duration_minutes || null);
                              
                          if(!finalStartTime || !finalDuration) {
                              alert("Please select a date and duration.");
                              return;
                          }
                          
                          // Convert local string back to ISO for backend if it came from input
                          let formattedTime = finalStartTime;
                          if(finalStartTime.length === 16) {
                              formattedTime = new Date(finalStartTime).toISOString();
                          }
                          
                          // Mocking handleSchedule to use these explicitly, we need to inject them into the state right before calling if missing.
                          // Actually, handleSchedule reads from scheduleData directly. So we should set state and call.
                          setScheduleData(prev => ({
                             ...prev,
                             [exam._id]: { start_time: formattedTime, duration: finalDuration }
                          }));
                          
                          // The easiest way is to let handleSchedule pick up from scheduleData OR default.
                          // Let's rewrite handleSchedule to do this inside.
                          handleScheduleWithDefaults(exam._id, formattedTime, finalDuration);
                      }}
                      className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Schedule & Map Sets
                    </button>
                  </div>
                  </div>
                )}

                {/* ✅ AFTER PUBLISH → ALLOW RESCHEDULE IF NOT EXPIRED */}
                {exam.status === "published" && timeStatus !== "expired" && (
                  <div className="mt-4 flex gap-2 flex-wrap">
                    <input
                      type="datetime-local"
                      onChange={(e) =>
                        setScheduleData((prev) => ({
                          ...prev,
                          [exam._id]: {
                            ...prev[exam._id],
                            start_time: e.target.value,
                          },
                        }))
                      }
                      className="bg-white dark:bg-slate-800 px-2 py-1 text-sm rounded border border-gray-300 dark:border-slate-700 text-slate-900 dark:text-white"
                    />

                    <input
                      type="number"
                      placeholder="Duration (min)"
                      onChange={(e) =>
                        setScheduleData((prev) => ({
                          ...prev,
                          [exam._id]: {
                            ...prev[exam._id],
                            duration: Number(e.target.value),
                          },
                        }))
                      }
                      className="bg-white dark:bg-slate-800 px-2 py-1 text-sm rounded border border-gray-300 dark:border-slate-700 w-40 text-slate-900 dark:text-white"
                    />

                    <button
                      onClick={() => handleSchedule(exam._id)}
                      className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
                    >
                      Reschedule
                    </button>
                  </div>
                )}
                {/* ACTIONS */}
                <div className="mt-4 flex gap-3">
                  {exam.status === "finalized" && exam.start_time && (
                    <button
                      onClick={() => handlePublish(exam._id)}
                      className="bg-emerald-500 text-white hover:bg-emerald-600 px-4 py-2 rounded text-sm"
                    >
                      Publish
                    </button>
                  )}

                  {exam.status === "published" && (
                    <div className="flex items-center gap-4">
                      <span className="text-emerald-400 text-sm">
                        Live for students
                      </span>
                      
                      <button
                        onClick={() => handlePublishResults(exam._id)}
                        className={`text-sm px-4 py-2 rounded transition-colors ${
                          exam.is_results_published
                            ? "bg-purple-600/30 text-purple-400 hover:bg-purple-600/50"
                            : "bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200"
                        }`}
                      >
                        {exam.is_results_published ? "Results Public" : "Release Results"}
                      </button>

                      <button
                        onClick={() => navigate(`/admin/exam/${exam._id}/submissions`)}
                        className="text-sm px-4 py-2 rounded transition-colors bg-blue-600 text-white hover:bg-blue-500 font-semibold"
                      >
                         📋 View Ledger
                      </button>
                    </div>
                  )}

                  {exam.status === "draft" && (
                    <span className="text-slate-500 dark:text-slate-400 text-sm flex items-center">
                      Editable by teacher
                    </span>
                  )}

                  {/* ✅ ARCHIVE BUTTON FOR EXPIRED EXAMS */}
                  {timeStatus === "expired" && (
                    <button
                      onClick={() => handleArchive(exam._id)}
                      className="ml-auto bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-slate-900 dark:text-white border border-red-500/30 px-4 py-2 rounded text-sm transition-colors flex items-center gap-2"
                    >
                      Archive Exam
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
