import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import { getAllExams, getRescheduleRequests, updateRescheduleRequest, deleteRescheduleRequest } from "../services/api";
import { formatDateTime } from "../utils/formatDate";
import AdminRejectModal from "../components/AdminRejectModal";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    requested: 0,
    published: 0,
  });

  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalData, setRejectModalData] = useState({ isOpen: false, request: null });

  const handleRejectSubmit = async (reason) => {
    try {
      await updateRescheduleRequest(rejectModalData.request._id, { 
        status: "rejected", 
        admin_feedback: reason 
      });
      setRejectModalData({ isOpen: false, request: null });
      fetchReschedules();
    } catch (err) {
      alert("Failed to reject request: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleDeleteRequest = async (requestId) => {
    if(!window.confirm("Are you sure you want to permanently delete this request history?")) return;
    try {
      await deleteRescheduleRequest(requestId);
      fetchReschedules();
    } catch (err) {
      alert("Failed to delete request: " + (err.response?.data?.detail || err.message));
    }
  };

  const fetchReschedules = async () => {
    try {
        const reqRes = await getRescheduleRequests("all");
        if(reqRes.data?.requests) {
           setRescheduleRequests(reqRes.data.requests);
        }
    } catch(err) {
        console.error(err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetchReschedules();
        const res = await getAllExams();
        const exams = res.data.exams || [];

        setStats({
          total: exams.length,
          active: exams.filter((e) => e.time_status === "active").length,
          requested: exams.filter(
            (e) =>
              e.status === "requested" ||
              e.schedule_requested ||
              e.unlock_requested
          ).length,
          published: exams.filter((e) => e.status === "published").length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-slate-900 dark:text-white p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold">Dashboard Overview</h1>
        <p className="text-slate-600 dark:text-gray-400 mt-1">
          Monitor exams, activity, and system performance
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Exams" value={stats.total} />
        <StatCard title="Active Exams" value={stats.active} color="green-400" />
        <StatCard
          title="Pending Approvals"
          value={stats.requested}
          color="yellow-400"
        />
        <StatCard
          title="Published Exams"
          value={stats.published}
          color="blue-400"
        />
      </div>

      {/* TABLE SECTION */}
      <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-6 rounded-xl mt-8 shadow-sm dark:shadow-none">
        <h3 className="mb-6 font-semibold text-xl">Student Reschedule Requests</h3>

        {rescheduleRequests.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-gray-400 text-center py-8">No pending requests at the moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300 border-collapse">
              <thead className="bg-white dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-4 font-medium rounded-tl-lg">Student ID</th>
                  <th className="p-4 font-medium">Exam Name</th>
                  <th className="p-4 font-medium">Original Time</th>
                  <th className="p-4 font-medium">Preferred Time</th>
                  <th className="p-4 font-medium">Reason</th>
                  <th className="p-4 font-medium text-center">Status</th>
                  <th className="p-4 font-medium text-center rounded-tr-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {rescheduleRequests.map((req) => (
                  <tr key={req._id} className={`hover:bg-white dark:bg-slate-800/30 transition-colors ${req.status !== "pending" ? "opacity-50 grayscale-[50%]" : ""}`}>
                    <td className="p-4 font-medium text-slate-900 dark:text-white">{req.student_id}</td>
                    <td className="p-4 text-orange-400 font-medium">{req.exam_name}</td>
                    <td className="p-4">
                       {req.original_time ? formatDateTime(req.original_time) : "TBD"}
                    </td>
                    <td className="p-4 font-medium text-blue-400">
                       {formatDateTime(req.preferred_time)}
                    </td>
                    <td className="p-4 align-top">
                       <ExpandableReason text={req.reason} category={req.category} proofLink={req.proof_link} />
                    </td>
                    <td className="p-4 text-center">
                       {req.status === "pending" && (
                         <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/20">
                           Pending
                         </span>
                       )}
                       {req.status === "approved" && (
                         <span className="px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20">
                           Approved
                         </span>
                       )}
                       {req.status === "rejected" && (
                         <span className="px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-xs font-bold uppercase tracking-wider border border-red-500/20">
                           Rejected
                         </span>
                       )}
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
                      {req.status === "pending" ? (
                        <>
                          <button 
                             onClick={async () => {
                                 await updateRescheduleRequest(req._id, {status: "approved"});
                                 fetchReschedules();
                             }}
                             className="px-4 py-1.5 bg-green-500 text-white hover:bg-green-600 rounded text-xs font-bold shadow-lg shadow-green-500/20 transition-all uppercase tracking-wide"
                          >
                            Approve
                          </button>
                          <button 
                             onClick={() => setRejectModalData({ isOpen: true, request: req })}
                             className="px-4 py-1.5 bg-red-500 text-white hover:bg-red-600 rounded text-xs font-bold shadow-lg shadow-red-500/20 transition-all uppercase tracking-wide"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <button 
                           onClick={() => handleDeleteRequest(req._id)}
                           className="px-4 py-1.5 bg-gray-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded text-xs font-bold transition-all uppercase tracking-wide"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminRejectModal
        isOpen={rejectModalData.isOpen}
        onClose={() => setRejectModalData({ isOpen: false, request: null })}
        onSubmit={handleRejectSubmit}
        requestDetails={rejectModalData.request}
      />
    </div>
  );
}

// Helper Component to avoid cluttering the UI with massive text
const ExpandableReason = ({ text, category, proofLink }) => {
  const [expanded, setExpanded] = useState(false);
  const isLong = text?.length > 60;

  return (
    <div className="max-w-xs">
      {category && (
        <span className="inline-block px-2 py-0.5 bg-white dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase rounded mb-2 tracking-wider">
          {category}
        </span>
      )}
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
        {expanded || !isLong ? text : `${text.slice(0, 60)}...`}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-orange-400 hover:text-orange-300 mt-1.5 font-bold transition-colors"
        >
          {expanded ? "Show Less" : "Read Full Reason"}
        </button>
      )}
      {proofLink && (
        <div className="mt-3">
          <a 
            href={proofLink} 
            target="_blank" 
            rel="noreferrer" 
            className="inline-flex items-center gap-1.5 text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Official Proof
          </a>
        </div>
      )}
    </div>
  );
};
