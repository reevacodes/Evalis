import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import { getAllExams } from "../services/api";

export default function AdminOverview() {
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    requested: 0,
    published: 0,
  });

  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchData = async () => {
      try {
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
          <h3 className="mb-4 font-medium text-lg">Pending Approval</h3>

          {stats.requested === 0 ? (
            <p className="text-sm text-gray-400">No exams pending approval</p>
          ) : (
            <p className="text-sm text-yellow-400">
              {stats.requested} exam(s) waiting for approval
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
