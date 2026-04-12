import { useState, useEffect } from "react";
import Editor from "@monaco-editor/react";
import Split from "react-split";
import { runCode, submitCode } from "../services/api";

const languageTemplates = {
  python: "# Write your code here\n",
  cpp: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main(){\n\n}",
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

  const [splitSizes] = useState([65, 35]);

  // ✅ NEW: Track status like MCQ
  const [submittedMap, setSubmittedMap] = useState({});
  const [attemptedMap, setAttemptedMap] = useState({});

  const normalizeProblem = (p) => ({
    description:
      p?.description ||
      p?.problem ||
      p?.question ||
      p?.question_text ||
      "No description available",

    input_format: p?.input_format || "Not specified",
    output_format: p?.output_format || "Not specified",
    constraints: p?.constraints || "Not specified",

    test_cases: p?.test_cases || [],
  });

  if (!problems.length) {
    return <div className="p-6 text-gray-400">No coding problems</div>;
  }

  const problem = normalizeProblem(problems[currentProblem]);

  // ================= LOAD GLOBALLY SAVED CODE =================
  useEffect(() => {
    const saved = codingAnswers?.[currentProblem];
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

    setCodingAnswers((prev) => ({
      ...prev,
      [currentProblem]: {
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
    setActiveTab("console");

    if (!output) setOutput("Running your code...");

    try {
      const res = await runCode({ code, input: customInput, language });

      if (res.status === "success") {
        setOutput(res.output || "No output");
      } else {
        setOutput(res.output || res.status);
        setVerdict(formatVerdict(res.status));
      }
    } catch {
      setOutput("Error running code");
    } finally {
      setLoading(false);
      setLoadingType("");
    }
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
      const qid = problems[currentProblem]?.id;

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

    return "bg-slate-700 hover:bg-slate-600";
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden text-white bg-slate-950">
      {/* HEADER */}
      <div className="p-3 flex gap-2 border-b border-slate-800">
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

      <Split sizes={[40, 60]} className="flex flex-1 h-full overflow-hidden">
        {/* KEEP EVERYTHING BELOW SAME */}
        {/* LEFT PANEL */}
        <div className="h-full overflow-y-auto p-5 bg-slate-900 border-r border-slate-800 space-y-6">
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
            <p className="text-gray-300">{problem.constraints}</p>
          </div>

          {/* SAMPLE TEST CASES */}
          {problem.test_cases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-400 mb-2">
                Sample Test Cases
              </h3>

              <div className="space-y-3">
                {problem.test_cases.map((tc, i) => (
                  <div key={i} className="bg-slate-800 p-3 rounded text-sm">
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
          sizes={splitSizes}
          minSize={120}
          className="flex flex-col h-full"
        >
          {/* EDITOR */}
          <div className="flex flex-col bg-slate-900">
            <div className="p-2 flex gap-2 border-b border-slate-800">
              <select
                value={language}
                onChange={handleLanguageChange}
                className="bg-slate-700 px-2 py-1 text-sm"
              >
                <option value="python">Python</option>
                <option value="cpp">C++</option>
              </select>

              <button
                onClick={handleRun}
                disabled={loading}
                className="bg-blue-600 px-3 py-1 text-sm disabled:opacity-50"
              >
                Run
              </button>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="bg-green-600 px-3 py-1 text-sm disabled:opacity-50"
              >
                Submit
              </button>

              {verdict && (
                <span className="ml-auto text-xs px-2 py-1 rounded bg-slate-700">
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
          <div className="flex flex-col bg-slate-950 border-t border-slate-800 relative">
            {loading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 text-sm">
                {loadingType === "run"
                  ? "Running your code..."
                  : "Evaluating test cases..."}
              </div>
            )}

            <div className="flex text-sm border-b border-slate-800">
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
                <>
                  <textarea
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                    className="w-full bg-slate-800 p-2 mb-3 text-xs rounded"
                    rows={3}
                  />

                  <div className="bg-slate-900 p-3 rounded text-gray-200 whitespace-pre-wrap border border-slate-800">
                    {output || "Run your code to see output"}
                  </div>
                </>
              )}

              {activeTab === "tests" && (
                <div className="space-y-2">
                  {testDetails.map((t, i) => {
                    const isOpen = expandedTest === i;

                    return (
                      <div
                        key={i}
                        className="border border-slate-800 rounded overflow-hidden"
                      >
                        <div
                          onClick={() => setExpandedTest(isOpen ? null : i)}
                          className="flex justify-between items-center px-3 py-2 cursor-pointer bg-slate-900 hover:bg-slate-800"
                        >
                          <span>Test Case {i + 1}</span>

                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              t.verdict === "AC"
                                ? "bg-green-600"
                                : t.verdict === "PENDING"
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                            }`}
                          >
                            {t.status}
                          </span>
                        </div>

                        {isOpen && t.input && (
                          <div className="p-3 text-xs bg-slate-950 space-y-2">
                            <div>
                              <div className="text-gray-400">Input</div>
                              <div className="bg-slate-800 p-2 rounded">
                                {t.input}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-400">Expected</div>
                              <div className="bg-slate-800 p-2 rounded">
                                {t.expected}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-400">Your Output</div>
                              <div className="bg-slate-800 p-2 rounded">
                                {t.output}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {testDetails.length === 0 && (
                    <div className="text-gray-500">
                      Submit to see test cases
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
