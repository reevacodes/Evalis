import { useEffect, useState } from "react";

export default function AdminCurriculum() {
  const [semester, setSemester] = useState("");
  const [curriculum, setCurriculum] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);

  // =========================
  // 📡 FETCH
  // =========================

  const fetchCurriculum = async (sem) => {
    setLoading(true);
    const res = await fetch(`http://localhost:8000/curriculum/${sem}`);
    const data = await res.json();
    setCurriculum(data);
    setLoading(false);
  };

  const fetchStats = async (sem) => {
    try {
      const res = await fetch(`http://localhost:8000/question-stats/${sem}`);
      const data = await res.json();
      setStats(data);
    } catch {
      setStats({});
    }
  };

  useEffect(() => {
    if (semester) {
      fetchCurriculum(semester);
      fetchStats(semester);
    }
  }, [semester]);

  // =========================
  // ✏️ UPDATE
  // =========================

  const updateSubjectName = (sIndex, value) => {
    const updated = { ...curriculum };
    updated.subjects[sIndex].name = value;
    setCurriculum(updated);
  };

  const updateTopic = (sIndex, uIndex, tIndex, value) => {
    const updated = { ...curriculum };
    updated.subjects[sIndex].units[uIndex].topics[tIndex].name = value;
    setCurriculum(updated);
  };

  // =========================
  // ➕ ADD
  // =========================

  const addSubject = () => {
    const updated = { ...curriculum };
    updated.subjects.push({
      name: "New Subject",
      code: "NEW-CODE",
      units: [],
    });
    setCurriculum(updated);
  };

  const addUnit = (sIndex) => {
    const updated = { ...curriculum };
    updated.subjects[sIndex].units.push({
      unit_number: updated.subjects[sIndex].units.length + 1,
      topics: [],
    });
    setCurriculum(updated);
  };

  const addTopic = (sIndex, uIndex) => {
    const updated = { ...curriculum };
    updated.subjects[sIndex].units[uIndex].topics.push({
      name: "New Topic",
    });
    setCurriculum(updated);
  };

  // =========================
  // 🗑 DELETE
  // =========================

  const deleteSubject = (sIndex) => {
    const updated = { ...curriculum };
    updated.subjects.splice(sIndex, 1);
    setCurriculum(updated);
  };

  const deleteUnit = (sIndex, uIndex) => {
    const updated = { ...curriculum };
    updated.subjects[sIndex].units.splice(uIndex, 1);
    setCurriculum(updated);
  };

  const deleteTopic = (sIndex, uIndex, tIndex) => {
    const updated = { ...curriculum };
    updated.subjects[sIndex].units[uIndex].topics.splice(tIndex, 1);
    setCurriculum(updated);
  };

  // =========================
  // 💾 SAVE
  // =========================

  const saveCurriculum = async () => {
    await fetch(`http://localhost:8000/curriculum/${semester}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(curriculum),
    });

    alert("Saved successfully 🚀");
  };

  // =========================
  // 🎨 UI
  // =========================

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-6">
      <h1 className="text-2xl mb-6 font-bold">⚙️ Curriculum Admin Panel</h1>

      {/* SEM SELECT */}
      <select
        className="p-2 bg-white dark:bg-slate-800 rounded mb-6 focus:outline-none focus:ring-2 focus:ring-blue-500"
        onChange={(e) => setSemester(e.target.value)}
      >
        <option value="">Select Semester</option>
        {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
          <option key={s} value={s}>
            Sem {s}
          </option>
        ))}
      </select>

      {/* EMPTY STATE */}
      {!semester && (
        <div className="text-center mt-20 text-slate-500 dark:text-slate-400">
          <h2 className="text-xl font-semibold mb-2">
            Select a semester to begin
          </h2>
          <p className="text-sm">
            Manage subjects, units, and topics for your curriculum
          </p>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div className="text-center mt-10 text-slate-500 dark:text-slate-400">
          Loading curriculum...
        </div>
      )}

      {/* MAIN CONTENT */}
      {curriculum && !loading && (
        <>
          {/* HEADER ACTIONS */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
              Subjects Overview
            </h2>

            <div className="flex gap-3">
              <button
                onClick={addSubject}
                className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm rounded"
              >
                ➕ Add Subject
              </button>

              <button
                onClick={saveCurriculum}
                className="bg-green-600 hover:bg-green-700 px-4 py-1.5 text-sm rounded"
              >
                💾 Save
              </button>
            </div>
          </div>

          {/* SUBJECTS */}
          {curriculum?.subjects?.map((sub, sIndex) => (
            <div
              key={sIndex}
              className="mb-6 p-4 bg-gray-50 dark:bg-slate-900 rounded border border-gray-200 dark:border-slate-800"
            >
              {/* SUBJECT HEADER */}
              <div className="flex justify-between items-center mb-2">
                <input
                  value={sub.name}
                  onChange={(e) => updateSubjectName(sIndex, e.target.value)}
                  className="w-full p-2 bg-white dark:bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />

                <button
                  onClick={() => deleteSubject(sIndex)}
                  className="ml-3 text-red-400"
                >
                  🗑
                </button>
              </div>

              {/* ADD UNIT */}
              <button
                onClick={() => addUnit(sIndex)}
                className="mb-2 text-blue-400 text-sm"
              >
                ➕ Add Unit
              </button>

              {/* UNITS */}
              {sub.units?.map((unit, uIndex) => (
                <div key={uIndex} className="ml-4 mb-3">
                  <div className="flex justify-between items-center">
                    <h3 className="text-yellow-400">Unit {unit.unit_number}</h3>

                    <button
                      onClick={() => deleteUnit(sIndex, uIndex)}
                      className="text-red-400"
                    >
                      🗑
                    </button>
                  </div>

                  {/* ADD TOPIC */}
                  <button
                    onClick={() => addTopic(sIndex, uIndex)}
                    className="text-green-400 text-sm"
                  >
                    ➕ Add Topic
                  </button>

                  {/* TOPICS */}
                  {unit.topics?.map((topic, tIndex) => {
                    const key = `${sub.code}-${unit.unit_number}-${topic.name}`;
                    const count = stats[key] || 0;

                    return (
                      <div key={tIndex} className="flex items-center gap-2">
                        <input
                          value={topic.name}
                          onChange={(e) =>
                            updateTopic(sIndex, uIndex, tIndex, e.target.value)
                          }
                          className="w-full p-2 my-1 bg-white dark:bg-slate-800 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <span className="text-xs text-gray-400">
                          {count} Qs
                        </span>

                        <button
                          onClick={() => deleteTopic(sIndex, uIndex, tIndex)}
                          className="text-red-400"
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
