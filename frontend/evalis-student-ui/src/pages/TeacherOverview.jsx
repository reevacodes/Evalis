import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllExams } from "../services/api";

export default function TeacherOverview() {
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    published: 0,
    requested: 0,
  });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getAllExams();
        const exams = res.data.exams || [];

        setStats({
          total: exams.length,
          drafts: exams.filter((e) => e.status === "draft").length,
          published: exams.filter((e) => e.status === "published").length,
          requested: exams.filter(
            (e) =>
              e.status === "requested" ||
              e.schedule_requested ||
              e.unlock_requested
          ).length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return <div className="text-white">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold">Teacher Dashboard</h1>

      <div className="grid grid-cols-4 gap-4">
        <StatCard title="My Exams" value={stats.total} />
        <StatCard title="Draft Exams" value={stats.drafts} color="yellow-400" />
        <StatCard
          title="Published Exams"
          value={stats.published}
          color="green-400"
        />
        <StatCard
          title="Pending Requests"
          value={stats.requested}
          color="blue-400"
        />
      </div>
    </div>
  );
}
