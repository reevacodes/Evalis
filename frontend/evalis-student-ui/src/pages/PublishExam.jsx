import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExam } from "../services/api";

export default function PublishExam() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);



  const loadExam = async () => {
    try {
      const res = await fetchExam(examId);
      const data = res.data;

      // 🚨 PROTECT ROUTE
      if (data.status === "draft") {
        navigate(`/exam/${examId}/edit`);
        return;
      }

      if (data.status === "finalized") {
        navigate(`/exam/${examId}/finalized`);
        return;
      }

      setExam(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExam();
  }, []);

  if (loading) return <p className="text-white p-6">Loading...</p>;
  if (!exam) return <p className="text-red-400 p-6">Exam not found</p>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="mb-6 border-b border-slate-800 pb-4">
          <h1 className="text-2xl font-semibold">{exam.exam_name}</h1>
          <p className="text-slate-400 text-sm">Published Exam</p>
        </div>

        {/* LOCK SCREEN */}
        <div className="mb-8 bg-slate-900 flex flex-col items-center justify-center p-12 rounded-lg border border-slate-800 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-2">Exam Content Locked</h2>
          <p className="text-slate-400 max-w-lg mb-6">
            For maximum security, this exam operates on a strict Zero-Trust policy. The generated questions cannot be viewed until the students actively begin the test.
          </p>
          <div className="bg-slate-800 p-4 rounded-lg inline-block text-sm border border-slate-700">
            <p><strong>Status:</strong> Published & Scheduled</p>
            <p className="mt-1 text-green-400"><strong>Sets A/B/C/D Generated</strong> ✅</p>
          </div>
        </div>
      </div>
    </div>
  );
}
