import { useState } from "react";
import { UploadCloud, CheckCircle2, AlertTriangle, FileJson, Beaker, Loader2 } from "lucide-react";
import { uploadPastPaperJSON } from "../services/api";

export default function AdminPracticeUpload() {
  const [semester, setSemester] = useState(4);
  const [subject, setSubject] = useState("CS-401 (Operating Systems)");
  const [year, setYear] = useState(2023);
  const [examType, setExamType] = useState("MST");
  const [pattern, setPattern] = useState("Mixed");
  
  const [jsonText, setJsonText] = useState("");
  const [status, setStatus] = useState(""); // loading, success, error
  const [errMsg, setErrMsg] = useState("");

  // Determine structural constraints based on MIET_RULES
  const getRequiredCounts = () => {
    const t = examType.toLowerCase();
    const p = pattern.toLowerCase();
    
    if (t === "mst") {
      if (p === "mcq") return { mcq: 50, coding: 0 };
      if (p === "coding") return { mcq: 0, coding: 3 };
      if (p === "mixed") return { mcq: 20, coding: 3 };
    } else {
      if (p === "mcq") return { mcq: 100, coding: 0 };
      if (p === "coding") return { mcq: 0, coding: 10 };
      if (p === "mixed") return { mcq: 60, coding: 4 };
    }
    return { mcq: 0, coding: 0 };
  };

  const req = getRequiredCounts();

  const handleUpload = async () => {
    setStatus("loading");
    setErrMsg("");
    
    try {
      let parsedSections = [];
      if (jsonText.trim()) {
        parsedSections = JSON.parse(jsonText);
        if (!Array.isArray(parsedSections)) throw new Error("JSON must be an Array of section objects.");
      } else {
        throw new Error("Please paste your JSON syllabus map.");
      }

      // Basic structure validation against MIET requirements
      let foundMcq = 0;
      let foundCoding = 0;
      
      parsedSections.forEach(sec => {
          if (sec.type === "mcq") foundMcq += (sec.questions ? sec.questions.length : 0);
          if (sec.type === "coding") foundCoding += (sec.questions ? sec.questions.length : 0);
      });

      if (foundMcq !== req.mcq || foundCoding !== req.coding) {
          throw new Error(`Structure Mismatch! Your syllabus output provided ${foundMcq} MCQs and ${foundCoding} Coding tests. The system strictly requires ${req.mcq} MCQs and ${req.coding} Coding tests for a ${examType} ${pattern} exam.`);
      }

      const payload = {
        exam_name: `${subject.split('(')[0].trim()} [${examType}]`,
        subject_code: subject,
        semester: Number(semester),
        year: Number(year),
        exam_type: examType,
        pattern: pattern,
        duration_minutes: examType === "MST" ? 90 : 180,
        sections: parsedSections
      };

      await uploadPastPaperJSON(payload);
      setStatus("success");
      setJsonText("");
    } catch (err) {
      console.error(err);
      setStatus("error");
      setErrMsg(err.message || "Invalid JSON formatting or Network Error.");
    }
  };

  const injectMockData = () => {
      // Constructs a fake JSON array perfectly matching the active requirement constraint.
      const mockSections = [];
      if (req.mcq > 0) {
          const mcqs = Array.from({length: req.mcq}).map((_, i) => ({
              id: `demo-mcq-${i}`,
              question: `Sample Syllabus Concept Testing Q${i+1}?`,
              options: ["Alpha", "Beta", "Gamma", "Delta"],
              correct_answer: "Alpha",
              topic: "Unit 1: Fundamentals",
              type: "mcq"
          }));
          mockSections.push({ type: "mcq", count: req.mcq, marks_per_question: 1, questions: mcqs });
      }
      if (req.coding > 0) {
          const codes = Array.from({length: req.coding}).map((_, i) => ({
              id: `demo-code-${i}`,
              title: `Algorithms Task ${i+1}`,
              description: `Write a program to solve XYZ efficiently.`,
              constraints: "O(n) time complexity",
              test_cases: [{ input: "5\n1 2 3 4 5", output: "15" }],
              type: "coding"
          }));
          mockSections.push({ type: "coding", count: req.coding, marks_per_question: 10, questions: codes });
      }
      setJsonText(JSON.stringify(mockSections, null, 2));
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent"> Practice Archive Setup </h1>
          <p className="text-slate-600 dark:text-gray-400 mt-2">Rigidly ingest previous year papers mapped directly to live syllabus structures.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COMPONENT: CONFIGURATOR */}
        <div className="lg:col-span-1 space-y-6 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-6 rounded-2xl shadow-sm dark:shadow-xl h-fit">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2"><UploadCloud size={20} className="text-blue-400"/> Topology Gate</h2>
          
          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Semester</label>
            <input type="number" min="1" max="8" value={semester} onChange={e => setSemester(e.target.value)} className="w-full bg-white dark:bg-[#0b0f19] border border-gray-300 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Subject Nomenclature</label>
            <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="w-full bg-white dark:bg-[#0b0f19] border border-gray-300 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Year</label>
              <input type="number" value={year} onChange={e => setYear(e.target.value)} className="w-full bg-white dark:bg-[#0b0f19] border border-gray-300 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Exam Type</label>
              <select value={examType} onChange={e => setExamType(e.target.value)} className="w-full bg-white dark:bg-[#0b0f19] border border-gray-300 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500">
                <option value="MST">MST</option>
                <option value="Final">Final</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-2 block">Structural Pattern</label>
            <select value={pattern} onChange={e => setPattern(e.target.value)} className="w-full bg-white dark:bg-[#0b0f19] border border-gray-300 dark:border-white/10 rounded-lg p-3 text-slate-900 dark:text-white outline-none focus:border-blue-500">
              <option value="MCQ">MCQ Only</option>
              <option value="Coding">Coding Only</option>
              <option value="Mixed">Mixed Assembly</option>
            </select>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mt-6">
             <p className="text-sm text-blue-400 font-semibold mb-1">Active Constraint Target:</p>
             <p className="text-xs text-slate-700 dark:text-gray-300">You must supply exactly <b>{req.mcq} MCQs</b> and <b>{req.coding} Coding</b> definitions to pass the platform validation layer.</p>
          </div>
        </div>

        {/* RIGHT COMPONENT: JSON DROP & SUBMIT */}
        <div className="lg:col-span-2 space-y-6">
           <div className="bg-white dark:bg-[#0b0f19] border border-gray-300 dark:border-white/10 rounded-2xl shadow-sm dark:shadow-xl overflow-hidden flex flex-col h-[550px]">
              <div className="bg-gray-50 dark:bg-white/5 border-b border-gray-300 dark:border-white/10 p-4 flex justify-between items-center">
                 <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-gray-200 flex items-center gap-2"><FileJson size={16} className="text-green-500 dark:text-green-400"/> AI Syllabus Output (JSON)</span>
                    <span className="text-xs text-slate-500 dark:text-gray-500">Paste your generated syllabus array here</span>
                 </div>
                 <button onClick={injectMockData} className="px-4 py-1.5 text-xs font-bold bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg border border-indigo-500/20 transition-colors flex items-center gap-2">
                    <Beaker size={14} /> Simulate JSON
                 </button>
              </div>
              <textarea 
                 value={jsonText}
                 onChange={e => setJsonText(e.target.value)}
                 className="flex-1 w-full bg-transparent p-6 text-sm text-slate-700 dark:text-gray-300 font-mono outline-none resize-none"
                 placeholder={`[\n  {\n    "type": "mcq",\n    "questions": [...]\n  }\n]`}
                 spellCheck="false"
              />
           </div>

           {status === "error" && (
             <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <AlertTriangle size={20} />
                <p className="text-sm font-bold">{errMsg}</p>
             </div>
           )}

           {status === "success" && (
             <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={20} />
                <p className="text-sm font-bold">Past Paper Successfully Stored & Synchronized!</p>
             </div>
           )}

           <button 
              onClick={handleUpload}
              disabled={status === "loading" || !jsonText}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all flex justify-center items-center gap-2"
           >
              {status === "loading" ? <Loader2 size={20} className="animate-spin" /> : <UploadCloud size={20} />}
              {status === "loading" ? "Validating & Transmitting..." : "Upload Past Paper to Live DB"}
           </button>
        </div>

      </div>
    </div>
  );
}
