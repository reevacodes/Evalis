import { useState } from "react";
import { updateQuestion } from "../services/api";

export default function EditQuestionModal({ question, onClose, onSuccess }) {
  const [form, setForm] = useState({
    topic: question.topic,
    difficulty: question.difficulty || "medium", 
    tags_string: (question.tags || []).join(", "), // 🔥 Support tags editing
    question_text: question.question_text || question.question || "",
    question_type: question.question_type,
    options: question.options || ["", ""],
    correct_answer: question.correct_answer || "",
  });

  const handleSubmit = async () => {
    try {
      const id = question._id || question.id;

      // 🔥 Split tags precisely
      const parsedTags = form.tags_string
        .split(",")
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const payload = { ...form, tags: parsedTags };
      delete payload.tags_string; // Remove arbitrary frontend state

      await updateQuestion(id, {
        semester: question.semester,
        subject_code: question.subject_code,
        subject_name: question.subject_name,
        unit: question.unit,
        marks: question.marks || 2,
        ...payload,
      });

      // 🔥 IMPORTANT: send updated data back
      onSuccess({
        ...question,
        ...payload,
        _id: id,
      });
    } catch (err) {
      alert("Update failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl w-full max-w-2xl animate-fadeIn overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span className="text-blue-500">✏️</span> Edit Question
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition"
          >
            ✕
          </button>
        </div>

        {/* SCROLLABLE FORM */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          
          {/* Metadata Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Metadata</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Topic</label>
                <input
                  value={form.topic}
                  placeholder="e.g. Recursion"
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition text-sm"
                  onChange={(e) => setForm({ ...form, topic: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Difficulty</label>
                <select
                  value={form.difficulty}
                  className="w-full p-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition text-sm"
                  onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                >
                  <option value="easy">🟩 Easy</option>
                  <option value="medium">🟨 Medium</option>
                  <option value="hard">🟥 Hard</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Tags & Course Outcomes</label>
              <input
                value={form.tags_string}
                placeholder="Comma separated (e.g. CO1, sorting, arrays)"
                className="w-full p-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition text-sm"
                onChange={(e) => setForm({ ...form, tags_string: e.target.value })}
              />
              <p className="text-[11px] text-gray-500 mt-1.5 italic">
                Separate tags with commas. Tags beginning with "CO" are highlighted automatically.
              </p>
            </div>
          </div>

          <hr className="border-slate-800" />

          {/* Question Section */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Question Content</h3>
            
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Problem Statement</label>
              <textarea
                value={form.question_text}
                placeholder="Type the question here..."
                className="w-full p-3 bg-slate-950/50 border border-slate-700 rounded-lg text-white min-h-[140px] focus:outline-none focus:border-blue-500 transition text-sm leading-relaxed block"
                onChange={(e) => setForm({ ...form, question_text: e.target.value })}
              />
            </div>
          </div>

          {/* MCQ Options */}
          {form.question_type === "mcq" && (
            <>
              <hr className="border-slate-800" />
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">MCQ Options</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {form.options.map((opt, i) => (
                    <div key={i}>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Option {String.fromCharCode(65 + i)}
                      </label>
                      <input
                        value={opt}
                        placeholder={`Option ${i + 1}`}
                        className="w-full p-2.5 bg-slate-950/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 transition text-sm"
                        onChange={(e) => {
                          const newOptions = [...form.options];
                          newOptions[i] = e.target.value;
                          setForm({ ...form, options: newOptions });
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="block text-xs font-bold text-green-400 mb-1.5">Correct Answer</label>
                  <select
                    value={form.correct_answer}
                    className="w-full p-2.5 bg-green-500/10 border border-green-500/30 rounded-lg text-white focus:outline-none focus:border-green-500 transition text-sm font-medium"
                    onChange={(e) => setForm({ ...form, correct_answer: e.target.value })}
                  >
                    <option value="" disabled>Select the correct answer...</option>
                    {form.options.map((opt, i) => (
                      <option key={i} value={opt}>
                        Option {String.fromCharCode(65 + i)}: {opt || '(empty)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 backdrop-blur-md flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2.5 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition flex items-center shadow-md shadow-blue-900/20"
          >
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
