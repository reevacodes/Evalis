import { useState, useEffect } from "react";
import { deleteQuestion } from "../services/api";
import EditQuestionModal from "./EditQuestionModal";
import { motion, AnimatePresence } from "framer-motion";

export default function QuestionList({ questions, reload, onSelect }) {
  const [localQuestions, setLocalQuestions] = useState([]); // 🔥 NEW
  const [showEdit, setShowEdit] = useState(false);
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [codeMap, setCodeMap] = useState({});
  const [languageMap, setLanguageMap] = useState({});

  const getId = (q) => q.id || q._id;
  const getText = (q) => q?.question || q?.question_text || q?.q || "No text";

  // 🔥 sync props → local state
  useEffect(() => {
    setLocalQuestions(questions || []);
    setExpanded(null);
    setCodeMap({});
    setLanguageMap({});
  }, [questions]);

  // =========================
  // 🔥 LOCAL UPDATE (MAIN FIX)
  // =========================
  const updateQuestionLocally = (updatedQ) => {
    setLocalQuestions((prev) =>
      prev.map((q) =>
        getId(q) === getId(updatedQ) ? { ...q, ...updatedQ } : q,
      ),
    );
  };

  // =========================
  // DELETE
  // =========================
  const handleDelete = async (id) => {
    if (!window.confirm("Delete this question?")) return;

    try {
      await deleteQuestion(id);

      // 🔥 remove locally instead of reload
      setLocalQuestions((prev) => prev.filter((q) => getId(q) !== id));
    } catch {
      alert("Delete failed");
    }
  };

  // =========================
  // EDIT
  // =========================
  const handleEdit = (q) => {
    setSelected(q);
    setShowEdit(true);
  };

  // =========================
  // ADD / SELECT
  // =========================
  const handleAdd = (q) => {
    if (onSelect) {
      onSelect(q);
    } else {
      console.log("➕ Add (no handler):", q);
    }
  };

  if (!localQuestions || localQuestions.length === 0) {
    return (
      <div className="text-center text-gray-400 mt-10">
        🚫 No questions found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {localQuestions.map((q) => {
          const qid = getId(q);
          const isOpen = expanded === qid;

          const preview =
            getText(q).length > 80
              ? getText(q).slice(0, 80) + "..."
              : getText(q);

          return (
            <motion.div
              key={qid}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`bg-slate-900 border border-slate-700 rounded-xl overflow-hidden transition ${
                onSelect ? "hover:border-indigo-500 cursor-pointer" : ""
              }`}
            >
              {/* HEADER */}
              <div
                onClick={() => setExpanded(isOpen ? null : qid)}
                className="px-4 py-3 flex justify-between items-center hover:bg-slate-800"
              >
                <h2 className="text-sm md:text-base font-medium">{preview}</h2>
                <span className="text-xs text-gray-400">
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {/* EXPANDED */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    key="content"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="px-4 pb-4"
                  >
                    <p className="text-sm text-gray-300 mb-3 whitespace-pre-line">
                      {getText(q)}
                    </p>

                    <p className="text-sm text-gray-400 mb-3">
                      {q.subject_name || "No Subject"} • {q.topic} •{" "}
                      <span className="capitalize">{q.difficulty}</span> •{" "}
                      <span className="uppercase text-indigo-400 font-semibold">
                        {q.question_type}
                      </span>
                    </p>

                    {/* MCQ */}
                    {q.question_type === "mcq" && q.options && (
                      <ul className="mb-3 space-y-1 text-gray-300">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={`px-2 py-1 rounded ${
                              opt === q.correct_answer
                                ? "bg-green-600/30 text-green-300"
                                : "bg-slate-800"
                            }`}
                          >
                            {opt}
                          </li>
                        ))}
                      </ul>
                    )}

                    {/* CODING */}
                    {q.question_type === "coding" && (
                      <div className="space-y-4 text-sm text-gray-300">
                        <div>
                          <h3 className="text-indigo-400 font-semibold mb-1">
                            Problem Description
                          </h3>
                          <p className="whitespace-pre-line">
                            {q.description ||
                              q.problem_description ||
                              getText(q)}
                          </p>
                        </div>

                        {q.input_format && (
                          <div>
                            <h3 className="text-indigo-400 font-semibold mb-1">
                              Input Format
                            </h3>
                            <p className="whitespace-pre-line">
                              {q.input_format}
                            </p>
                          </div>
                        )}

                        {q.output_format && (
                          <div>
                            <h3 className="text-indigo-400 font-semibold mb-1">
                              Output Format
                            </h3>
                            <p className="whitespace-pre-line">
                              {q.output_format}
                            </p>
                          </div>
                        )}

                        {q.constraints && (
                          <div>
                            <h3 className="text-indigo-400 font-semibold mb-1">
                              Constraints
                            </h3>
                            <p className="whitespace-pre-line">
                              {q.constraints}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ACTIONS */}
                    <div className="flex gap-2 mt-4">
                      {onSelect && (
                        <button
                          onClick={() => handleAdd(q)}
                          className="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-500"
                        >
                          Select
                        </button>
                      )}

                      <button
                        onClick={() => handleEdit(q)}
                        className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(qid)}
                        className="text-xs px-3 py-1 bg-red-600/20 text-red-400 rounded hover:bg-red-600/30"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* EDIT MODAL */}
      {showEdit && selected && (
        <EditQuestionModal
          question={selected}
          onClose={() => setShowEdit(false)}
          onSuccess={(updatedQ) => {
            updateQuestionLocally(updatedQ); // 🔥 instant UI update
            setShowEdit(false);
          }}
        />
      )}
    </div>
  );
}
