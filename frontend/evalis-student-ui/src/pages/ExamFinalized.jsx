import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam, requestSchedule, requestUnlock } from "../services/api";
import RequestScheduleModal from "../components/RequestScheduleModal";

export default function ExamFinalized() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);

  const [scheduleRequested, setScheduleRequested] = useState(false);
  const [unlockRequested, setUnlockRequested] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);



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

  const handleRequestScheduleSubmit = async (payload) => {
    try {
      await requestSchedule(examId, payload);
      setScheduleRequested(true);
      setIsScheduleModalOpen(false);
      alert("Detailed schedule request sent to admin");
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

  if (loading) return <p className="text-slate-900 dark:text-white p-6">Loading...</p>;
  if (!exam) return <p className="text-red-400 p-6">Exam not found</p>;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-gray-200 dark:border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{exam.exam_name}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Finalized Exam (Locked)</p>
        </div>

        {/* LOCK SCREEN */}
        <div className="mb-8 bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-12 rounded-lg border border-gray-200 dark:border-slate-800 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Exam Content Locked</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-6">
            For maximum security, this exam operates on a strict Zero-Trust policy. The generated questions cannot be viewed until the students actively begin the test.
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsScheduleModalOpen(true)}
            className={`px-6 py-3 rounded-lg ${
              scheduleRequested
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {scheduleRequested ? "Request Reschedule" : "Request Schedule"}
          </button>

        </div>
      </div>

      <RequestScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        onSubmit={handleRequestScheduleSubmit}
        examName={exam.exam_name}
      />
    </div>
  );
}
