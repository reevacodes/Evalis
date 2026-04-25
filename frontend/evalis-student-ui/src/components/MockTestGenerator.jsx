import { useState, useEffect } from "react";
import { BookOpen, Clock, Play, Sparkles } from "lucide-react";
import API, { fetchCurriculum } from "../services/api";

export default function MockTestGenerator({ navigate }) {
  const [preset, setPreset] = useState("Midsem");
  const [pattern, setPattern] = useState("mixed");
  const [startMode, setStartMode] = useState("instant");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  // New Curriculum States
  const [semester, setSemester] = useState(3);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    const loadCurriculum = async () => {
      setLoadingCurriculum(true);
      try {
        const res = await fetchCurriculum(semester);
        const subjs = res.data?.subjects || [];
        setSubjects(subjs);
        if (subjs.length > 0) {
          setSelectedSubject(subjs[0]);
        } else {
          setSelectedSubject(null);
        }
        setTopics([]); // reset selected topics
      } catch (error) {
        console.error("Failed to load curriculum:", error);
        setSubjects([]);
        setSelectedSubject(null);
      } finally {
        setLoadingCurriculum(false);
      }
    };
    loadCurriculum();
  }, [semester]);

  const availableTopics = selectedSubject 
    ? selectedSubject.units.map(u => {
        const id = String(u.unit_number);
        const rawName = u.topics.length > 0 ? u.topics[0].name : 'Overview';
        const isPrefixed = /^(Chapter|Unit|Ch)\s*\d+/i.test(String(id));
        const label = isPrefixed ? `${id}: ${rawName}` : `Chapter ${id}: ${rawName}`;
        return { id, label };
      })
    : [];

  const toggleTopic = (t) => {
    if (topics.includes(t)) {
      setTopics(topics.filter((x) => x !== t));
    } else {
      setTopics([...topics, t]);
    }
  };

  const handleGenerate = async () => {
    if (topics.length === 0) return alert("Select at least one chapter.");
    if (!selectedSubject) return alert("No subject selected.");
    setLoading(true);
    try {
      const payload = {
        subject_code: selectedSubject.code,
        topics: topics,
        duration_preset: preset,
        pattern: pattern,
        start_mode: startMode,
        scheduled_time: startMode === "scheduled" && scheduledTime ? new Date(scheduledTime).toISOString() : null
      };
      const res = await API.post("/exam/mock-tests/generate", payload);
      
      if (startMode === "instant") {
        navigate(`/student/practice/${res.data.exam_id}`);
      } else {
        alert("Mock Test scheduled successfully!");
        // We could refresh the dashboard or reset the modal here
        setTopics([]);
        setScheduledTime("");
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.detail || "Failed to generate mock test");
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden shadow-xl mt-4">
      <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 p-6 border-b border-slate-700/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="text-purple-400 w-5 h-5" /> 
            Mock Test Studio
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {selectedSubject ? `${selectedSubject.name} (${selectedSubject.code})` : "Select a subject"} • Pick your weak chapters and practice instantly!
          </p>
        </div>

        {/* Semester & Subject Selectors */}
        <div className="flex gap-3 w-full md:w-auto">
          <select 
             value={semester}
             onChange={(e) => setSemester(Number(e.target.value))}
             className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2 focus:border-purple-500 focus:outline-none"
          >
             {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Sem {s}</option>)}
          </select>

          <select
             value={selectedSubject?.code || ""}
             onChange={(e) => setSelectedSubject(subjects.find(s => s.code === e.target.value))}
             className="bg-slate-950 border border-slate-700 text-white text-sm rounded-lg p-2 focus:border-purple-500 focus:outline-none flex-1 md:w-48"
             disabled={loadingCurriculum || subjects.length === 0}
          >
             {loadingCurriculum ? <option>Loading...</option> : 
              subjects.length === 0 ? <option>No Subjects Found</option> :
              subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)
             }
          </select>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Topics */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
            Select Chapters
          </label>
          {availableTopics.length === 0 ? (
            <div className="text-sm text-slate-400 p-4 border border-dashed border-slate-700 rounded-lg text-center">
               No chapters found for this subject. Try another subject or semester.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {availableTopics.map((t, index) => (
              <button
                key={t.id}
                onClick={() => toggleTopic(t.id)}
                className={`p-3 rounded-lg border text-sm text-left font-medium transition-all flex items-start gap-2 ${
                  topics.includes(t.id)
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.15)]"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
                }`}
              >
                <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  topics.includes(t.id) ? "bg-purple-500 border-purple-500" : "border-slate-600"
                }`}>
                  {topics.includes(t.id) && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
                {t.label}
              </button>
            ))}
          </div>
          )}
        </div>

        {/* Pattern Selection */}
        <div className="mb-6">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
            Paper Pattern
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setPattern("mixed")}
              className={`flex-1 p-3 rounded-lg border transition-all font-bold ${
                pattern === "mixed"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              Mixed (MCQ + Code)
            </button>
            <button
              onClick={() => setPattern("mcq")}
              className={`flex-1 p-3 rounded-lg border transition-all font-bold ${
                pattern === "mcq"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              MCQ Only
            </button>
          </div>
        </div>

        {/* Preset */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
            Duration Format
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setPreset("Midsem")}
              className={`flex-1 p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${
                preset === "Midsem"
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Clock className={`w-6 h-6 ${preset === "Midsem" ? "text-blue-400" : "text-slate-500"}`} />
              <div className="text-center">
                <span className="block font-bold">Midsem</span>
                <span className="text-xs opacity-70">
                  90 Mins • {pattern === "mixed" ? "30 MCQ, 2 Code" : "50 MCQ"}
                </span>
              </div>
            </button>
            
            <button
              onClick={() => setPreset("Final")}
              className={`flex-1 p-4 rounded-lg border transition-all flex flex-col items-center justify-center gap-2 ${
                preset === "Final"
                  ? "bg-blue-500/20 border-blue-500/50 text-blue-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              <BookOpen className={`w-6 h-6 ${preset === "Final" ? "text-blue-400" : "text-slate-500"}`} />
              <div className="text-center">
                <span className="block font-bold">Final</span>
                <span className="text-xs opacity-70">
                  180 Mins • {pattern === "mixed" ? "60 MCQ, 4 Code" : "100 MCQ"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Start Mode */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 block">
            Start Mode
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setStartMode("instant")}
              className={`flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                startMode === "instant"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Play className="w-4 h-4" /> Instant
            </button>
            <button
              onClick={() => setStartMode("scheduled")}
              className={`flex-1 p-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                startMode === "scheduled"
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-200"
                  : "bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600"
              }`}
            >
              <Clock className="w-4 h-4" /> Schedule Later
            </button>
          </div>
          
          {startMode === "scheduled" && (
            <div className="mt-4">
              <input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleGenerate}
          disabled={loading || topics.length === 0 || (startMode === "scheduled" && !scheduledTime)}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold rounded-xl flex justify-center items-center gap-2 transition-all shadow-lg"
        >
          {loading ? (
            <span className="animate-pulse">Building Virtual Environment...</span>
          ) : (
            <>
              {startMode === "instant" ? <Play className="w-5 h-5 fill-current" /> : <Clock className="w-5 h-5" />}
              {startMode === "instant" ? "Generate & Start Instant Mock Test" : "Schedule Mock Test"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
