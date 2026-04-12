import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchExamSubmissions } from "../services/api";

export default function InstructorSubmissions() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [examTitle, setExamTitle] = useState("");
  const [totalMarks, setTotalMarks] = useState(100);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const loadLedger = async () => {
      try {
        const res = await fetchExamSubmissions(examId);
        setExamTitle(res.data.exam_title);
        setTotalMarks(res.data.total_marks);
        setSubmissions(res.data.submissions);
      } catch (err) {
        console.error("Failed to load ledger", err);
      } finally {
        setLoading(false);
      }
    };

    loadLedger();
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        Aggregating Submissions Matrix...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto">
        <button 
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-blue-400 hover:text-blue-300 mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back to Exams
        </button>

        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-3">
              📋 Administrator Ledger
            </h1>
            <p className="text-slate-400 mt-2 font-medium">
              Tracking <span className="text-emerald-400 font-bold">{submissions.length}</span> recorded submissions for <span className="text-blue-200">{examTitle}</span>
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl">
             <span className="block text-xs uppercase text-slate-500 font-bold tracking-wider mb-1 text-right">Max Exam Payload</span>
             <span className="text-xl font-bold text-white tracking-widest">{totalMarks} PTS</span>
          </div>
        </div>

        {submissions.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center shadow-xl">
            <span className="text-5xl opacity-40 block mb-4">🗂️</span>
            <h3 className="text-lg font-bold text-slate-200 mb-1">No Submissions Found</h3>
            <p className="text-slate-500 text-sm">Students have not pushed any payloads into the database for this exam yet.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-5 font-bold">Student Identity</th>
                    <th className="px-6 py-5 font-bold tracking-wide">Sys. Score</th>
                    <th className="px-6 py-5 font-bold tracking-wide">Accuracy</th>
                    <th className="px-6 py-5 font-bold tracking-wide">Submission Time</th>
                    <th className="px-6 py-5 font-bold tracking-wide text-right">Evaluation Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {submissions.map((sub) => {
                    const analytics = sub.analytics || {};
                    const acc = analytics.accuracy || 0;
                    
                    return (
                      <tr key={sub._id} className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-200">{sub.student_email}</div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{sub.student_id}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-lg font-bold font-mono text-emerald-400 drop-shadow-md">
                            {sub.mcq_score}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                             <div className="w-12 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                               <div 
                                 className={`h-full ${acc > 70 ? 'bg-emerald-500' : acc > 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                 style={{ width: `${acc}%` }}
                               ></div>
                             </div>
                             <span className="text-sm font-semibold text-slate-300">{acc}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-400">
                            {new Date(sub.submitted_at).toLocaleString(undefined, {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {sub.pending_manual_review ? (
                            <button className="flex items-center justify-end gap-2 w-full text-xs font-bold text-orange-400 bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/20 transition cursor-pointer">
                              <span className="relative flex h-2 w-2 mr-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                              </span>
                              Needs Review ({sub.coding_answers_count})
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                              ✓ Evaluated
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
