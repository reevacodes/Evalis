import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import { getAllExams, getRescheduleRequests, updateRescheduleRequest, deleteRescheduleRequest, getActivityLogs, getLiveSessions, inviteTeacher } from "../services/api";
import { formatDateTime } from "../utils/formatDate";
import { Activity, Radio, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import AdminRejectModal from "../components/AdminRejectModal";
import RAGUploadModal from "../components/RAGUploadModal";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    requested: 0,
    published: 0,
  });

  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModalData, setRejectModalData] = useState({ isOpen: false, request: null });
  const [ragModalOpen, setRagModalOpen] = useState(false);

  // Teacher Invite State
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteData, setInviteData] = useState({ name: "", email: "" });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMessage, setInviteMessage] = useState("");

  const handleInviteTeacher = async (e) => {
    e.preventDefault();
    setInviteLoading(true);
    setInviteMessage("");
    try {
      await inviteTeacher(inviteData);
      setInviteMessage("Teacher invited successfully!");
      setTimeout(() => {
        setInviteModalOpen(false);
        setInviteData({ name: "", email: "" });
        setInviteMessage("");
      }, 2000);
    } catch (err) {
      setInviteMessage(err.response?.data?.detail || "Failed to invite teacher");
    } finally {
      setInviteLoading(false);
    }
  };

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
        
        const [logsRes, sessionsRes, res] = await Promise.all([
          getActivityLogs().catch(() => ({ data: [] })),
          getLiveSessions().catch(() => ({ data: [] })),
          getAllExams().catch(() => ({ data: { exams: [] } }))
        ]);
        
        setActivityLogs(logsRes.data || []);
        setLiveSessions(sessionsRes.data || []);

        const exams = res.data.exams || [];

        setStats({
          total: exams.length,
          active: exams.filter((e) => e.time_status === "active").length,
          requested: exams.filter((e) => e.schedule_requested).length,
          published: exams.filter((e) => e.status === "published").length,
        });
      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // ⚡ Real-Time Polling for Live Monitor
    const interval = setInterval(async () => {
      try {
        const sessionsRes = await getLiveSessions().catch(() => ({ data: [] }));
        setLiveSessions(sessionsRes.data || []);
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 5000); // 5 seconds refresh rate

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="text-slate-900 dark:text-white p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Dashboard Overview</h1>
            <p className="text-slate-600 dark:text-gray-400 mt-1">
              Monitor exams, activity, and system performance
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button 
              onClick={() => setRagModalOpen(true)}
              className="w-full sm:w-auto justify-center px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-5 h-5" /> RAG Mocks
            </button>
            <button 
              onClick={() => setInviteModalOpen(true)}
              className="w-full sm:w-auto justify-center px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-all flex items-center gap-2"
            >
              <span className="text-xl">+</span> Invite Teacher
            </button>
          </div>
        </div>

        {isInviteModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-8 rounded-xl w-full max-w-md shadow-2xl relative">
              <button onClick={() => setInviteModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:hover:text-white">✕</button>
              <h2 className="text-xl font-bold mb-6 text-slate-900 dark:text-white">Invite Teacher</h2>
              {inviteMessage && <div className={`p-3 rounded-lg text-sm mb-4 ${inviteMessage.includes("success") ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>{inviteMessage}</div>}
              <form onSubmit={handleInviteTeacher} className="flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Full Name</label>
                  <input type="text" value={inviteData.name} onChange={e => setInviteData({...inviteData, name: e.target.value})} required className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="John Doe" />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Email Address</label>
                  <input type="email" value={inviteData.email} onChange={e => setInviteData({...inviteData, email: e.target.value})} required className="w-full bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="teacher@university.edu" />
                </div>
                <button type="submit" disabled={inviteLoading} className="mt-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                  {inviteLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Invitation Link"}
                </button>
              </form>
            </div>
          </div>
        )}
        
        {/* NEW GRIDS FOR LIVE MONITORING & ACTIVITY */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 mt-8">
          
          {/* LIVE EXAM MONITORING */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-96">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-red-600 dark:text-red-400 animate-pulse" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Live Exam Monitor</h2>
              </div>
              <span className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-full">
                {liveSessions.length} Active
              </span>
            </div>
            
            <div className="overflow-y-auto flex-1 p-2">
              {liveSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <Radio className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No active examinations currently running.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {liveSessions.map((session, i) => (
                    <div key={i} className="p-3 border border-gray-100 dark:border-slate-800 rounded-lg hover:border-blue-500/30 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{session.student_name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-40">{session.exam_name}</p>
                        </div>
                        {session.warnings > 0 && (
                          <div className="flex items-center gap-1 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 rounded text-xs font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            {session.warnings} Infractions
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span>ID: {session.student_email.split('@')[0]}</span>
                        <span>Started: {new Date(session.start_time).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* GLOBAL AUDIT TRAIL */}
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col h-96">
            <div className="p-4 border-b border-gray-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Activity Log</h2>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-0">
              {activityLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500">
                  <Activity className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm font-medium">No recent system activity.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-slate-800/50">
                  {activityLogs.map((log) => (
                    <div key={log._id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <div className="flex justify-between items-start mb-1">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {log.role}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDateTime(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
                        {log.actor_name} <span className="text-slate-400 font-normal mx-1">&bull;</span> <span className="text-blue-500 dark:text-blue-400">{log.action}</span>
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-snug">
                        {log.details}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

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
      <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-4 md:p-6 rounded-lg md:rounded-xl mt-8 shadow-sm dark:shadow-none">
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
                  <tr key={req._id} className={`hover:bg-gray-50 dark:bg-slate-800/30 dark:hover:bg-slate-700/50 transition-colors ${req.status !== "pending" ? "opacity-50 grayscale-[50%]" : ""}`}>
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

      <RAGUploadModal 
        isOpen={ragModalOpen}
        onClose={() => setRagModalOpen(false)}
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
