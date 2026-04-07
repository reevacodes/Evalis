import { useState } from "react";
import { updateQuestion } from "../services/api";

export default function EditQuestionModal({ question, onClose, onSuccess }) {
  const [form, setForm] = useState({
    topic: question.topic,
    difficulty: question.difficulty || "easy", // 🔥 ensure exists
    question_text: question.question_text,
    question_type: question.question_type,
    options: question.options || ["", ""],
    correct_answer: question.correct_answer || "",
  });

  const handleSubmit = async () => {
    try {
      const id = question._id || question.id;

      await updateQuestion(id, {
        semester: 6,
        unit: 1,
        marks: 2,
        tags: [],
        ...form,
      });

      // 🔥 IMPORTANT: send updated data back
      onSuccess({
        ...question,
        ...form,
        _id: id,
      });
    } catch (err) {
      alert("Update failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-slate-900/95 border border-slate-700 shadow-2xl rounded-2xl p-6 w-[420px] animate-fadeIn">
        {/* HEADER */}
        <h2 className="text-xl font-semibold mb-4 text-blue-400">
          Edit Question
        </h2>

        {/* TOPIC */}
        <input
          value={form.topic}
          placeholder="Topic"
          className="w-full mb-3 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />

        {/* DIFFICULTY */}
        <select
          value={form.difficulty}
          className="w-full mb-3 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>

        {/* QUESTION */}
        <textarea
          value={form.question_text}
          placeholder="Question"
          className="w-full mb-3 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
        />

        {/* OPTIONS (only if MCQ) */}
        {form.question_type === "mcq" &&
          form.options.map((opt, i) => (
            <input
              key={i}
              value={opt}
              placeholder={`Option ${i + 1}`}
              className="w-full mb-3 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={(e) => {
                const newOptions = [...form.options];
                newOptions[i] = e.target.value;
                setForm({ ...form, options: newOptions });
              }}
            />
          ))}

        {/* CORRECT ANSWER (only if MCQ) */}
        {form.question_type === "mcq" && (
          <input
            value={form.correct_answer}
            placeholder="Correct Answer"
            className="w-full mb-4 p-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            onChange={(e) =>
              setForm({ ...form, correct_answer: e.target.value })
            }
          />
        )}

        {/* BUTTONS */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleSubmit}
            className="bg-yellow-500 hover:bg-yellow-600 px-4 py-2 rounded-lg text-black font-medium transition"
          >
            Update
          </button>

          <button
            onClick={onClose}
            className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
