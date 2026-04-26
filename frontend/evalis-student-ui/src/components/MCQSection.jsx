import { useState } from "react";

const MCQSection = ({ questions = [], answers = {}, setAnswers }) => {
  const [current, setCurrent] = useState(0);
  const [review, setReview] = useState({});

  // 🔥 NORMALIZE QUESTION (handles ANY backend format)
  const normalizeQuestion = (q) => {
    return {
      question:
        q?.question || q?.q || q?.question_text || "⚠️ Invalid Question",
      options: q?.options || q?.choices || q?.answers || [],
    };
  };

  // ❌ No questions case
  if (!questions.length) {
    return (
      <div className="p-6 text-center text-gray-400">
        No questions available
      </div>
    );
  }

  const q = normalizeQuestion(questions[current]);
  const questionId = questions[current]?._id || questions[current]?.id || current;

  const selectOption = (opt) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: opt,
    }));
  };

  const markReview = () => {
    setReview((prev) => ({
      ...prev,
      [current]: true,
    }));
  };

  const clearResponse = () => {
    setAnswers((prev) => {
      const copy = { ...prev };
      delete copy[questionId];
      return copy;
    });
  };

  /* STATUS COLOR LOGIC */

  const getColor = (i) => {
    const qId = questions[i]?._id || questions[i]?.id || i;

    if (i === current) return "bg-blue-600 text-slate-900 dark:text-white";

    if (review[i] && answers[qId]) return "bg-purple-600 text-slate-900 dark:text-white";

    if (review[i]) return "bg-yellow-500 text-black";

    if (answers[qId]) return "bg-green-600 text-slate-900 dark:text-white";

    return "bg-white dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-200 border border-gray-200 dark:border-slate-700";
  };

  return (
    <div className="grid grid-cols-4 gap-6 h-full text-slate-900 dark:text-white">
      {/* QUESTION PALETTE */}
      <div className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-4 rounded-lg shadow-lg">
        <h3 className="font-semibold mb-4 text-slate-900 dark:text-gray-200">Questions</h3>

        <div className="grid grid-cols-4 gap-2">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`p-2 rounded-md text-sm font-medium transition ${getColor(i)}`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* LEGEND */}
        <div className="mt-6 text-sm space-y-2 text-slate-600 dark:text-gray-300">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-600 rounded"></span>
            Answered
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-slate-600 rounded"></span>
            Not Answered
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-yellow-500 rounded"></span>
            Marked for Review
          </div>

          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-purple-600 rounded"></span>
            Answered + Review
          </div>
        </div>
      </div>

      {/* QUESTION PANEL */}
      <div className="col-span-3 bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-6 rounded-lg shadow-lg">
        <h3 className="font-semibold mb-4 text-lg text-slate-900 dark:text-gray-100">
          Question {current + 1}
        </h3>

        {/* 🔥 QUESTION TEXT */}
        <p className="mb-6 text-slate-800 dark:text-gray-300">{q.question}</p>

        {/* 🔥 OPTIONS */}
        <div className="space-y-3">
          {q.options.length > 0 ? (
            q.options.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-3 border border-gray-300 dark:border-slate-700 p-3 rounded-md cursor-pointer transition hover:bg-gray-100 dark:hover:bg-slate-800"
              >
                <input
                  type="radio"
                  name={`q-${questionId}`}
                  checked={answers[questionId] === opt}
                  onChange={() => selectOption(opt)}
                />
                <span className="text-slate-800 dark:text-gray-200">{opt}</span>
              </label>
            ))
          ) : (
            <p className="text-red-400">
              ⚠️ Options not available for this question
            </p>
          )}
        </div>

        {/* NAVIGATION */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-10 pt-6 border-t border-gray-200 dark:border-slate-800">
          <div className="flex gap-3">
            <button
              onClick={markReview}
              className="bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-500/20 transition-all font-semibold px-5 py-3 rounded-xl shadow-sm hover:shadow active:scale-95"
            >
              Mark for Review
            </button>

            <button
              onClick={clearResponse}
              className="bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-200 dark:hover:bg-rose-500/20 transition-all font-semibold px-5 py-3 rounded-xl shadow-sm hover:shadow active:scale-95"
            >
              Clear Response
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setCurrent((prev) => Math.max(prev - 1, 0))}
              disabled={current === 0}
              className={`transition-all font-bold px-8 py-3 rounded-xl shadow-sm flex items-center gap-2 ${
                current === 0
                  ? "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 hover:shadow-md active:scale-95"
              }`}
            >
              Previous
            </button>

            <button
              onClick={() =>
                setCurrent((prev) => Math.min(prev + 1, questions.length - 1))
              }
              disabled={current === questions.length - 1}
              className={`transition-all font-bold px-8 py-3 rounded-xl shadow-md flex items-center gap-2 ${
                current === questions.length - 1
                  ? "bg-gray-100 dark:bg-slate-800 text-gray-400 dark:text-slate-600 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white hover:shadow-lg hover:shadow-blue-500/30 active:scale-95"
              }`}
            >
              Save & Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MCQSection;
