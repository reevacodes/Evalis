import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import { getAllExams, getRescheduleRequests, updateRescheduleRequest } from "../services/api";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    requested: 0,
    published: 0,
  });

  const [rescheduleRequests, setRescheduleRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReschedules = async () => {
    try {
        const reqRes = await getRescheduleRequests("pending");
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
    return <div className="text-white p-6">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold">Dashboard Overview</h1>
        <p className="text-gray-400 mt-1">
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
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-xl mt-8">
        <h3 className="mb-6 font-semibold text-xl">Student Reschedule Requests</h3>

        {rescheduleRequests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No pending requests at the moment.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300 border-collapse">
              <thead className="bg-slate-800/80 text-slate-400 text-xs uppercase tracking-wider">
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
                  <tr key={req._id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 font-medium text-white">{req.student_id}</td>
                    <td className="p-4 text-orange-400 font-medium">{req.exam_name}</td>
                    <td className="p-4">
                       {req.original_time ? new Date(req.original_time).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                       }) : "TBD"}
                    </td>
                    <td className="p-4 font-medium text-blue-400">
                       {new Date(req.preferred_time).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                       })}
                    </td>
                    <td className="p-4 max-w-xs truncate" title={req.reason}>
                       {req.reason}
                    </td>
                    <td className="p-4 text-center">
                       <span className="px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-bold uppercase tracking-wider border border-yellow-500/20">
                         Pending
                       </span>
                    </td>
                    <td className="p-4 flex items-center justify-center gap-2">
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
                         onClick={async () => {
                             await updateRescheduleRequest(req._id, {status: "rejected"});
                             fetchReschedules();
                         }}
                         className="px-4 py-1.5 bg-red-500 text-white hover:bg-red-600 rounded text-xs font-bold shadow-lg shadow-red-500/20 transition-all uppercase tracking-wide"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
