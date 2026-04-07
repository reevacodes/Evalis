import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getQuestions } from "../services/api";
import QuestionList from "../components/QuestionList";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, GraduationCap, Layers, ArrowUpDown } from "lucide-react";

export default function QuestionBank() {
  const location = useLocation();
  const navigate = useNavigate();
  const fromPreview = location.state;

  const [questions, setQuestions] = useState([]);
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(false);

  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });

  const [selection, setSelection] = useState({
    semester: "",
    subject: "",
    unit: "",
    topic: "",
    type: "",
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // =========================
  // AUTO APPLY FILTERS
  // =========================
  useEffect(() => {
    if (fromPreview) {
      setSelection((prev) => ({
        ...prev,
        semester: fromPreview.semester || "",
        subject: fromPreview.subject_code || "",
        unit: "",
        topic: "",
      }));
    }
  }, [fromPreview]);

  // =========================
  // VIEW CONTROL
  // =========================
  const getView = () => {
    if (!selection.semester) return "semester";
    if (!selection.subject) return "subjects";
    if (!selection.unit) return "units";
    if (!selection.topic) return "topics";
    return "questions";
  };

  const getHeading = () => {
    if (getView() === "semester") return "Select Semester";
    if (getView() === "subjects") return `Semester ${selection.semester}`;
    if (getView() === "units") return selection.subject;
    if (getView() === "topics") return `Unit ${selection.unit}`;
    if (getView() === "questions")
      return `${selection.topic} • ${selection.type || "All"}`;
  };

  // =========================
  // FETCH CURRICULUM
  // =========================
  useEffect(() => {
    if (selection.semester) fetchCurriculum();
  }, [selection.semester]);

  const fetchCurriculum = async () => {
    const res = await fetch(
      `http://localhost:8000/curriculum/${selection.semester}`,
    );
    const data = await res.json();
    setCurriculum(data);
  };

  // =========================
  // LOAD QUESTIONS
  // =========================
  const loadQuestions = async () => {
    setLoading(true);

    try {
      console.log("FILTERS:", {
        semester: selection.semester,
        subject: selection.subject,
        unit: selection.unit,
        topic: selection.topic,
      });

      const res = await getQuestions({
        semester: Number(selection.semester), // 🔥 FIX
        subject: selection.subject,
        unit: Number(selection.unit), // 🔥 FIX
        topic: selection.topic,
        question_type: selection.type,
        page: pagination.page,
        limit: 5,
      });

      const data = res.data;

      console.log("API RESPONSE:", data);

      setQuestions(data.data || []);
      setPagination({
        page: data.page || 1,
        totalPages: data.total_pages || 1,
        hasNext: data.has_next || false,
        hasPrev: data.has_prev || false,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      selection.semester &&
      selection.subject &&
      selection.unit &&
      selection.topic
    ) {
      loadQuestions();
    }
  }, [selection, pagination.page]);

  // =========================
  // SEARCH
  // =========================
  const searchQuestions = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);

    try {
      const res = await getQuestions({
        semester: selection.semester,
        subject: selection.subject,
        unit: selection.unit,
        search: query,
        question_type: selection.type,
        page: 1,
        limit: 10,
      });

      setSearchResults(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delay = setTimeout(() => {
      searchQuestions(searchQuery);
    }, 400);

    return () => clearTimeout(delay);
  }, [searchQuery, selection.type]);

  // =========================
  // UPDATE SELECTION
  // =========================
  const updateSelection = (newValues) => {
    setPagination((prev) => ({ ...prev, page: 1 }));
    setSelection((prev) => ({ ...prev, ...newValues }));
  };

  // =========================
  // BACK NAV
  // =========================
  const goBack = () => {
    if (selection.topic) return updateSelection({ topic: "", type: "" });
    if (selection.unit) return updateSelection({ unit: "" });
    if (selection.subject) return updateSelection({ subject: "" });
    if (selection.semester) return updateSelection({ semester: "" });
  };

  const selectedSubject = curriculum?.subjects?.find(
    (s) => s.code === selection.subject,
  );

  const selectedUnit = selectedSubject?.units?.find(
    (u) => u.unit_number === selection.unit,
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {(selection.semester ||
            selection.subject ||
            selection.unit ||
            selection.topic) && (
            <button
              onClick={goBack}
              className="bg-slate-800 px-3 py-2 rounded flex items-center gap-2 hover:bg-slate-700"
            >
              <ArrowLeft size={16} /> Back
            </button>
          )}

          <div>
            <h1 className="text-2xl font-semibold tracking-wide">
              {getHeading()}
            </h1>

            {fromPreview && (
              <p className="text-xs text-indigo-400">Filtered for your exam</p>
            )}
          </div>
        </div>
      </div>

      {/* TYPE SWITCH */}
      {getView() === "questions" && (
        <div className="flex justify-end mb-4">
          <button
            onClick={() => {
              const order = ["", "mcq", "coding"];
              const currentIndex = order.indexOf(selection.type);
              const nextType = order[(currentIndex + 1) % order.length];
              updateSelection({ type: nextType });
            }}
            className="flex items-center gap-2 bg-slate-900 border border-slate-700 
            px-3 py-2 rounded-lg hover:bg-slate-800 transition group"
          >
            <ArrowUpDown size={18} />
            <span className="text-xs text-gray-400">
              {selection.type === ""
                ? "All"
                : selection.type === "mcq"
                  ? "MCQ"
                  : "Code"}
            </span>
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={getView()}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.3 }}
        >
          {/* SEMESTER */}
          {getView() === "semester" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <div
                  key={sem}
                  onClick={() => updateSelection({ semester: sem })}
                  className="h-40 flex flex-col justify-center items-center text-xl font-semibold rounded-2xl cursor-pointer
                  bg-gradient-to-br from-indigo-600/30 to-purple-600/20
                  border border-white/10 backdrop-blur-lg
                  hover:scale-105 hover:border-indigo-400 transition-all duration-300"
                >
                  <GraduationCap className="mb-3 text-indigo-400" size={32} />
                  Semester {sem}
                </div>
              ))}
            </div>
          )}

          {/* SUBJECTS */}
          {getView() === "subjects" && (
            <div className="grid grid-cols-3 gap-6">
              {curriculum?.subjects?.map((s) => (
                <div
                  key={s.code}
                  onClick={() => updateSelection({ subject: s.code })}
                  className="p-6 rounded-xl bg-slate-900 border border-slate-700 hover:border-blue-500 cursor-pointer transition"
                >
                  <Layers className="mb-2" />
                  {s.name}
                </div>
              ))}
            </div>
          )}

          {/* UNITS */}
          {getView() === "units" && (
            <div className="space-y-3">
              {selectedSubject?.units?.map((u) => (
                <div
                  key={u.unit_number}
                  onClick={() => updateSelection({ unit: u.unit_number })}
                  className="p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition"
                >
                  Unit {u.unit_number}
                </div>
              ))}
            </div>
          )}

          {/* TOPICS */}
          {getView() === "topics" && (
            <div className="space-y-4">
              {selectedUnit?.topics?.map((t) => (
                <div
                  key={t.name}
                  onClick={() =>
                    updateSelection({
                      topic: t.name.trim(),
                    })
                  }
                  className="p-4 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition"
                >
                  {t.name}
                </div>
              ))}
            </div>
          )}

          {/* QUESTIONS */}
          {getView() === "questions" && (
            <>
              {loading ? (
                <p className="text-center mt-10 text-gray-400">⏳ Loading...</p>
              ) : (
                <>
                  <QuestionList
                    questions={questions}
                    reload={loadQuestions}
                    onSelect={
                      fromPreview
                        ? async (q) => {
                            try {
                              await fetch(
                                "http://localhost:8000/exam/add-question",
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                  },
                                  body: JSON.stringify({
                                    exam_id: fromPreview.exam_id,
                                    question_id: q._id || q.id,
                                    section_index: fromPreview.section_index,
                                  }),
                                },
                              );

                              alert("✅ Question added");
                              navigate(`/exam/${fromPreview.exam_id}/paper`);
                            } catch (err) {
                              console.error(err);
                              alert("❌ Failed to add question");
                            }
                          }
                        : undefined
                    }
                  />

                  {/* 🔥 PAGINATION UI */}
                  <div className="flex justify-center items-center gap-4 mt-6">
                    <button
                      disabled={!pagination.hasPrev}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page - 1,
                        }))
                      }
                      className="px-4 py-2 bg-slate-800 rounded disabled:opacity-40 hover:bg-slate-700"
                    >
                      Prev
                    </button>

                    <span className="text-sm text-gray-400">
                      Page {pagination.page} / {pagination.totalPages}
                    </span>

                    <button
                      disabled={!pagination.hasNext}
                      onClick={() =>
                        setPagination((prev) => ({
                          ...prev,
                          page: prev.page + 1,
                        }))
                      }
                      className="px-4 py-2 bg-slate-800 rounded disabled:opacity-40 hover:bg-slate-700"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
