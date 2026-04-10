import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam, finalizeExam, deleteExamQuestion } from "../services/api";
import SuccessModal from "../components/SuccessModal";

export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeSet, setActiveSet] = useState("A");

  const [lastDeleted, setLastDeleted] = useState(null);
  const [undoTimeout, setUndoTimeout] = useState(null);

  const getQuestionText = (q) => {
    return q?.question || q?.question_text || q?.q || "⚠️ Question missing";
  };

  const getCorrectAnswer = (q) => {
    return q?.answer || q?.correct_answer || null;
  };

  const loadExam = async () => {
    try {
      const data = await fetchExam(examId);

      // 🚨 PROTECT ROUTE
      if (data.status !== "draft") {
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

  const handleDeleteQuestion = async (secIdx, qIdx) => {
    try {
      const deletedQuestion = exam.sections[secIdx].questions[qIdx];

      const updatedSections = exam.sections.map((section, i) => {
        if (i !== secIdx) return section;
        return {
          ...section,
          questions: section.questions.filter((_, idx) => idx !== qIdx),
        };
      });

      setExam({ ...exam, sections: updatedSections });

      setLastDeleted({
        question: deletedQuestion,
        secIdx,
        qIdx,
      });

      const timeout = setTimeout(async () => {
        await deleteExamQuestion(examId, secIdx, qIdx);
        setLastDeleted(null);
      }, 4000);

      setUndoTimeout(timeout);
    } catch (err) {
      console.error(err);
      alert("Failed to delete question");
      loadExam();
    }
  };

  const handleUndoDelete = () => {
    if (!lastDeleted) return;

    clearTimeout(undoTimeout);

    const { question, secIdx, qIdx } = lastDeleted;
    const updatedSections = [...exam.sections];
    updatedSections[secIdx].questions.splice(qIdx, 0, question);

    setExam({ ...exam, sections: updatedSections });
    setLastDeleted(null);
  };

  const handleAddFromBank = (sectionType, secIdx) => {
    navigate("/question-bank", {
      state: {
        subject_code: exam.subject_code,
        semester: exam.semester,
        units: exam.units,
        exam_id: examId,
        section_index: secIdx,
        section_type: sectionType,
        max_count: exam.sections[secIdx].count,
        existing_ids: exam.sections[secIdx].questions.map(q => q._id || q.id)
      },
    });
  };

  const handleFinalize = async () => {
    try {
      await finalizeExam(examId);

      // ✅ update UI instantly
      setExam((prev) => ({ ...prev, status: "finalized" }));

      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        navigate(`/exam/${examId}/finalized`); // 🚀 redirect
      }, 1500);
    } catch (err) {
      console.error(err);
      alert("Failed to finalize exam");
    }
  };

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (!exam) return <p className="text-red-400 p-6">Exam not found</p>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{exam.exam_name}</h1>
          <p className="text-slate-400 text-sm">Edit Exam Paper</p>
        </div>

        {/* SET SWITCHER (ONLY IF GENERATED) */}
        {exam.sets && Object.keys(exam.sets).length > 0 && (
          <div className="mb-6 flex gap-3">
            {Object.keys(exam.sets).map((setKey) => (
              <button
                key={setKey}
                onClick={() => setActiveSet(setKey)}
                className={`px-4 py-2 flex-1 rounded-lg border font-semibold transition-all ${
                  activeSet === setKey
                    ? "bg-indigo-600 border-indigo-500 text-white"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                }`}
              >
                Preview Set {setKey}
              </button>
            ))}
          </div>
        )}

        {/* SECTIONS */}
        {(exam.sets ? exam.sets[activeSet] : exam.sections)?.map((section, secIdx) => {
          const currentCount = section.questions?.length || 0;
          const isFull = currentCount >= section.count;

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

                    <div className="flex justify-between mt-4">
                      {!exam.sets ? (
                        <button
                          onClick={() => handleDeleteQuestion(secIdx, qIdx)}
                          className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                        >
                          Delete
                        </button>
                      ) : (
                        <div />
                      )}

                      {correct && (
                        <span className="text-green-400 text-sm">
                          ✔ {correct}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ADD BUTTON */}
              {!exam.sets && (
                <button
                  onClick={() => {
                    if (isFull) {
                      alert("⚠️ Section is already full.");
                      return;
                    }
                    handleAddFromBank(section.type, secIdx);
                  }}
                  className={`mt-3 px-4 py-2 rounded text-sm ${
                    isFull
                      ? "bg-gray-600 opacity-50 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isFull ? "Section Full" : "+ Add from Question Bank"}
                </button>
              )}
            </div>
          );
        })}

        {/* FINALIZE */}
        <div className="flex justify-end">
          <button
            onClick={handleFinalize}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg"
          >
            Finalize Exam
          </button>
        </div>

        {/* UNDO */}
        {lastDeleted && (
          <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <span className="text-sm">Question deleted</span>
            <button
              onClick={handleUndoDelete}
              className="bg-yellow-500 hover:bg-yellow-600 px-3 py-1 rounded text-sm"
            >
              Undo
            </button>
          </div>
        )}

        {showSuccess && (
          <SuccessModal
            title="Exam Finalized 🎯"
            message="Your exam is now locked and ready."
          />
        )}
      </div>
    </div>
  );
}
