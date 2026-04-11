import { useEffect, useState, useRef } from "react";
import MCQSection from "../components/MCQSection";
import CodingSection from "../components/CodingSection";
import ExamHeader from "../components/ExamHeader";
import { fetchExam, submitExam } from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import SuccessModal from "../components/SuccessModal";

export default function ExamPage() {
  const { examId } = useParams();
  const navigate = useNavigate();
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [activeSection, setActiveSection] = useState("");
  const [answers, setAnswers] = useState({});
  const [codingAnswers, setCodingAnswers] = useState({});
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [codingQuestions, setCodingQuestions] = useState([]);

  const [loading, setLoading] = useState(true);
  const [examExists, setExamExists] = useState(true);

  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timeStatus, setTimeStatus] = useState("scheduled"); // 🔥 NEW

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  const submittedRef = useRef(false);
  const storageKey = `exam_${examId}_answers`;

  // ================= LOAD EXAM =================
  useEffect(() => {
    const loadExam = async () => {
      try {
        const res = await fetchExam(examId);
        const saved = localStorage.getItem(storageKey);

        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed.mcq || {});
          setCodingAnswers(parsed.coding || {});
        }
        const data = res;

        console.log("FULL DATA:", data); // 🔥 add this
        console.log("TIME STATUS:", data.time_status); // 🔥 add this
        console.log("START TIME:", data.start_time); // 🔥 add this

        if (!data?.sections?.length) {
          setExamExists(false);
          return;
        }

        // ✅ NEW: time status from backend
        setTimeStatus(data.time_status || "scheduled");
        // ✅ NEW: calculate start & end time
        if (data.start_time) {
          const start = new Date(data.start_time);
          const end = new Date(start.getTime() + data.duration_minutes * 60000);

          setStartTime(start);
          setEndTime(end);
        }

        let all = [];
        data.sections.forEach((s) =>
          s.questions?.forEach((q) => all.push({ ...q, type: s.type })),
        );

        setMcqQuestions(all.filter((q) => q.type === "mcq"));
        setCodingQuestions(all.filter((q) => q.type === "coding"));
      } catch {
        setExamExists(false);
      } finally {
        setLoading(false);
      }
    };

    loadExam();
  }, [examId, storageKey]);

  // ================= DEFAULT SECTION =================
  useEffect(() => {
    if (mcqQuestions.length) setActiveSection("mcq");
    else if (codingQuestions.length) setActiveSection("coding");
  }, [mcqQuestions, codingQuestions]);

  // ================= TIMER =================
  useEffect(() => {
    if (!endTime) return;

    const interval = setInterval(() => {
      const now = new Date();
      const remaining = Math.floor((endTime - now) / 1000);

      setTimeLeft(remaining > 0 ? remaining : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [endTime]);

  // ✅ Trigger submit sequentially on standard render loop to avoid Stale Closures
  useEffect(() => {
    if (timeLeft === 0 && !submittedRef.current) {
      handleAutoSubmit();
    }
  }, [timeLeft]);

  useEffect(() => {
    const data = {
      mcq: answers,
      coding: codingAnswers,
    };

    localStorage.setItem(storageKey, JSON.stringify(data));
  }, [answers, codingAnswers, storageKey]);

  // ================= SUBMIT =================
  // const handleSubmit = async () => {
  //   if (submittedRef.current) return;
  //   submittedRef.current = true;

  //   try {
  //     await submitExam({
  //       examId,
  //       mcq_answers: answers,
  //       coding_answers: codingAnswers,
  //     });

  //     alert("Submitted!");
  //   } catch {
  //     alert("Submission failed");
  //   }
  // };

  const confirmAndSubmit = async () => {
    if (submittedRef.current) return;

    if (confirmText.trim().toLowerCase() !== "done") {
      alert("Please type DONE to confirm");
      return;
    }

    submittedRef.current = true;

    try {
      await submitExam({
        examId,
        mcq_answers: answers,
        coding_answers: codingAnswers,
      });

      setSuccessMessage("Your exam data has been securely recorded.");
      setShowSuccessModal(true);
      localStorage.removeItem(storageKey);

      setTimeout(() => {
        navigate("/student");
      }, 2500);
      
    } catch {
      alert("❌ Submission failed");
    }
  };

  // ✅ AUTO SUBMIT (no UI, no prompts)
  const handleAutoSubmit = async () => {
    if (submittedRef.current) return;

    submittedRef.current = true;

    try {
      await submitExam({
        examId,
        mcq_answers: answers,
        coding_answers: codingAnswers,
      });

      setSuccessMessage("Time expired! Your exam was auto-submitted.");
      setShowSuccessModal(true);
      localStorage.removeItem(storageKey);

      setTimeout(() => {
        navigate("/student");
      }, 2500);
      
    } catch {
      alert("Auto submission failed");
    }
  };

  // ================= UI STATES =================

  if (loading) {
    return <div className="text-white p-6">Loading...</div>;
  }

  if (!examExists) {
    return (
      <div className="h-screen flex items-center justify-center text-white">
        No Exam
      </div>
    );
  }

  if (!timeStatus) {
    return <div className="text-white p-6">Loading exam status...</div>;
  }

  // ⏳ NOT STARTED
  if (timeStatus === "scheduled") {
    return (
      <div className="h-screen flex items-center justify-center text-white flex-col gap-2">
        <p className="text-lg text-blue-400">Exam not started yet</p>
        <p className="text-sm text-slate-400">
          Please wait for the scheduled time
        </p>
      </div>
    );
  }

  // ⛔ EXPIRED
  if (timeStatus === "expired") {
    return (
      <div className="h-screen flex items-center justify-center text-white flex-col gap-2">
        <p className="text-lg text-red-400">Exam expired</p>
        <p className="text-sm text-slate-400">
          You can no longer attempt this exam
        </p>
      </div>
    );
  }

  if (timeStatus === "unscheduled") {
    return (
      <div className="h-screen flex items-center justify-center text-white flex-col gap-2">
        <p className="text-lg text-yellow-400">Exam not scheduled yet</p>
        <p className="text-sm text-slate-400">Please contact admin</p>
      </div>
    );
  }

  // ================= MAIN EXAM =================
  return (
    <div className="h-screen flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* HEADER */}
      <ExamHeader
        timeLeft={timeLeft}
        onSubmit={() => setShowSubmitModal(true)}
      />

      {/* SECTION SWITCH */}
      <div className="flex gap-2 p-2 border-b border-slate-800">
        {mcqQuestions.length > 0 && (
          <button
            onClick={() => setActiveSection("mcq")}
            className="bg-slate-700 px-3 py-1"
          >
            MCQ
          </button>
        )}
        {codingQuestions.length > 0 && (
          <button
            onClick={() => setActiveSection("coding")}
            className="bg-slate-700 px-3 py-1"
          >
            Coding
          </button>
        )}
      </div>

      {/* MAIN AREA */}
      <div className="flex-1 overflow-hidden">
        {activeSection === "mcq" && (
          <div className="h-full overflow-y-auto">
            <MCQSection
              questions={mcqQuestions}
              answers={answers}
              setAnswers={setAnswers}
            />
          </div>
        )}

        {activeSection === "coding" && (
          <div className="h-full">
            <CodingSection
              problems={codingQuestions}
              codingAnswers={codingAnswers}
              setCodingAnswers={setCodingAnswers}
            />
          </div>
        )}
      </div>
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-slate-900 p-6 rounded-lg w-96 border border-slate-700">
            <h2 className="text-lg font-semibold mb-4">Confirm Submission</h2>

            <p className="text-sm text-slate-400 mb-3">
              Type <span className="text-yellow-400 font-semibold">DONE</span>{" "}
              to confirm
            </p>

            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DONE"
              className="w-full p-2 mb-4 bg-slate-800 border border-slate-600 rounded text-white"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowSubmitModal(false);
                  setConfirmText("");
                }}
                className="px-4 py-2 bg-slate-600 rounded hover:bg-slate-500"
              >
                Cancel
              </button>

              <button
                onClick={confirmAndSubmit}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ SUCCESS MODAL */}
      {showSuccessModal && (
        <SuccessModal title="Exam Submitted!" message={successMessage} />
      )}
    </div>
  );
}
