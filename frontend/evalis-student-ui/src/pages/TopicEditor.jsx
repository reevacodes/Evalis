import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { selectTopics, generateSmartQuestions } from "../services/api";
import { useExam } from "../context/ExamContext";

export default function TopicEditor() {
  const location = useLocation();
  const navigate = useNavigate();

  const examId = location.state?.exam_id;
  const unitsFromBackend = location.state?.units || {};

  // 🔥 SAFETY CHECK
  if (!examId) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Invalid access. Please go back to dashboard.
      </div>
    );
  }

  const initialUnits = Object.entries(unitsFromBackend).map(
    ([unit, topics]) => ({
      unit,
      topics,
    }),
  );

  const [units, setUnits] = useState(initialUnits);
  const [newTopic, setNewTopic] = useState({});
  const [loading, setLoading] = useState(false);

  const { addQuestion, clearQuestions } = useExam();

  // -----------------------------
  // EDIT TOPIC
  // -----------------------------
  const editTopic = (unitIndex, topicIndex, value) => {
    const updated = [...units];
    updated[unitIndex].topics[topicIndex] = value;
    setUnits(updated);
  };

  // -----------------------------
  // REMOVE TOPIC
  // -----------------------------
  const removeTopic = (unitIndex, topicIndex) => {
    const updated = [...units];
    updated[unitIndex].topics.splice(topicIndex, 1);
    setUnits(updated);
  };

  // -----------------------------
  // ADD TOPIC
  // -----------------------------
  const addTopic = (unitIndex) => {
    if (!newTopic[unitIndex]?.trim()) return;

    const updated = [...units];
    updated[unitIndex].topics.push(newTopic[unitIndex]);

    setUnits(updated);
    setNewTopic({ ...newTopic, [unitIndex]: "" });
  };

  // -----------------------------
  // VALIDATION
  // -----------------------------
  const hasValidTopics = units.every((u) => u.topics.length > 0);

  // -----------------------------
  // SAVE + GENERATE (FINAL FIXED)
  // -----------------------------
  const handleSave = async () => {
    try {
      setLoading(true);

      // 🔥 STEP 1: SAVE TOPICS TO BACKEND
      await selectTopics(examId, {
        units: units,
      });

      console.log("✅ Topics saved:", units);

      // 🔥 STEP 2: GENERATE QUESTIONS
      const res = await generateSmartQuestions(examId);
      const questions = res.data.questions;

      console.log("🔥 GENERATED QUESTIONS:", questions);

      // 🔥 STEP 3: STORE IN CONTEXT
      clearQuestions();

      questions.forEach((q, i) => {
        addQuestion({
          id: q._id || Date.now() + i,
          text: q.question || q.title || "No question",
          source: q.source || q.type || "ai",
          difficulty: q.difficulty || "medium",
        });
      });

      console.log("📦 QUESTIONS ADDED:", questions.length);

      // 🔥 STEP 4: NAVIGATE
      navigate("/exam-builder");
    } catch (err) {
      console.error("❌ Error generating questions:", err);
      alert("Failed to generate questions");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-6 text-blue-500">
        Edit Extracted Topics
      </h1>

      {units.length === 0 && <p className="text-gray-400">No topics found</p>}

      {/* UNITS */}
      <div className="space-y-6">
        {units.map((unit, uIndex) => (
          <div
            key={uIndex}
            className="bg-slate-900 border border-slate-700 p-4 rounded-lg"
          >
            <h2 className="font-semibold mb-3">{unit.unit}</h2>

            {/* TOPICS */}
            {unit.topics.map((topic, tIndex) => (
              <div key={tIndex} className="flex gap-2 mb-2">
                <input
                  value={topic}
                  onChange={(e) => editTopic(uIndex, tIndex, e.target.value)}
                  className="flex-1 px-3 py-2 rounded bg-slate-800 border border-slate-700 outline-none focus:border-blue-500"
                />

                <button
                  onClick={() => removeTopic(uIndex, tIndex)}
                  className="bg-red-600 px-3 rounded hover:bg-red-700"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* ADD TOPIC */}
            <div className="flex gap-2 mt-3">
              <input
                value={newTopic[uIndex] || ""}
                onChange={(e) =>
                  setNewTopic({
                    ...newTopic,
                    [uIndex]: e.target.value,
                  })
                }
                className="px-3 py-2 rounded bg-slate-800 border border-slate-700 outline-none focus:border-green-500"
                placeholder="Add topic"
              />

              <button
                onClick={() => addTopic(uIndex)}
                className="bg-green-600 px-4 rounded hover:bg-green-700"
              >
                Add
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* SAVE BUTTON */}
      <button
        onClick={handleSave}
        disabled={loading || !hasValidTopics}
        className={`mt-6 px-6 py-2 rounded transition
          ${
            loading || !hasValidTopics
              ? "bg-gray-600 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
      >
        {loading ? "Generating..." : "Save & Continue →"}
      </button>
    </div>
  );
}
