import { useEffect, useState, useRef } from "react";
import { Camera, Mic, Maximize, CheckCircle2, ShieldAlert, Video } from "lucide-react";
import * as tf from "@tensorflow/tfjs";
import * as blazeface from "@tensorflow-models/blazeface";
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@mediapipe/face_mesh';
import MCQSection from "../components/MCQSection";
import CodingSection from "../components/CodingSection";
import ExamHeader from "../components/ExamHeader";
import { fetchExam, fetchPastPaper, submitExam, submitPractice } from "../services/api";
import { useParams, useNavigate } from "react-router-dom";
import SuccessModal from "../components/SuccessModal";

export default function ExamPage({ isPractice = false }) {
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

  // ✅ PROCTORING STATES
  const [isProctorSetupComplete, setIsProctorSetupComplete] = useState(false);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [mediaStream, setMediaStream] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const videoRef = useRef(null);

  const submittedRef = useRef(false);
  const isLoadedRef = useRef(false);
  const warningCountRef = useRef(0);
  const cvWarningCountRef = useRef(0);
  const consecutiveMissingFrames = useRef(0);
  const consecutiveMultipleFrames = useRef(0);
  const aiIntervalRef = useRef(null);
  const storageKey = `exam_${examId}_answers`;

  // ================= LOAD EXAM =================
  useEffect(() => {
    const loadExam = async () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setAnswers(parsed.mcq || {});
          setCodingAnswers(parsed.coding || {});
        }

        const res = isPractice ? await fetchPastPaper(examId) : await fetchExam(examId);
        const data = res;

        console.log("FULL DATA:", data); // 🔥 add this
        console.log("TIME STATUS:", data.time_status); // 🔥 add this
        console.log("START TIME:", data.start_time); // 🔥 add this

        if (!data?.sections?.length) {
          setExamExists(false);
          return;
        }

        // ✅ NEW: time status from backend
        // Bypass time constraints entirely for practice mode.
        setTimeStatus(isPractice || data.mode === "practice" ? "active" : (data.time_status || "scheduled"));
        
        // ✅ NEW: calculate start & end time (Past papers optionally have a duration_minutes)
        if (data.start_time || isPractice) {
          const start = data.start_time ? new Date(data.start_time) : new Date();
          const end = new Date(start.getTime() + (data.duration_minutes || 60) * 60000);

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
        setTimeout(() => {
            isLoadedRef.current = true;
        }, 500); 
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
      handleAutoSubmit("Time expired! Your exam was auto-submitted.");
    }
  }, [timeLeft]);

  // ================= PROCTORING: TAB SWITCH DETECTION =================
  useEffect(() => {
    // Only monitor strictly for non-practice formal exams
    if (isPractice || timeStatus !== "active" || !isProctorSetupComplete) return;

    const handleVisibilityChange = () => {
      // If the page goes out of view and the student hasn't legally submitted yet
      if (document.hidden && !submittedRef.current) {
        warningCountRef.current += 1;
        const violations = warningCountRef.current;

        if (violations === 1) {
          alert("⚠️ WARNING 1: Tab switching is strictly prohibited! Return to the exam immediately.");
        } else if (violations === 2) {
          alert("⚠️ FINAL WARNING: If you switch tabs one more time, your exam will be automatically submitted and locked.");
        } else if (violations >= 3) {
          alert("🚨 INFRACTION LIMIT EXCEEDED: You switched tabs 3 times. Your exam is now being automatically submitted.");
          handleAutoSubmit("Infraction limit exceeded. Exam terminated.");
        }
      }
    };

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement && !submittedRef.current) {
        alert("⚠️ WARNING: You have exited full screen mode! Please return to full screen immediately to avoid penalties.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullScreenChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullScreenChange);
    };
  }, [timeStatus, isPractice, isProctorSetupComplete]);

  // ================= PROCTORING: AI COMPUTER VISION LOOP =================
  useEffect(() => {
    if (isPractice || timeStatus !== "active" || !isProctorSetupComplete || !mediaStream) return;

    let blazefaceModel = null;
    let poseDetector = null;
    let isPredicting = false;

    const consecutivePoseFrames = { current: 0 };

    const initAI = async () => {
      try {
        await tf.ready();
        blazefaceModel = await blazeface.load();

        console.log("✅ Advanced AI Proctoring Active (Fast BlazeFace)");

        aiIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || !blazefaceModel || isPredicting || submittedRef.current) return;
          
          isPredicting = true;
          try {
             // 1. Face Detection Check
             const predictions = await blazefaceModel.estimateFaces(videoRef.current, false);
             
             if (predictions.length === 0) {
                 consecutiveMissingFrames.current += 1;
                 consecutiveMultipleFrames.current = 0;
             } else if (predictions.length > 1) {
                 consecutiveMultipleFrames.current += 1;
                 consecutiveMissingFrames.current = 0;
             } else {
                 consecutiveMissingFrames.current = 0;
                 consecutiveMultipleFrames.current = 0;

                 // 2. Head Pose Estimation (Fast computation using BlazeFace landmarks)
                 const face = predictions[0];
                 if (face && face.landmarks) {
                     const rightEye = face.landmarks[0];
                     const leftEye = face.landmarks[1];
                     const nose = face.landmarks[2];
                     const mouth = face.landmarks[3];

                     const eyeY = (leftEye[1] + rightEye[1]) / 2;
                     const eyeToNoseY = Math.abs(nose[1] - eyeY);
                     const noseToMouthY = Math.abs(mouth[1] - nose[1]);

                     const leftEyeToNoseX = Math.abs(nose[0] - leftEye[0]);
                     const rightEyeToNoseX = Math.abs(nose[0] - rightEye[0]);

                     // Pitch
                     const lookingDown = noseToMouthY < (eyeToNoseY * 0.6); 
                     const lookingUp = eyeToNoseY < (noseToMouthY * 0.4);

                     // Yaw
                     const lookingLeft = leftEyeToNoseX > (rightEyeToNoseX * 2.5);
                     const lookingRight = rightEyeToNoseX > (leftEyeToNoseX * 2.5);

                     if (lookingDown || lookingUp || lookingLeft || lookingRight) {
                         consecutivePoseFrames.current += 1;
                     } else {
                         consecutivePoseFrames.current = 0;
                     }
                 }
             }

             // Violation Thresholds (Reduced from 6 to 3 frames for faster detection)
             let violationReason = null;

             if (consecutiveMissingFrames.current >= 3) violationReason = "Face not detected in frame";
             else if (consecutiveMultipleFrames.current >= 3) violationReason = "Multiple people detected";
             else if (consecutivePoseFrames.current >= 3) violationReason = "Suspicious head pose (looking away)";

             if (violationReason) {
                 cvWarningCountRef.current += 1;
                 const cvViolations = cvWarningCountRef.current;
                 
                 // Reset counters after a strike
                 consecutiveMissingFrames.current = 0;
                 consecutiveMultipleFrames.current = 0;
                 consecutivePoseFrames.current = 0;

                 if (cvViolations === 1) {
                     alert(`⚠️ AI PROCTORING WARNING 1: ${violationReason}. Please ensure a quiet, distraction-free environment.`);
                 } else if (cvViolations === 2) {
                     alert(`⚠️ AI FINAL WARNING: ${violationReason}. One more violation will auto-submit your exam.`);
                 } else if (cvViolations >= 3) {
                     alert(`🚨 AI INFRACTION LIMIT EXCEEDED: ${violationReason}. Your exam is being automatically submitted.`);
                     handleAutoSubmit("AI Proctoring limit exceeded. Exam terminated.");
                 }
             }
          } catch (e) {
             console.log("AI Prediction error", e);
          } finally {
             isPredicting = false;
          }
        }, 500);

      } catch(err) {
        console.error("Failed to load AI models", err);
      }
    };

    initAI();

    return () => {
        if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);
    };
  }, [isProctorSetupComplete, mediaStream, timeStatus, isPractice]);

  // ✅ Attach video stream once the video element is mounted (and re-attach when entering Exam mode)
  useEffect(() => {
    if (mediaGranted && mediaStream && videoRef.current) {
        videoRef.current.srcObject = mediaStream;
    }
  }, [mediaGranted, mediaStream, isProctorSetupComplete]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    
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

    // Stop camera and AI once submitted
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    try {
      if (isPractice) {
          const res = await submitPractice(examId, {
              mcq_answers: answers,
              coding_answers: codingAnswers,
              tab_switches: warningCountRef.current,
              cv_violations: cvWarningCountRef.current
          });
          
          setSuccessMessage("Practice Exam Finished! Analytics Generated.");
          setShowSuccessModal(true);
          localStorage.removeItem(storageKey);
          
          setTimeout(() => {
              navigate(`/student/practice-result/${examId}`, { state: res.data });
          }, 2500);

      } else {
          await submitExam({
            examId,
            mcq_answers: answers,
            coding_answers: codingAnswers,
            tab_switches: warningCountRef.current,
            cv_violations: cvWarningCountRef.current
          });

          setSuccessMessage("Your exam data has been securely recorded.");
          setShowSuccessModal(true);
          localStorage.removeItem(storageKey);

          setTimeout(() => {
            navigate(`/student/results/${examId}`);
          }, 2500);
      }
      
    } catch {
      alert("❌ Submission failed");
    }
  };

  // ✅ AUTO SUBMIT (no UI, no prompts)
  const handleAutoSubmit = async (customMessage = null) => {
    if (submittedRef.current) return;

    submittedRef.current = true;

    // Stop camera and AI once submitted
    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
    }
    if (aiIntervalRef.current) clearInterval(aiIntervalRef.current);

    try {
      if (isPractice) {
          const res = await submitPractice(examId, {
            mcq_answers: answers,
            coding_answers: codingAnswers,
            tab_switches: warningCountRef.current,
            cv_violations: cvWarningCountRef.current
          });
          setSuccessMessage(customMessage || "Time expired! Practice Exam Finished.");
          setShowSuccessModal(true);
          localStorage.removeItem(storageKey);

          setTimeout(() => {
            navigate(`/student/practice-result/${examId}`, { state: res.data });
          }, 2500);
      } else {
          await submitExam({
            examId,
            mcq_answers: answers,
            coding_answers: codingAnswers,
            tab_switches: warningCountRef.current,
            cv_violations: cvWarningCountRef.current
          });

          setSuccessMessage(customMessage || "Time expired! Your exam was auto-submitted.");
          setShowSuccessModal(true);
          localStorage.removeItem(storageKey);

          setTimeout(() => {
            navigate(`/student/results/${examId}`);
          }, 2500);
      }
      
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

  // ⏳ NOT STARTED (Only if NOT practice mode)
  if (timeStatus === "scheduled" && !isPractice) {
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

  // ================= PROCTORING SETUP =================
  if (timeStatus === "active" && !isPractice && !isProctorSetupComplete) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#09090b] relative overflow-hidden p-6 font-sans">
        
        {/* Dynamic Background Gradients */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]"></div>
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-[900px] grid md:grid-cols-2 gap-8 bg-[#111116]/80 backdrop-blur-2xl p-10 rounded-[32px] border border-white/10 shadow-[0_0_80px_-20px_rgba(37,99,235,0.3)]">
            
            {/* Left Column: Video Preview */}
            <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3 mb-1">
                    <ShieldAlert className="w-7 h-7 text-indigo-400" />
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 tracking-tight">Identity Verification</h2>
                </div>
                
                <div className="relative w-full aspect-[4/3] bg-black/60 rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex items-center justify-center group">
                    {!mediaGranted ? (
                        <div className="flex flex-col items-center gap-4 text-slate-500 z-10">
                            <div className="p-4 bg-white/5 rounded-full ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-500">
                                <Video className="w-10 h-10 opacity-70 text-indigo-400" />
                            </div>
                            <span className="text-sm font-medium tracking-wide">Waiting for camera...</span>
                        </div>
                    ) : (
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            muted 
                            playsInline 
                            className="w-full h-full object-cover scale-[1.02]"
                        />
                    )}
                    
                    {/* Recording Indicator */}
                    {mediaGranted && (
                        <div className="absolute top-4 right-4 flex items-center gap-2.5 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 shadow-lg">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>
                            <span className="text-xs font-bold text-white tracking-widest uppercase">Live</span>
                        </div>
                    )}
                </div>
                <p className="text-slate-400 text-[13px] leading-relaxed mt-1 font-light">
                    Your environment is continuously analyzed by AI to maintain academic integrity. Ensure your face remains visible.
                </p>
            </div>

            {/* Right Column: Checklist */}
            <div className="flex flex-col justify-center gap-5">
                <div className="flex items-center gap-2 mb-1">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <h3 className="text-xs uppercase tracking-widest font-bold text-slate-500 px-2">System Checks</h3>
                    <div className="h-px bg-white/10 flex-1"></div>
                </div>
                
                {/* Hardware Check */}
                <div className={`p-5 rounded-2xl border flex items-start gap-4 transition-all duration-500 ${mediaGranted ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]' : 'bg-[#18181b]/50 border-white/5 hover:border-white/10 hover:bg-[#18181b]'}`}>
                    <div className={`p-3.5 rounded-full transition-colors duration-500 ${mediaGranted ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        {mediaGranted ? <CheckCircle2 className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h4 className={`text-[15px] font-bold mb-1 transition-colors ${mediaGranted ? 'text-indigo-400' : 'text-slate-200'}`}>Camera & Microphone</h4>
                        <p className="text-xs text-slate-500 mb-4 font-light leading-relaxed">Grants hardware access for live environment monitoring.</p>
                        {!mediaGranted ? (
                            <button 
                                onClick={async () => {
                                    try {
                                        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                                        setMediaStream(stream);
                                        setMediaGranted(true);
                                    } catch (err) {
                                        alert("You must allow Camera & Microphone access to proceed.");
                                    }
                                }}
                                className="px-5 py-2.5 bg-white text-black text-[13px] font-bold rounded-xl hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                            >
                                Enable Hardware
                            </button>
                        ) : (
                            <button 
                                onClick={() => {
                                    if (mediaStream) {
                                        mediaStream.getTracks().forEach(track => track.stop());
                                        setMediaStream(null);
                                    }
                                    setMediaGranted(false);
                                    if (videoRef.current) {
                                        videoRef.current.srcObject = null;
                                    }
                                }}
                                className="text-xs font-semibold text-slate-500 hover:text-red-400 transition-colors underline underline-offset-2"
                            >
                                Revoke Access
                            </button>
                        )}
                    </div>
                </div>

                {/* Full Screen Check */}
                <div className={`p-5 rounded-2xl border flex items-start gap-4 transition-all duration-500 ${isFullScreen ? 'bg-indigo-500/10 border-indigo-500/30 shadow-[0_0_30px_-10px_rgba(99,102,241,0.2)]' : 'bg-[#18181b]/50 border-white/5 hover:border-white/10 hover:bg-[#18181b]'}`}>
                    <div className={`p-3.5 rounded-full transition-colors duration-500 ${isFullScreen ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-400'}`}>
                        {isFullScreen ? <CheckCircle2 className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h4 className={`text-[15px] font-bold mb-1 transition-colors ${isFullScreen ? 'text-indigo-400' : 'text-slate-200'}`}>Immersive Mode</h4>
                        <p className="text-xs text-slate-500 mb-4 font-light leading-relaxed">Locks your workspace to prevent unauthorized navigation.</p>
                        {!isFullScreen ? (
                            <button 
                                onClick={async () => {
                                    try {
                                        await document.documentElement.requestFullscreen();
                                        setIsFullScreen(true);
                                    } catch (err) {
                                        alert("Could not enter full screen. Please check browser settings.");
                                    }
                                }}
                                className="px-5 py-2.5 bg-white text-black text-[13px] font-bold rounded-xl hover:bg-slate-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:hover:scale-100"
                                disabled={!mediaGranted}
                            >
                                Enter Full Screen
                            </button>
                        ) : (
                            <button 
                                onClick={async () => {
                                    if (document.fullscreenElement) {
                                        await document.exitFullscreen();
                                    }
                                    setIsFullScreen(false);
                                }}
                                className="text-xs font-semibold text-slate-500 hover:text-red-400 transition-colors underline underline-offset-2"
                            >
                                Exit Full Screen
                            </button>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <button 
                        disabled={!mediaGranted || !isFullScreen}
                        onClick={() => setIsProctorSetupComplete(true)}
                        className={`w-full py-4 rounded-xl font-extrabold text-[15px] transition-all duration-500 flex justify-center items-center gap-2 ${mediaGranted && isFullScreen ? "bg-white text-black hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]" : "bg-[#18181b] text-slate-600 cursor-not-allowed border border-white/5"}`}
                    >
                        {mediaGranted && isFullScreen ? "Begin Assessment" : "Awaiting Requirements..."}
                    </button>
                </div>
            </div>
        </div>
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

      {/* FLOATING PROCTORING CAMERA */}
      {mediaGranted && isProctorSetupComplete && mediaStream && (
        <div className="fixed bottom-6 right-6 w-48 aspect-video bg-black rounded-xl overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.8)] border border-white/10 z-50">
           <video 
              ref={videoRef} 
              autoPlay 
              muted 
              playsInline 
              className="w-full h-full object-cover scale-[1.02]"
           />
           <div className="absolute top-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse"></div>
              <span className="text-[9px] font-bold text-white uppercase tracking-wider">Live AI</span>
           </div>
        </div>
      )}

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
