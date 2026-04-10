import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam } from "../services/api";
import SuccessModal from "../components/SuccessModal";

export default function PreviewExam() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showSuccess, setShowSuccess] = useState(false);

  // =========================
  // FETCH EXAM
  // =========================
  const loadExam = async () => {
    try {
      const data = await fetchExam(examId);

      setExam({
        ...data,
        sections: data?.sections || [],
      });
    } catch (err) {
      console.error(err);
      setError("Failed to load exam");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (examId) loadExam();
  }, [examId]);





  // =========================
  // CHECK IF QUESTIONS EXIST
  // =========================
  const hasQuestions =
    exam?.sections?.length > 0 &&
    exam.sections.every(
      (sec) =>
        sec.questions &&
        sec.questions.length > 0 &&
        sec.questions.length === sec.count,
    );

  // =========================
  // UI STATES
  // =========================
  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (error) return <p className="text-red-400 p-6">{error}</p>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">Preview Exam</h1>
          <p className="text-slate-400 text-sm">
            Configure sections before generating questions
          </p>
        </div>

        {/* =========================
            EXAM DETAILS
        ========================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Exam Details</h2>

          <div className="grid grid-cols-2 gap-4 text-sm text-slate-300">
            <p>
              <strong>Name:</strong> {exam.exam_name}
            </p>
            <p>
              <strong>Subject:</strong> {exam.subject_code}
            </p>
            <p>
              <strong>Teacher:</strong> {exam.teacher_name}
            </p>
            <p>
              <strong>Semester:</strong> {exam.semester}
            </p>
            <p>
              <strong>Type:</strong> {exam.exam_type}
            </p>
            <p>
              <strong>Pattern:</strong> {exam.pattern}
            </p>
            <p>
              <strong>Units:</strong> {exam.units?.join(", ")}
            </p>
            <p>
              <strong>Duration:</strong> {exam.duration_minutes} min
            </p>
            <p>
              <strong>Status:</strong> {exam.status}
            </p>
          </div>

          {/* EDIT */}
          <button
            onClick={() =>
              navigate("/create-exam", {
                state: { ...exam, exam_id: examId },
              })
            }
            className="mt-4 bg-yellow-600 hover:bg-yellow-700 px-4 py-2 rounded"
          >
            Edit Exam Details
          </button>
        </div>

        {/* =========================
            SECTIONS
        ========================= */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Exam Sections</h2>

          {exam.sections.length > 0 ? (
            exam.sections.map((section, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center bg-slate-800 p-4 rounded mb-3"
              >
                <div>
                  <p className="font-medium">
                    Section {String.fromCharCode(65 + idx)}
                  </p>
                  <p className="text-sm text-slate-400">
                    {section.type.toUpperCase()} • {section.count} Questions
                  </p>
                </div>

              </div>
            ))
          ) : (
            <p className="text-slate-400">No sections found.</p>
          )}
        </div>

        {/* =========================
            GENERATE / NEXT BUTTON
        ========================= */}
        <div className="mt-8 flex justify-end">
          <button
            onClick={() => navigate(`/exam/${examId}/edit`)}
            className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-semibold"
          >
            Curate Seed Pool & Edit Exam ➔
          </button>
        </div>

        {/* =========================
            SUCCESS MODAL
        ========================= */}
        {showSuccess && (
          <SuccessModal
            title="Questions Generated"
            message="Your exam questions are ready!"
          />
        )}
      </div>
    </div>
  );
}
