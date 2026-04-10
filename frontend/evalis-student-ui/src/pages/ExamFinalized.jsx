import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam, requestSchedule, requestUnlock } from "../services/api";

export default function ExamFinalized() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scheduleRequested, setScheduleRequested] = useState(false);
  const [unlockRequested, setUnlockRequested] = useState(false);



  const loadExam = async () => {
    try {
      const data = await fetchExam(examId);

      // 🚨 PROTECT ROUTE
      if (data.status === "draft") {
        navigate(`/exam/${examId}/edit`);
        return;
      }

      setExam(data);

      // ✅ sync with backend flags
      setScheduleRequested(data.schedule_requested || false);
      setUnlockRequested(data.unlock_requested || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, []);

  const handleRequestSchedule = async () => {
    if (scheduleRequested) return;

    try {
      await requestSchedule(examId);
      setScheduleRequested(true);
      alert("Schedule request sent");
    } catch (err) {
      alert(err.response?.data?.detail || "Request failed");
    }
  };

  const handleRequestUnlock = async () => {
    if (unlockRequested) return;

    try {
      await requestUnlock(examId);
      setUnlockRequested(true);
      alert("Unlock request sent");
    } catch (err) {
      alert(err.response?.data?.detail || "Request failed");
    }
  };

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (!exam) return <p className="text-red-400 p-6">Exam not found</p>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{exam.exam_name}</h1>
          <p className="text-slate-400 text-sm">Finalized Exam (Locked)</p>
        </div>

        {/* LOCK SCREEN */}
        <div className="mb-8 bg-slate-900 flex flex-col items-center justify-center p-12 rounded-lg border border-slate-800 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Exam Content Locked</h2>
          <p className="text-slate-400 max-w-lg mb-6">
            For maximum security, this exam operates on a strict Zero-Trust policy. The generated questions cannot be viewed until the students actively begin the test.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg inline-block text-sm border border-slate-700">
            <p><strong>Configured Sections:</strong> {exam.sections?.length || 0}</p>
            <p className="mt-1"><strong>Seed Questions Curated:</strong> {exam.sections?.reduce((acc, sec) => acc + (sec.questions?.length || 0), 0) || 0}</p>
          </div>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleRequestSchedule}
            disabled={scheduleRequested}
            className={`px-6 py-3 rounded-lg ${
              scheduleRequested
                ? "bg-blue-600 opacity-50 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {scheduleRequested ? "Requested" : "Request Schedule"}
          </button>

          <button
            onClick={handleRequestUnlock}
            disabled={unlockRequested}
            className={`px-6 py-3 rounded-lg ${
              unlockRequested
                ? "bg-yellow-500 opacity-50 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            {unlockRequested ? "Requested" : "Request Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}
