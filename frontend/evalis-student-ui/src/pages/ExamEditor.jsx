import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam, finalizeExam, deleteExamQuestion, addBulkQuestions, addQuestionsToExam } from "../services/api";
import SuccessModal from "../components/SuccessModal";
import * as XLSX from "xlsx";

export default function ExamEditor() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadModal, setUploadModal] = useState({ show: false, title: "", message: "", isError: false });

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
      if (data.status === "published") {
        navigate(`/exam/${examId}/published`);
        return;
      }
      if (data.status !== "draft") {
        navigate(`/exam/${examId}/finalized`);
        return;
      }

      // Normalize sections to ensure questions array exists
      if (data.sections) {
        data.sections = data.sections.map((sec) => ({
          ...sec,
          questions: sec.questions || [],
        }));
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

  const handleExcelUpload = async (e, sectionType, secIdx) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const targetSection = exam.sections[secIdx];
      const maxAllowed = targetSection.count - (targetSection.questions?.length || 0);

      if (maxAllowed <= 0) {
        alert("⚠️ Section is already full.");
        return;
      }

      setLoading(true);

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (!jsonData || jsonData.length === 0) {
        alert("The Excel file is empty!");
        return;
      }

      // Map to strict Question schema
      const mappedQuestions = jsonData.map((row) => {
        let optionsList = [];
        let correctAnswer = row.correct_answer || row.answer || null;
        
        if (sectionType === "mcq") {
          if (row.options) {
             optionsList = String(row.options).split(",").map(o => o.trim()).filter(o => o);
          } else {
             optionsList = ["Option A", "Option B", "Option C", "Option D"];
          }
          if (!correctAnswer && optionsList.length > 0) correctAnswer = optionsList[0];
        }

        let codingExtras = {};
        if (sectionType === "coding") {
             codingExtras = {
                language: row.language || "c",
                input_format: row.input_format || "Single input",
                output_format: row.output_format || "Single output",
                constraints: row.constraints || "None",
                time_limit: Number(row.time_limit) || 2.0,
                memory_limit: Number(row.memory_limit) || 256,
                sample_test_cases: [
                   { 
                      input: String(row.sample_input || "1"), 
                      expected_output: String(row.sample_output || "1") 
                   }
                ],
                hidden_test_cases: [
                   { 
                      input: String(row.hidden_input || "2"), 
                      expected_output: String(row.hidden_output || "2") 
                   }
                ]
             };
             if (row.starter_code) {
                 codingExtras.starter_code = { [codingExtras.language]: String(row.starter_code) };
             }
        }

        // Get units value correctly
        let fallbackUnit = 1;
        if (Array.isArray(exam.units) && exam.units.length > 0) {
          // Parse number if it's like "Unit 1"
          const match = String(exam.units[0]).match(/\d+/);
          if (match) fallbackUnit = parseInt(match[0]);
        }

        return {
          semester: exam.semester || 1,
          subject_code: exam.subject_code || "UNKNOWN",
          subject_name: exam.subject_name || exam.subject_code || "Unknown Subject",
          unit: fallbackUnit,
          topic: row.topic || "General",
          
          question_text: row.question_text || row.question || "Untitled Question",
          question_type: sectionType,
          marks: Number(row.marks) || (sectionType === "mcq" ? 1 : 5),
          difficulty: (row.difficulty || "medium").toLowerCase(),
          tags: row.tags ? String(row.tags).split(",").map(t=>t.trim()) : [],

          ...(sectionType === "mcq" && {
             options: optionsList,
             correct_answer: String(correctAnswer)
          }),
          ...(sectionType === "coding" && codingExtras),
        };
      });

      // Slice the questions to respect section limits
      const questionsToUpload = mappedQuestions.slice(0, maxAllowed);

      // POST /questions/bulk
      const bulkRes = await addBulkQuestions(questionsToUpload);
      const insertedIds = bulkRes?.data?.inserted_ids || bulkRes?.inserted_ids || [];

      if (insertedIds.length > 0) {
        // POST /exam/{examId}/add-questions
        await addQuestionsToExam(examId, {
           section_index: secIdx,
           question_ids: insertedIds
        });
        setUploadModal({
           show: true,
           title: "Import Successful! 🎉",
           message: `Successfully mapped and attached ${insertedIds.length} question(s) to this section!`,
           isError: false
        });
      } else {
        setUploadModal({
           show: true,
           title: "Import Skipped ⚠️",
           message: "No valid new questions were uploaded.",
           isError: true
        });
      }

    } catch (err) {
      console.error(err);
      setUploadModal({
         show: true,
         title: "Upload Failed ❌",
         message: "Failed to parse or map the Excel file.",
         isError: true
      });
    } finally {
      await loadExam();
      if (e.target) e.target.value = null; // Clear input
    }
  };


  const handleFinalize = async () => {
    try {
      if (exam.sections.some(s => s.questions.length === 0)) {
         if (!window.confirm("You have empty sections in your seed pool. The system will rely purely on random db padding to fill them. Are you sure you want to finalize?")) {
           return;
         }
      }
      
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

  if (loading) return <p className="text-slate-900 dark:text-white p-6">Loading...</p>;
  if (!exam) return <p className="text-red-400 p-6">Exam not found</p>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-gray-200 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{exam.exam_name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Edit Exam Paper</p>
        </div>

        {/* SECTIONS */}
        {exam.sections?.map((section, secIdx) => {
          const currentCount = section.questions?.length || 0;
          const isFull = currentCount >= section.count;

          return (
            <div
              key={secIdx}
              className="mb-8 bg-gray-50 dark:bg-slate-900 p-6 rounded-lg border border-gray-200 dark:border-slate-800"
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
                    className="mb-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-gray-300 dark:border-slate-700"
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
                                  : "bg-gray-50 dark:bg-slate-900 border-gray-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
                              }`}
                            >
                              {String.fromCharCode(65 + i)}. {opt}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {section.type === "coding" && (
                      <div className="text-sm text-slate-500 dark:text-slate-400 space-y-1">
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
                      <button
                        onClick={() => handleDeleteQuestion(secIdx, qIdx)}
                        className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                      >
                        Delete
                      </button>

                      {correct && (
                        <span className="text-green-400 text-sm">
                          ✔ {correct}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* ACTIONS */}
              <div className="flex gap-3 mt-3">
                <button
                  onClick={() => {
                    if (isFull) {
                      alert("⚠️ Section is already full.");
                      return;
                    }
                    handleAddFromBank(section.type, secIdx);
                  }}
                  className={`px-4 py-2 rounded text-sm ${
                    isFull
                      ? "bg-gray-600 opacity-50 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {isFull ? "Section Full" : "+ Add from Question Bank"}
                </button>

                <label
                  className={`flex items-center justify-center px-4 py-2 rounded text-sm transition-colors cursor-pointer ${
                    isFull
                      ? "bg-gray-600 opacity-50 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {isFull ? "Section Full" : "📥 Import from Excel"}
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    disabled={isFull}
                    onChange={(e) => handleExcelUpload(e, section.type, secIdx)}
                  />
                </label>
              </div>
            </div>
          );
        })}

        {/* FINALIZE */}
        <div className="flex justify-end mt-8">
          <button
            onClick={handleFinalize}
            className="bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-semibold"
          >
            Finalize & Lock Exam 🔒
          </button>
        </div>

        {/* UNDO */}
        {lastDeleted && (
          <div className="fixed bottom-6 right-6 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
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

        {/* EXCEL UPLOAD MODAL */}
        {uploadModal.show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm transition-opacity">
            <div className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center transform scale-100 flex flex-col items-center animate-in fade-in zoom-in duration-200">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${uploadModal.isError ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'} text-3xl shadow-inner`}>
                {uploadModal.isError ? '⚠️' : '🎉'}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 tracking-wide">{uploadModal.title}</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 leading-relaxed bg-white dark:bg-slate-950/50 p-4 rounded-xl w-full border border-gray-200 dark:border-slate-800 font-medium">
                {uploadModal.message}
              </p>
              <button 
                onClick={() => setUploadModal({ show: false, title: "", message: "", isError: false })}
                className={`w-full py-3 rounded-xl font-bold transition-all duration-300 ${
                   uploadModal.isError 
                     ? 'bg-white dark:bg-slate-800 hover:bg-gray-100 dark:bg-slate-700 text-slate-900 dark:text-white border border-gray-300 dark:border-slate-700' 
                     : 'bg-green-600 hover:bg-green-500 text-slate-900 dark:text-white shadow-lg shadow-green-600/30'
                }`}
              >
                 {uploadModal.isError ? "Dismiss" : "Awesome"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
