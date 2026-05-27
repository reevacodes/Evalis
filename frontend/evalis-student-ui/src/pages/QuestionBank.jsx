import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API, { getQuestions } from "../services/api";
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
  const [isMockBank, setIsMockBank] = useState(false); // 🔥 RAG Mock Question Bank selector

  const [selectedIds, setSelectedIds] = useState([]);
  const availableSlots = fromPreview ? fromPreview.max_count - (fromPreview.existing_ids?.length || 0) : 0;

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
    difficulty: "",
    tags: "",
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
        // We do NOT auto-apply the semester from preview because the user might have
        // assigned a Sem 1 subject to a Sem 8 exam, which causes the curriculum to break.
        semester: "",
        subject: "",
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
    if (isMockBank) return "questions"; // 🔥 Bypass topic folder selection for RAG Mock bank
    if (!selection.topic) return "topics";
    return "questions";
  };

  const getHeading = () => {
    if (getView() === "semester") return "Select Semester";
    if (getView() === "subjects") return `Semester ${selection.semester}`;
    if (getView() === "units") return selection.subject;
    if (getView() === "topics") return `Unit ${selection.unit}`;
    if (getView() === "questions") {
      if (isMockBank) return `${selection.subject} • Unit ${selection.unit} Mocks • ${selection.type || "All"}`;
      return `${selection.topic} • ${selection.type || "All"}`;
    }
  };

  // =========================
  // FETCH CURRICULUM
  // =========================
  useEffect(() => {
    if (selection.semester) fetchCurriculum();
  }, [selection.semester]);

  const fetchCurriculum = async () => {
    const res = await API.get(`/curriculum/${selection.semester}`);
    setCurriculum(res.data);
  };

  // =========================
  // LOAD QUESTIONS
  // =========================
  const loadQuestions = async () => {
    setLoading(true);

    try {
      const res = await getQuestions({
        semester: Number(selection.semester),
        subject: selection.subject,
        unit: Number(selection.unit),
        topic: isMockBank ? undefined : selection.topic,
        question_type: selection.type,
        difficulty: selection.difficulty || undefined,
        tags: selection.tags || undefined,
        page: pagination.page,
        limit: 5,
        is_mock: isMockBank,
      });

      const data = res.data;

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
    const hasRequiredFields = isMockBank
      ? (selection.semester && selection.subject && selection.unit)
      : (selection.semester && selection.subject && selection.unit && selection.topic);

    if (hasRequiredFields) {
      loadQuestions();
    }
  }, [selection, pagination.page, isMockBank]);

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
        is_mock: isMockBank,
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
    if (isMockBank && selection.unit && getView() === "questions") {
      return updateSelection({ unit: "", topic: "", type: "" });
    }
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
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {(selection.semester ||
            selection.subject ||
            selection.unit ||
            selection.topic) && (
            <button
              onClick={goBack}
              className="bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 px-3 py-2 rounded flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
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

      {/* BANK TYPE TABS */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-slate-800 mb-8">
        <button
          onClick={() => {
            setIsMockBank(false);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            !isMockBank
              ? "text-blue-500 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
          }`}
        >
          Official Question Bank
          {!isMockBank && (
            <motion.div
              layoutId="activeBankTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
            />
          )}
        </button>
        <button
          onClick={() => {
            setIsMockBank(true);
            setPagination((prev) => ({ ...prev, page: 1 }));
          }}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            isMockBank
              ? "text-blue-500 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-350"
          }`}
        >
          RAG Mock Question Bank
          {isMockBank && (
            <motion.div
              layoutId="activeBankTab"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
            />
          )}
        </button>
      </div>

      {/* FILTERS */}
      {getView() === "questions" && (
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-xl">
          <div className="flex items-center flex-wrap gap-3 w-full md:w-auto">
            {/* TAGS INPUT */}
            <input
              type="text"
              placeholder="Search tags (e.g. CO1, tricky...)"
              value={selection.tags || ""}
              onChange={(e) => updateSelection({ tags: e.target.value })}
              className="px-3 py-2 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 w-full md:w-64"
            />
            {/* DIFFICULTY DROPDOWN */}
            <select
              value={selection.difficulty || ""}
              onChange={(e) => updateSelection({ difficulty: e.target.value })}
              className="px-3 py-2 bg-white dark:bg-slate-950 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* TYPE SWITCH (All, MCQ, Coding toggle) */}
          <div className="flex bg-gray-100 dark:bg-slate-950 p-1 rounded-lg border border-gray-300 dark:border-slate-700">
            {[
              { label: "All", value: "" },
              { label: "MCQ", value: "mcq" },
              { label: "Coding", value: "coding" },
            ].map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => updateSelection({ type: t.value })}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selection.type === t.value
                    ? "bg-blue-600 text-white shadow"
                    : "text-slate-500 hover:text-slate-850 dark:hover:text-slate-200"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
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
                  className="p-6 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 hover:border-blue-500 cursor-pointer transition"
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
                  className="p-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition"
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
                  className="p-4 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition"
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
                    pickerMode={!!fromPreview}
                    existingIds={fromPreview?.existing_ids || []}
                    selectedIds={selectedIds}
                    isMockBank={isMockBank}
                    onSelect={
                      fromPreview
                        ? (q) => {
                            const qId = q._id || q.id;
                            if (selectedIds.includes(qId)) {
                                setSelectedIds(selectedIds.filter(id => id !== qId));
                            } else {
                                if (selectedIds.length >= availableSlots) {
                                    alert(`⚠️ This section can only hold ${fromPreview.max_count} questions. You've hit the limit!`);
                                    return;
                                }
                                setSelectedIds([...selectedIds, qId]);
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
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
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
                      className="px-4 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
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

      {/* 🛒 FLOATING CART FOR BATCH ADD */}
      {fromPreview && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gray-50 dark:bg-slate-900 border-t border-gray-300 dark:border-slate-700 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] z-50 flex justify-center">
            <div className="max-w-4xl w-full flex justify-between items-center px-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Adding to Section {String.fromCharCode(65 + fromPreview.section_index)}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Selected: {selectedIds.length} / {availableSlots} available slots</p>
                </div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => navigate(`/exam/${fromPreview.exam_id}/edit`)}
                        className="px-6 py-2 rounded-lg font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                    >
                        Cancel
                    </button>
                    <button 
                        disabled={selectedIds.length === 0}
                        onClick={async () => {
                            try {
                                const payload = {
                                    section_index: fromPreview.section_index,
                                    question_ids: selectedIds
                                };
                                await API.post(`/exam/${fromPreview.exam_id}/add-questions`, payload);
                                navigate(`/exam/${fromPreview.exam_id}/edit`);
                            } catch (err) {
                                alert("Failed to batch add questions. Try again.");
                            }
                        }}
                        className={`px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                            selectedIds.length > 0 
                                ? "bg-indigo-600 text-slate-900 dark:text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20" 
                                : "bg-white dark:bg-slate-800 text-slate-500 border border-gray-300 dark:border-slate-700 cursor-not-allowed"
                        }`}
                    >
                        {selectedIds.length > 0 ? "Add to Exam" : "Select Questions"} {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
