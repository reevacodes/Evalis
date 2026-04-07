import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useExam } from "../context/ExamContext";
import { finalizeExam, generateSmartQuestions } from "../services/api";

export default function ExamBuilder() {
  const navigate = useNavigate();

  const { selectedQuestions, addQuestion, removeQuestion, clearQuestions } =
    useExam();

  const [important, setImportant] = useState({});
  const [loading, setLoading] = useState(false);

  // ⭐ Toggle important
  const toggleImportant = (id) => {
    setImportant((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 🔥 FETCH AI QUESTIONS (REAL FIX)
  const handleGenerateAI = async () => {
    try {
      const examId = localStorage.getItem("exam_id");

      const res = await generateSmartQuestions(examId);

      console.log("🔥 API RESPONSE:", res.data);

      // ✅ IMPORTANT FIX
      res.data.questions.forEach((q) => {
        addQuestion(q);
      });
    } catch (err) {
      console.error("AI generation failed:", err);
      alert("Failed to generate AI questions");
    }
  };

  // 🔥 FINALIZE EXAM
  const handleFinalize = async () => {
    if (selectedQuestions.length === 0) {
      alert("Add at least 1 question!");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        exam_id: localStorage.getItem("exam_id"),
        questions: selectedQuestions.map((q) => ({
          question: q.question,
          difficulty: q.difficulty,
        })),
      };

      await finalizeExam(payload);

      alert("Exam finalized successfully!");

      clearQuestions();
      navigate("/exams");
    } catch (err) {
      console.error(err);
      alert("Failed to finalize exam");
    } finally {
      setLoading(false);
    }
  };

  // 🎨 Source styling
  const getSourceStyle = (source) => {
    if (source === "bank") return "bg-green-600";
    if (source === "previous_paper") return "bg-yellow-500 text-black";
    if (source === "mcq") return "bg-blue-600";
    if (source === "coding") return "bg-purple-600";
    return "bg-blue-600";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-2xl font-bold text-blue-500 mb-6">Exam Builder</h1>

      <div className="bg-slate-900 border border-slate-700 p-4 rounded-lg mb-6">
        <h2 className="text-lg font-semibold mb-3">
          Selected Questions ({selectedQuestions.length})
        </h2>

        {/* QUESTIONS */}
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
          {selectedQuestions.map((q) => (
            <div
              key={q.id}
              className="flex justify-between items-center bg-slate-800 p-3 rounded-lg hover:border-blue-500 border border-transparent transition"
            >
              {/* LEFT */}
              <div className="flex flex-col gap-1">
                <p className="text-gray-200">
                  {q.question || "⚠️ Invalid Question"}
                </p>

                <div className="flex gap-2 items-center text-xs">
                  <span
                    className={`px-2 py-1 rounded ${getSourceStyle(q.source)}`}
                  >
                    {q.source}
                  </span>

                  <span className="bg-slate-700 px-2 py-1 rounded">
                    {q.difficulty}
                  </span>
                </div>
              </div>

              {/* RIGHT */}
              <div className="flex gap-2">
                <button
                  onClick={() => toggleImportant(q.id)}
                  className={`px-2 py-1 rounded ${
                    important[q.id]
                      ? "bg-yellow-500 text-black"
                      : "bg-slate-700"
                  }`}
                >
                  ⭐
                </button>

                <button
                  onClick={() => removeQuestion(q.id)}
                  className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {selectedQuestions.length === 0 && (
            <p className="text-gray-400 text-sm">No questions generated yet</p>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <button
            onClick={() => navigate("/question-bank")}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded"
          >
            Question Bank
          </button>

          <button
            onClick={handleGenerateAI}
            className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded"
          >
            Fill with AI
          </button>

          <button
            onClick={handleFinalize}
            disabled={loading}
            className={`px-4 py-2 rounded ${
              loading
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {loading ? "Finalizing..." : "Finalize Exam"}
          </button>
        </div>
      </div>
    </div>
  );
}
