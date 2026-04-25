import { useLocation } from "react-router-dom";
import { useState } from "react";
import { finalizeExam } from "../services/api";

export default function DraftPreview() {
  const location = useLocation();

  const examId = location.state?.exam_id;
  const initialQuestions = location.state?.questions || [];

  const [questions, setQuestions] = useState(initialQuestions);

  // ✏️ Edit
  const editQuestion = (index, value) => {
    const updated = [...questions];
    updated[index].question = value;
    setQuestions(updated);
  };

  // ❌ Remove
  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  // ✅ Finalize
  const handleFinalize = async () => {
    try {
      await finalizeExam({
        exam_id: examId,
        questions: questions,
      });

      alert("Exam finalized successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to finalize exam");
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Draft Exam Preview</h1>

      <div className="space-y-4">
        {questions.map((q, i) => (
          <div
            key={i}
            className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-4 rounded"
          >
            <input
              value={q.question}
              onChange={(e) => editQuestion(i, e.target.value)}
              className="input w-full"
            />

            <button
              onClick={() => removeQuestion(i)}
              className="mt-2 bg-red-600 px-3 py-1 rounded"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={handleFinalize}
        className="mt-6 bg-green-600 px-6 py-2 rounded"
      >
        Finalize Exam →
      </button>
    </div>
  );
}
