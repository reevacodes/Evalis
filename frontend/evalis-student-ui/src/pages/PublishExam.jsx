import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam } from "../services/api";

export default function PublishExam() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const getQuestionText = (q) => {
    return q?.question || q?.question_text || q?.q || "⚠️ Question missing";
  };

  const getCorrectAnswer = (q) => {
    return q?.answer || q?.correct_answer || null;
  };

  const loadExam = async () => {
    try {
      const res = await fetchExam(examId);
      const data = res.data;

      // 🚨 PROTECT ROUTE
      if (data.status === "draft") {
        navigate(`/exam/${examId}/edit`);
        return;
      }

      if (data.status === "finalized") {
        navigate(`/exam/${examId}/finalized`);
        return;
      }

      setExam(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, []);

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (!exam) return <p className="text-red-400 p-6">Exam not found</p>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{exam.exam_name}</h1>
          <p className="text-slate-400 text-sm">Published Exam</p>
        </div>

        {/* SECTIONS */}
        {exam.sections?.map((section, secIdx) => {
          return (
            <div
              key={secIdx}
              className="mb-8 bg-slate-900 p-6 rounded-lg border border-slate-800"
            >
              <h2 className="text-lg font-semibold mb-4">
                Section {String.fromCharCode(65 + secIdx)} —{" "}
                {section.type.toUpperCase()}
              </h2>

              {section.questions.map((q, qIdx) => {
                const correct = getCorrectAnswer(q);

                return (
                  <div
                    key={qIdx}
                    className="mb-4 p-4 bg-slate-800 rounded-lg border border-slate-700"
                  >
                    <p className="font-medium mb-3">
                      Q{qIdx + 1}. {getQuestionText(q)}
                    </p>

                    {section.type === "mcq" && (
                      <div className="space-y-2 text-sm">
                        {q.options?.map((opt, i) => {
                          const isCorrect =
                            opt === correct ||
                            String.fromCharCode(65 + i) === correct;

                          return (
                            <div
                              key={i}
                              className={`px-3 py-2 rounded-md border ${
                                isCorrect
                                  ? "bg-green-600/20 border-green-500 text-green-300 font-semibold"
                                  : "bg-slate-900 border-slate-700 text-slate-300"
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {section.type === "coding" && (
                      <div className="text-sm text-slate-400 space-y-1">
                        <p>
                          <strong>Difficulty:</strong>{" "}
                          {q.difficulty || "Medium"}
                        </p>
                        <p>
                          <strong>Marks:</strong> {q.marks || 5}
                        </p>
                      </div>
                    )}

                    {correct && (
                      <div className="mt-3 text-green-400 text-sm">
                        ✔ {correct}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
