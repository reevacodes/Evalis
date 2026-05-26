import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import Split from "react-split";
import { runCode, submitCode, runSampleCode } from "../services/api";
import { Loader2 } from "lucide-react";

const languageTemplates = {
  python: "# Write your code here\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    return 0;\n}",
  c: "#include <stdio.h>\n\nint main() {\n    return 0;\n}",
};

export default function CodingSection({
  problems = [],
  codingAnswers,
  setCodingAnswers,
}) {
  const [currentProblem, setCurrentProblem] = useState(0);
  const [language, setLanguage] = useState("python");
  const [code, setCode] = useState(languageTemplates["python"]);

  const [output, setOutput] = useState("");
  const [verdict, setVerdict] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState("");

  const [customInput, setCustomInput] = useState("");

  const [activeTab, setActiveTab] = useState("console");
  const [testDetails, setTestDetails] = useState([]);
  const [expandedTest, setExpandedTest] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mainSplitSizes, setMainSplitSizes] = useState([40, 60]);
  const [consoleSplitSizes, setConsoleSplitSizes] = useState([65, 35]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setMainSplitSizes([40, 60]);
        setConsoleSplitSizes([50, 50]);
      } else {
        setMainSplitSizes([40, 60]);
        setConsoleSplitSizes([65, 35]);
      }
    };
    
    // Initial check
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ✅ NEW: Track status like MCQ
  const [submittedMap, setSubmittedMap] = useState({});
  const [attemptedMap, setAttemptedMap] = useState({});

  const normalizeProblem = (p) => ({
    description:
      p?.description ||
      p?.problem ||
      p?.question ||
      p?.question_text ||
      p?.statement ||
      p?.problem_statement ||
      "No description available",

    input_format: p?.input_format || "Not specified",
    output_format: p?.output_format || "Not specified",
    constraints: typeof p?.constraints === "object" ? JSON.stringify(p.constraints, null, 2) : p?.constraints || "Not specified",

    test_cases: p?.test_cases || p?.sample_test_cases || [],
  });

  if (!problems.length) {
    return <div className="p-6 text-gray-400">No coding problems</div>;
  }

  const problem = normalizeProblem(problems[currentProblem]);

  // ================= LOAD GLOBALLY SAVED CODE =================
  useEffect(() => {
    const qId = problems[currentProblem]?._id || problems[currentProblem]?.id || currentProblem;
    const saved = codingAnswers?.[qId];
    if (saved) {
      setCode(saved.code || languageTemplates[language]);
      setLanguage(saved.language || language);
    } else {
      setCode(languageTemplates[language]);
    }
    resetStates();
  }, [currentProblem]);

  // ================= AUTO SAVE GLOBALLY =================
  useEffect(() => {
    if (!setCodingAnswers) return;

    const qId = problems[currentProblem]?._id || problems[currentProblem]?.id || currentProblem;

    setCodingAnswers((prev) => ({
      ...prev,
      [qId]: {
        code,
        language,
      },
    }));

    if (code && code.trim() !== languageTemplates[language].trim()) {
      setAttemptedMap((prev) => ({
        ...prev,
        [currentProblem]: true,
      }));
    }
  }, [code, language]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    
    if (code.trim() !== languageTemplates[language].trim() && code.trim() !== "") {
      const confirmSwitch = window.confirm("Switching languages will reset your code progress to the default template. Are you sure?");
      if (!confirmSwitch) return;
    }

    setLanguage(newLang);
    setCode(languageTemplates[newLang]);
  };

  useEffect(() => {
    if (problem.test_cases.length > 0) {
      setCustomInput(problem.test_cases[0].input);
    }
  }, [currentProblem]);

  const resetStates = () => {
    setOutput("");
    setVerdict("");
    setTestDetails([]);
    setExpandedTest(null);
  };

  // ================= RUN =================
  const handleRun = async () => {
    if (loading) return;

    setLoading(true);
    setLoadingType("run");

    const problem = problems[currentProblem];
    const defaultInput = problem?.test_cases?.length > 0 ? problem.test_cases[0].input : "";
    const isCustom = customInput !== defaultInput;

    if (isCustom || !problem?.test_cases?.length) {
      setActiveTab("console");
      if (!output) setOutput("Running your code...");
      try {
        const res = await runCode({ code, input: customInput, language });

        if (res.status === "success") {
          setOutput(res.output || "No output");
          setVerdict("");
        } else {
          setOutput(res.output || res.status);
          setVerdict(formatVerdict(res.status));
        }
      } catch {
        setOutput("Error running code");
      }
    } else {
      setActiveTab("tests");
      setTestDetails([
        { status: "Running...", verdict: "PENDING" }
      ]);
      try {
        const qid = problem._id || problem.id;
        const res = await runSampleCode({
          code,
          question_id: String(qid),
          language
        });

        if (res.results) {
           const formatted = res.results.map((t) => ({
             ...t,
             status: formatVerdict(t.verdict),
           }));
           
           let temp = [];
           for (let i = 0; i < formatted.length; i++) {
             await new Promise((r) => setTimeout(r, 250));
             temp.push(formatted[i]);
             setTestDetails([...temp]);
           }
           
           const passed = res.passed;
           const total = res.total;
           setVerdict(
              passed === total
                ? `Passed (${passed}/${total})`
                : `Failed (${passed}/${total})`
           );

           const firstFail = formatted.findIndex((t) => t.verdict !== "AC");
           setExpandedTest(firstFail !== -1 ? firstFail : 0);
        } else {
           setOutput("Error evaluating sample tests");
        }
      } catch (err) {
        console.error("Run sample error:", err);
        setOutput("Error running code");
      }
    }

    setLoading(false);
    setLoadingType("");
  };

  // ================= SUBMIT =================
  const handleSubmit = async () => {
    if (loading) return;

    setLoading(true);
    setLoadingType("submit");
    setActiveTab("tests");

    setTestDetails([
      { status: "Running...", verdict: "PENDING" },
      { status: "Running...", verdict: "PENDING" },
    ]);

    try {
      const qid = problems[currentProblem]?._id || problems[currentProblem]?.id || currentProblem;

      const res = await submitCode({
        code,
        question_id: String(qid),
        language,
        user_id: "user123",
      });

      const allTests = [
        ...(res.sample_results || []),
        ...(res.hidden_results || []),
      ];

      const formatted = allTests.map((t) => ({
        ...t,
        status: formatVerdict(t.verdict),
      }));

      let temp = [];
      for (let i = 0; i < formatted.length; i++) {
        await new Promise((r) => setTimeout(r, 250));
        temp.push(formatted[i]);
        setTestDetails([...temp]);
      }

      const passed = formatted.filter((t) => t.verdict === "AC").length;
      const total = formatted.length;

      setVerdict(
        passed === total
          ? `Accepted (${passed}/${total})`
          : `Failed (${passed}/${total})`,
      );

      // ✅ mark submitted
      setSubmittedMap((prev) => ({
        ...prev,
        [currentProblem]: true,
      }));

      const firstFail = formatted.findIndex((t) => t.verdict !== "AC");
      setExpandedTest(firstFail !== -1 ? firstFail : 0);
    } catch {
      setOutput("Submission failed");
    } finally {
      setLoading(false);
      setLoadingType("");
    }
  };

  const formatVerdict = (v) => {
    if (!v) return "Unknown";
    if (v === "AC") return "Accepted";
    if (v === "WA") return "Wrong Answer";
    if (v === "TLE") return "Time Limit Exceeded";
    if (v === "RE") return "Runtime Error";
    if (v === "CE") return "Compilation Error";
    return v;
  };

  // ✅ MCQ STYLE COLOR LOGIC
  const getProblemColor = (i) => {
    if (i === currentProblem) return "bg-blue-600";

    if (submittedMap[i]) return "bg-green-600";

    if (attemptedMap[i]) return "bg-yellow-500 text-black";

    return "bg-gray-100 dark:bg-slate-700 hover:bg-slate-600";
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-slate-900 dark:text-white bg-white dark:bg-slate-950">
      {/* HEADER */}
      <div className="p-3 flex gap-2 border-b border-gray-200 dark:border-slate-800">
        {problems.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentProblem(i)}
            className={`px-3 py-1 rounded text-sm ${getProblemColor(i)}`}
          >
            Problem {i + 1}
          </button>
        ))}
      </div>

      <Split 
        direction={isMobile ? "vertical" : "horizontal"} 
        sizes={mainSplitSizes} 
        className={`flex flex-1 h-full overflow-hidden ${isMobile ? 'flex-col' : 'flex-row'}`}
      >
        {/* KEEP EVERYTHING BELOW SAME */}
        {/* LEFT PANEL */}
        <div className="h-full overflow-y-auto p-5 bg-gray-50 dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 space-y-6">
          <h2 className="text-xl font-bold">Problem {currentProblem + 1}</h2>

          {/* DESCRIPTION */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">
              Description
            </h3>
            <p className="whitespace-pre-line text-gray-300">
              {problem.description}
            </p>
          </div>

          {/* INPUT */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">
              Input Format
            </h3>
            <p className="text-gray-300">{problem.input_format}</p>
          </div>

          {/* OUTPUT */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">
              Output Format
            </h3>
            <p className="text-gray-300">{problem.output_format}</p>
          </div>

          {/* CONSTRAINTS */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 mb-1">
              Constraints
            </h3>
            <p className="text-gray-300 whitespace-pre-wrap font-mono text-xs">{problem.constraints}</p>
          </div>

          {/* SAMPLE TEST CASES */}
          {problem.test_cases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Sample Test Cases
              </h3>

              <div className="space-y-3">
                {problem.test_cases.map((tc, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 p-3 rounded text-sm">
                    <p>
                      <span className="text-gray-400">Input:</span> {tc.input}
                    </p>
                    <p>
                      <span className="text-gray-400">Output:</span>{" "}
                      {tc.expected_output || tc.output}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANEL */}
        <Split
          direction="vertical"
          sizes={consoleSplitSizes}
          minSize={120}
          className="flex flex-col h-full overflow-hidden"
        >
          {/* EDITOR */}
          <div className="flex flex-col bg-gray-50 dark:bg-slate-900">
            <div className="p-2 flex gap-2 border-b border-gray-200 dark:border-slate-800">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-gray-100 dark:bg-slate-700 px-2 py-1 text-sm"
              >
                <option value="python">Python</option>
                <option value="cpp">C++</option>
                <option value="c">C</option>
              </select>

              <button
                onClick={handleRun}
                disabled={loading}
                className="bg-blue-600 px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loading && loadingType === "run" && <Loader2 className="w-3 h-3 animate-spin" />}
                Run
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                {loading && loadingType === "submit" && <Loader2 className="w-3 h-3 animate-spin" />}
                Submit
              </button>

              {verdict && (
                <span className="ml-auto text-xs px-2 py-1 rounded bg-gray-100 dark:bg-slate-700">
                  {verdict}
                </span>
              )}
            </div>

            <Editor
              theme="vs-dark"
              language={language}
              value={code}
              onChange={(v) => setCode(v || "")}
              height="100%"
            />
          </div>

          {/* CONSOLE / TESTS */}
          <div className="flex flex-col bg-white dark:bg-slate-950 border-t border-gray-200 dark:border-slate-800 relative">
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 text-sm">
                {loadingType === "run"
                  ? "Running your code..."
                  : "Evaluating test cases..."}
              </div>
            )}

            <div className="flex text-sm border-b border-gray-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab("console")}
                className={`px-4 py-2 ${
                  activeTab === "console"
                    ? "text-blue-400 border-b-2 border-blue-500"
                    : "text-gray-400"
                }`}
              >
                Console
              </button>

              <button
                onClick={() => setActiveTab("tests")}
                className={`px-4 py-2 ${
                  activeTab === "tests"
                    ? "text-blue-400 border-b-2 border-blue-500"
                    : "text-gray-400"
                }`}
              >
                Test Cases
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 text-sm">
              {activeTab === "console" && (
                <div className="flex flex-col h-full">
                  {verdict && !verdict.includes("Failed") && !verdict.includes("Passed") && !verdict.includes("Accepted") && (
                    <div className={`text-lg font-bold mb-3 text-red-500`}>
                      {verdict}
                    </div>
                  )}
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 p-3 mb-3 text-sm rounded-lg border border-slate-200 dark:border-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Custom Input..."
                  />

                  <div className={`flex-1 overflow-y-auto p-4 rounded-lg font-mono text-sm whitespace-pre-wrap border ${verdict === "Runtime Error" || verdict === "Compilation Error" ? "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200"}`}>
                    {output || "Run your code to see output"}
                  </div>
                </div>
              )}

              {activeTab === "tests" && (
                <div className="flex flex-col h-full">
                  {verdict && (
                    <div className={`text-xl font-bold mb-4 ${verdict.includes('Passed') || verdict.includes('Accepted') ? 'text-green-500' : 'text-red-500'}`}>
                      {verdict}
                    </div>
                  )}

                  {testDetails.length > 0 && (
                    <>
                      {/* TEST CASE PILLS */}
                      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-thin">
                        {testDetails.map((t, i) => (
                          <button
                            key={i}
                            onClick={() => setExpandedTest(i)}
                            className={`flex items-center whitespace-nowrap gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              expandedTest === i 
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white" 
                                : "bg-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                            }`}
                          >
                            <div className={`w-2 h-2 rounded-full ${t.verdict === "AC" ? "bg-green-500" : t.verdict === "PENDING" ? "bg-yellow-500" : "bg-red-500"}`}></div>
                            Case {i + 1}
                          </button>
                        ))}
                      </div>

                      {/* SELECTED TEST CASE DETAILS */}
                      {expandedTest !== null && testDetails[expandedTest] && (
                        <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                          {(testDetails[expandedTest].verdict === "RE" || testDetails[expandedTest].verdict === "CE") ? (
                             <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
                               {testDetails[expandedTest].output || testDetails[expandedTest].status}
                             </div>
                          ) : (
                            <>
                              <div>
                                <div className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Input</div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-200 dark:border-slate-800">
                                  {testDetails[expandedTest].input}
                                </div>
                              </div>
                              
                              <div>
                                <div className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Your Output</div>
                                <div className={`p-3.5 rounded-lg font-mono text-sm whitespace-pre-wrap border ${testDetails[expandedTest].verdict === "AC" ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400" : "bg-red-500/5 border-red-500/20 text-red-700 dark:text-red-400"}`}>
                                  {testDetails[expandedTest].output || "No output"}
                                </div>
                              </div>

                              {testDetails[expandedTest].expected && (
                                <div>
                                  <div className="text-xs text-slate-500 mb-1.5 font-semibold uppercase tracking-wider">Expected Output</div>
                                  <div className="bg-slate-50 dark:bg-slate-900/50 p-3.5 rounded-lg font-mono text-sm whitespace-pre-wrap border border-slate-200 dark:border-slate-800">
                                    {testDetails[expandedTest].expected}
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {testDetails.length === 0 && (
                    <div className="text-slate-500 flex items-center justify-center h-full">
                      Run or Submit to see test cases.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </Split>
      </Split>
    </div>
  );
}
