import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../services/api";

export default function AllExams() {
  const [exams, setExams] = useState([]);
  const navigate = useNavigate();

  const fetchExams = async () => {
    try {
      const res = await API.get("/exam");
      setExams(res.data.exams);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleExamClick = (exam) => {
    if (exam.status === "draft") {
      navigate(`/exam/${exam._id}/preview`);
    } else if (exam.status === "finalized" || exam.status === "scheduled") {
      navigate(`/exam/${exam._id}/finalized`);
    } else if (exam.status === "published") {
      navigate(`/exam/${exam._id}/published`);
    }
  };

  // 🔥 DELETE FUNCTION
  const handleDelete = async (e, examId) => {
    e.stopPropagation();

    const confirmDelete = window.confirm(
      "Are you sure you want to delete this exam?",
    );

    if (!confirmDelete) return;

    try {
      await API.delete(`/exam/${examId}`);
      setExams((prev) => prev.filter((e) => e._id !== examId));
    } catch (err) {
      alert(err.response?.data?.detail || "Delete failed");
    }
  };

  // 🔥 NEW: REQUEST SCHEDULE
  const handleRequestSchedule = async (e, examId) => {
    e.stopPropagation();
    try {
      await API.put(`/exam/${examId}/request-schedule`);

      // 🔥 REFRESH FROM BACKEND (BEST FIX)
      fetchExams();

      alert("📩 Schedule request sent to admin");
    } catch (err) {
      alert(err.response?.data?.detail || "Request failed");
    }
  };

  const handleRequestUnlock = async (e, examId) => {
    e.stopPropagation();
    try {
      await API.put(`/exam/${examId}/request-unlock`);

      fetchExams();

      alert("🔓 Unlock request sent to admin");
    } catch (err) {
      alert(err.response?.data?.detail || "Request failed");
    }
  };

  // 🔥 FORMAT DATE
  const formatDate = (date) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // 🔥 STATUS STYLE
  const getStatusStyle = (status) => {
    switch (status) {
      case "finalized":
        return "bg-green-600/20 text-green-400";
      case "scheduled":
        return "bg-purple-600/20 text-purple-400";
      case "published":
        return "bg-blue-600/20 text-blue-400";
      default:
        return "bg-yellow-500/20 text-yellow-400";
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      {/* HEADER */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold">All Exams</h2>

        <button
          onClick={() => navigate("/create-exam")}
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm shadow-md"
        >
          + Create Exam
        </button>
      </div>

      {/* GRID */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exams.map((exam) => (
          <div
            key={exam._id}
            onClick={() => handleExamClick(exam)}
            className="relative bg-slate-900 border border-slate-800 p-5 rounded-2xl cursor-pointer 
                       hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10 
                       transition duration-300 group"
          >
            {/* DELETE BUTTON */}
            <button
              onClick={(e) => handleDelete(e, exam._id)}
              className="absolute top-3 right-3 text-gray-400 hover:text-red-500"
              title="Delete Exam"
            >
              🗑
            </button>

            {/* TITLE */}
            <h3 className="text-lg font-semibold mb-1 group-hover:text-blue-400 transition">
              {exam.exam_name}
            </h3>

            {/* SUBJECT */}
            <p className="text-sm text-gray-400 mb-2">{exam.subject_code}</p>

            {/* META INFO */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Semester {exam.semester}</p>
              <p>Type: {exam.exam_type?.toUpperCase()}</p>
              <p>Pattern: {exam.pattern?.toUpperCase()}</p>
              <p>Duration: {exam.duration_minutes} min</p>
            </div>

            {/* EXTRA DETAILS */}
            <div className="mt-3 text-xs text-gray-400 space-y-1 border-t border-slate-800 pt-3">
              <p>{exam.teacher_name || "Unknown"}</p>
              <p>{formatDate(exam.created_at)}</p>
            </div>

            {/* STATUS */}
            <div className="mt-4 flex items-center justify-between">
              <span
                className={`px-3 py-1 text-xs rounded-full font-medium ${getStatusStyle(
                  exam.status,
                )}`}
              >
                {exam.status.toUpperCase()}
              </span>

              <span className="text-xs text-gray-500 group-hover:text-blue-400 transition">
                {exam.status === "draft" ? "Edit" : "View"} →
              </span>
            </div>

            {/* 🔥 NEW BUTTONS (ONLY FOR FINALIZED) */}
            {(exam.status === "finalized" || exam.status === "scheduled") && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={(e) => handleRequestSchedule(e, exam._id)}
                  disabled={exam.status === "scheduled"}
                  className={`flex-1 text-xs py-2 rounded ${
                    exam.status === "scheduled"
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  Request Schedule
                </button>

                <button
                  onClick={(e) => handleRequestUnlock(e, exam._id)}
                  disabled={exam.status === "scheduled"}
                  className={`flex-1 text-xs py-2 rounded ${
                    exam.status === "scheduled"
                      ? "bg-gray-600 cursor-not-allowed"
                      : "bg-yellow-500 hover:bg-yellow-600"
                  }`}
                >
                  Request Unlock
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {exams.length === 0 && (
        <div className="text-center text-gray-500 mt-20">
          No exams found 🚀 <br />
          Create your first exam!
        </div>
      )}
    </div>
  );
}
