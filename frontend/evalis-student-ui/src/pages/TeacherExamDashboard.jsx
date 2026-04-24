import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllExams, deleteExam } from "../services/api";
import { formatDateTime } from "../utils/formatDate";

export default function TeacherExamDashboard() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);

  const navigate = useNavigate();

  const fetchExams = async () => {
    try {
      const res = await getAllExams();

      // ✅ FIX: correct backend shape
      setExams(res.data.exams || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  // ================= TIME STATUS =================
  const getTimeStatus = (exam) => {
    if (!exam.start_time) return "unscheduled";

    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(
      start.getTime() + (exam.duration_minutes || 30) * 60000,
    );

    if (now < start) return "scheduled";
    if (now >= start && now <= end) return "active";
    return "expired";
  };

  const getTimeBadge = (exam) => {
    const t = getTimeStatus(exam);

    if (t === "scheduled")
      return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    if (t === "active")
      return "bg-green-500/20 text-green-400 border border-green-500/30";
    if (t === "expired")
      return "bg-red-500/20 text-red-400 border border-red-500/30";

    return "bg-slate-600/20 text-slate-400 border border-slate-600/30";
  };

  const getStatusBadge = (exam) => {
    const s = exam.status;

    if (s === "draft")
      return "bg-gray-500/20 text-gray-400 border border-gray-500/30";

    if (s === "finalized")
      return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";

    if (s === "requested")
      return "bg-purple-500/20 text-purple-400 border border-purple-500/30";

    if (s === "published")
      return "bg-green-500/20 text-green-400 border border-green-500/30";

    return "bg-slate-600/20 text-slate-400 border border-slate-600/30";
  };

  // ================= DELETE =================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this exam?")) return;

    try {
      await deleteExam(id);
      setExams((prev) => prev.filter((e) => e._id !== id));
    } catch (err) {
      console.error(err);
      alert("Delete failed");
    }
  };

  // ================= EDIT =================
  const handleEdit = (exam) => {
    setSelectedExam(exam);
    setShowModal(true);
  };

  const handleEditChoice = (type) => {
    setShowModal(false);

    if (type === "topics") {
      navigate("/topic-editor", {
        state: {
          exam_id: selectedExam._id,
          units: selectedExam.extracted_topics || {},
        },
      });
    }

    if (type === "questions") {
      navigate("/exam-builder", {
        state: {
          exam_id: selectedExam._id,
        },
      });
    }
  };

  // ================= VIEW =================
  const handleView = (exam) => {
    if (exam.status === "draft") {
      if (exam.generated_at) {
        navigate(`/exam/${exam._id}/edit`);
      } else {
        navigate(`/exam/${exam._id}/preview`);
      }
    } else if (exam.status === "finalized" || exam.status === "scheduled") {
      navigate(`/exam/${exam._id}/finalized`);
    } else if (exam.status === "published") {
      navigate(`/exam/${exam._id}/published`);
    }
  };

  const stats = {
    total: exams.length,
    drafts: exams.filter((e) => e.status === "draft").length,
    published: exams.filter((e) => e.status === "published").length,
    active: exams.filter((e) => getTimeStatus(e) === "active").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-8">
        Loading exams...
      </div>
    );
  }
  const user = JSON.parse(localStorage.getItem("user"));
  const formatStatus = (status) =>
    status?.charAt(0).toUpperCase() + status?.slice(1);
  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-500">All Exams</h1>
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-gray-400">Total</p>
          <h2 className="text-xl font-bold">{stats.total}</h2>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-gray-400">Drafts</p>
          <h2 className="text-xl font-bold">{stats.drafts}</h2>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-gray-400">Published</p>
          <h2 className="text-xl font-bold">{stats.published}</h2>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-700">
          <p className="text-sm text-gray-400">Active</p>
          <h2 className="text-xl font-bold">{stats.active}</h2>
        </div>
      </div>

      <div className="space-y-4">
        {exams.map((exam) => {
          const timeStatus = getTimeStatus(exam);
          const canDelete =
            (user?.role === "teacher" && exam.status === "draft") ||
            (user?.role === "admin" && exam.status !== "draft");
          const canEdit = exam.status === "draft";

          return (
            <div
              key={exam._id}
              className="bg-slate-900 border border-slate-700 p-4 rounded-xl flex justify-between items-center hover:border-blue-500 transition"
            >
              {/* LEFT */}
              <div>
                <h2 className="font-semibold text-lg">
                  {exam.exam_name || "Untitled Exam"}
                </h2>

                <p className="text-sm text-gray-400">
                  {exam.subject} • {exam.course_code}
                </p>

                <p className="text-xs text-gray-500">
                  {exam.exam_type} • {exam.duration_minutes} mins
                </p>

                {/* ✅ START TIME */}
                {exam.start_time && (
                  <p className="text-xs text-blue-400 mt-1">
                    Starts: {formatDateTime(exam.start_time)}
                  </p>
                )}
              </div>

              {/* RIGHT */}
              <div className="flex items-center gap-3">
                {/* STATUS BADGE */}
                <span
                  className={`text-xs px-3 py-1 rounded-full capitalize ${getStatusBadge(exam)}`}
                >
                  {formatStatus(exam.status)}
                </span>

                {/* ✅ TIME BADGE */}
                <span
                  className={`text-xs px-3 py-1 rounded-full capitalize ${getTimeBadge(
                    exam,
                  )}`}
                >
                  {timeStatus}
                </span>

                <button
                  onClick={() => handleView(exam)}
                  className="bg-blue-600 px-4 py-1 rounded hover:bg-blue-700"
                >
                  View
                </button>

                {exam.status !== "draft" && (
                  <button
                    onClick={() => navigate(`/teacher/exam/${exam._id}/submissions`)}
                    className="bg-indigo-600 px-4 py-1 rounded hover:bg-indigo-500 font-semibold"
                  >
                    📋 Ledger
                  </button>
                )}

                {canEdit && (
                  <button
                    onClick={() => handleEdit(exam)}
                    className="bg-yellow-500 text-black px-4 py-1 rounded hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                )}

                {canDelete && (
                  <button
                    onClick={() => handleDelete(exam._id)}
                    className="bg-red-600 px-4 py-1 rounded hover:bg-red-700"
                  >
                    {user?.role === "admin" ? "Remove" : "Delete"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {exams.length === 0 && (
          <div className="text-center text-gray-400 mt-10">
            <p className="text-lg">No exams yet</p>
            <p className="text-sm mt-2">
              Create your first exam to get started 🚀
            </p>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
          <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 w-80">
            <h2 className="text-lg font-semibold mb-4">
              What do you want to edit?
            </h2>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleEditChoice("topics")}
                className="bg-blue-600 py-2 rounded hover:bg-blue-700"
              >
                Edit Topics
              </button>

              <button
                onClick={() => handleEditChoice("questions")}
                className="bg-purple-600 py-2 rounded hover:bg-purple-700"
              >
                Edit Questions
              </button>

              <button
                onClick={() => setShowModal(false)}
                className="bg-gray-600 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
