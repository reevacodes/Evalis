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

      {/* GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* RECENT ACTIVITY */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-xl">
          <h3 className="mb-4 font-medium text-lg">Recent Activity</h3>

          <ul className="text-sm text-gray-400 space-y-3">
            <li className="flex justify-between">
              <span>Exam "DSA Midterm" published</span>
              <span className="text-xs text-gray-500">2h ago</span>
            </li>

            <li className="flex justify-between">
              <span>Curriculum updated (Sem 5)</span>
              <span className="text-xs text-gray-500">5h ago</span>
            </li>

            <li className="flex justify-between">
              <span>New subject added</span>
              <span className="text-xs text-gray-500">1d ago</span>
            </li>
          </ul>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-xl">
          <h3 className="mb-4 font-medium text-lg">Student Reschedule Requests</h3>

          {rescheduleRequests.length === 0 ? (
            <p className="text-sm text-gray-400">No pending requests</p>
          ) : (
            <div className="space-y-4 max-h-[300px] overflow-y-auto">
              {rescheduleRequests.map((req) => (
                <div key={req._id} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-orange-400">{req.exam_name}</p>
                      <p className="text-xs text-slate-400 mt-1">Student ID: {req.student_id}</p>
                      <p className="text-sm mt-2 text-slate-300">"{req.reason}"</p>
                      <p className="text-xs text-slate-400 mt-2">Pref: {new Date(req.preferred_time).toLocaleString()}</p>
                    </div>
                    <div className="flex flex-col gap-2">
                       <button 
                         onClick={async () => {
                             await updateRescheduleRequest(req._id, {status: "approved"});
                             fetchReschedules();
                         }}
                         className="px-3 py-1 bg-green-500/20 text-green-400 hover:bg-green-500/40 rounded text-xs"
                       >
                         Approve
                       </button>
                       <button 
                         onClick={async () => {
                             await updateRescheduleRequest(req._id, {status: "rejected"});
                             fetchReschedules();
                         }}
                         className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/40 rounded text-xs"
                       >
                         Reject
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
