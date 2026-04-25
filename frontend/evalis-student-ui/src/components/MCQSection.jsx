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

    return "bg-gray-100 dark:bg-slate-700 hover:bg-slate-600 text-gray-200";
  };

  return (
    <div className="grid grid-cols-4 gap-6 h-full text-slate-900 dark:text-white">
      {/* QUESTION PALETTE */}
      <div className="bg-gray-50 dark:bg-slate-900 border border-gray-300 dark:border-slate-700 p-4 rounded-lg shadow-lg">
        <h3 className="font-semibold mb-4 text-gray-200">Questions</h3>

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
        <div className="mt-6 text-sm space-y-2 text-gray-300">
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
        <h3 className="font-semibold mb-4 text-lg text-gray-100">
          Question {current + 1}
        </h3>

        {/* 🔥 QUESTION TEXT */}
        <p className="mb-6 text-gray-300">{q.question}</p>

        {/* 🔥 OPTIONS */}
        <div className="space-y-3">
          {q.options.length > 0 ? (
            q.options.map((opt, i) => (
              <label
                key={i}
                className="flex items-center gap-3 border border-gray-300 dark:border-slate-700 p-3 rounded-md cursor-pointer transition hover:bg-white dark:bg-slate-800"
              >
                <input
                  type="radio"
                  name={`q-${questionId}`}
                  checked={answers[questionId] === opt}
                  onChange={() => selectOption(opt)}
                />
                <span className="text-gray-200">{opt}</span>
              </label>
            ))
          ) : (
            <p className="text-red-400">
              ⚠️ Options not available for this question
            </p>
          )}
        </div>

        {/* NAVIGATION */}
        <div className="flex gap-3 mt-8">
          <button
            onClick={() => setCurrent((prev) => Math.max(prev - 1, 0))}
            className="bg-gray-100 dark:bg-slate-700 hover:bg-slate-600 transition px-3 py-2 rounded-md"
          >
            Previous
          </button>

          <button
            onClick={() =>
              setCurrent((prev) => Math.min(prev + 1, questions.length - 1))
            }
            className="bg-gray-100 dark:bg-slate-700 hover:bg-slate-600 transition px-3 py-2 rounded-md"
          >
            Next
          </button>

          <button
            onClick={markReview}
            className="bg-yellow-400 hover:bg-yellow-500 transition text-black px-3 py-2 rounded-md"
          >
            Mark for Review
          </button>

          <button
            onClick={clearResponse}
            className="bg-red-500 hover:bg-red-600 transition text-slate-900 dark:text-white px-3 py-2 rounded-md"
          >
            Clear Response
          </button>
        </div>
      </div>
    </div>
  );
};

export default MCQSection;
