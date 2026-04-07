import { useState } from "react";
import { addQuestion } from "../services/api";

export default function AddQuestionModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    subject_code: "",
    subject_name: "",
    topic: "",
    difficulty: "easy",
    question_text: "",
    question_type: "mcq",
    options: ["", ""],
    correct_answer: "",
  });

  const handleSubmit = async () => {
    try {
      await addQuestion({
        semester: 6,
        unit: 1,
        marks: 1,
        tags: [],
        ...form,
      });

      onSuccess();
    } catch (err) {
      console.error(err);
      alert("Failed to add question");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700 w-96">
        <h2 className="text-lg font-semibold mb-4">Add Question</h2>

        <input
          placeholder="Subject Code"
          className="w-full mb-2 p-2 bg-slate-800 rounded"
          onChange={(e) => setForm({ ...form, subject_code: e.target.value })}
        />

        <input
          placeholder="Subject Name"
          className="w-full mb-2 p-2 bg-slate-800 rounded"
          onChange={(e) => setForm({ ...form, subject_name: e.target.value })}
        />

        <input
          placeholder="Topic"
          className="w-full mb-2 p-2 bg-slate-800 rounded"
          onChange={(e) => setForm({ ...form, topic: e.target.value })}
        />

        <textarea
          placeholder="Question"
          className="w-full mb-2 p-2 bg-slate-800 rounded"
          onChange={(e) => setForm({ ...form, question_text: e.target.value })}
        />

        {form.options.map((opt, i) => (
          <input
            key={i}
            placeholder={`Option ${i + 1}`}
            className="w-full mb-2 p-2 bg-slate-800 rounded"
            onChange={(e) => {
              const newOptions = [...form.options];
              newOptions[i] = e.target.value;
              setForm({ ...form, options: newOptions });
            }}
          />
        ))}

        <input
          placeholder="Correct Answer"
          className="w-full mb-4 p-2 bg-slate-800 rounded"
          onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
        />

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            className="bg-green-600 px-4 py-2 rounded"
          >
            Add
          </button>

          <button onClick={onClose} className="bg-gray-600 px-4 py-2 rounded">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
