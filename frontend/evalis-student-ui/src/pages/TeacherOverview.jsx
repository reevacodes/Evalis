import StatCard from "../components/StatCard";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAllExams } from "../services/api";
import { PlusCircle, BookOpen, BarChart2, Calendar, Clock, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import RAGUploadModal from "../components/RAGUploadModal";
import { formatDateTime } from "../utils/formatDate";

export default function TeacherOverview() {
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    published: 0,
    requested: 0,
  });
  
  const [recentExams, setRecentExams] = useState([]);

  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [ragModalOpen, setRagModalOpen] = useState(false);

  useEffect(() => {
    const fetchStats = async (silent = false) => {
      if (!silent && !stats.total) setLoading(true);
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
        
        // Sort by newest start_time or newest created (fallback)
        const sortedExams = [...exams].sort((a, b) => {
           const dateA = new Date(a.start_time || a.created_at || 0);
           const dateB = new Date(b.start_time || b.created_at || 0);
           return dateB - dateA;
        });
        
        setRecentExams(sortedExams.slice(0, 4));
        
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();

    const interval = setInterval(() => fetchStats(true), 10000); // 10 seconds silent refresh rate
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* 🌟 HERO SECTION */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/5 blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-slate-900 dark:text-white">
              Hello, Instructor {user?.name?.split(' ')[0] || ""}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg">
              Welcome to your command center. Manage assessments, review results, and guide your students.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <button 
               onClick={() => setRagModalOpen(true)}
               className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2 justify-center w-full sm:w-auto"
            >
               Contextual Mock Generator (RAG)
            </button>
            <button 
               onClick={() => navigate('/create-exam')}
               className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center gap-2 shadow-lg shadow-blue-500/25 justify-center w-full sm:w-auto"
            >
               <PlusCircle className="w-5 h-5" />
               Create New Exam
            </button>
          </div>
        </div>
      </div>

      {/* 📊 KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <StatCard title="Total Exams" value={stats.total} icon={<BookOpen className="w-5 h-5 opacity-50" />} />
        <StatCard title="Published Exams" value={stats.published} color="green-400" />
        <StatCard title="Draft Exams" value={stats.drafts} color="yellow-400" />
        <StatCard title="Pending Requests" value={stats.requested} color="blue-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 📚 RECENT EXAMS WIDGET */}
        <div className="lg:col-span-2 space-y-4">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                 <Clock className="w-5 h-5 text-blue-500" /> Recent Assessments
              </h2>
              <button 
                 onClick={() => navigate('/teacher/exams')}
                 className="text-sm font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                 View All <ArrowRight className="w-4 h-4" />
              </button>
           </div>
           
           <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-2 shadow-sm">
             {recentExams.length > 0 ? (
                <div className="flex flex-col">
                  {recentExams.map((exam, idx) => (
                    <div 
                       key={exam._id} 
                       onClick={() => navigate(exam.status === 'published' ? `/teacher/exam/${exam._id}/published` : `/teacher/exams`)}
                       className={`flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition ${idx !== recentExams.length - 1 ? 'border-b border-gray-100 dark:border-slate-800' : ''}`}
                    >
                       <div className="flex items-start gap-4">
                          <div className={`p-2.5 rounded-lg ${exam.status === 'published' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                             <BookOpen className="w-5 h-5" />
                          </div>
                          <div>
                             <h4 className="font-bold text-slate-900 dark:text-white">{exam.exam_name || "Untitled Exam"}</h4>
                             <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {exam.start_time ? formatDateTime(exam.start_time) : "Unscheduled"}
                             </p>
                          </div>
                       </div>
                       <div className="text-right">
                          <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${exam.status === 'published' ? 'bg-green-500/20 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-gray-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                             {exam.status}
                          </span>
                       </div>
                    </div>
                  ))}
                </div>
             ) : (
                <div className="p-8 text-center text-slate-500 flex flex-col items-center">
                   <BookOpen className="w-8 h-8 opacity-20 mb-2" />
                   <p className="text-sm">You haven't created any exams yet.</p>
                </div>
             )}
           </div>
        </div>
        
        {/* ⚡ QUICK ACTIONS WIDGET */}
        <div className="space-y-4">
           <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Quick Actions
           </h2>
           <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
              <button 
                 onClick={() => navigate('/question-bank')}
                 className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-50 dark:hover:bg-purple-500/10 transition-all text-left group"
              >
                 <div className="p-2 bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg group-hover:scale-110 transition-transform">
                    <BookOpen className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Question Bank</h4>
                    <p className="text-xs text-slate-500">Manage questions</p>
                 </div>
              </button>
              
              <button 
                 onClick={() => navigate('/teacher/exams')}
                 className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all text-left group"
              >
                 <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-lg group-hover:scale-110 transition-transform">
                    <BarChart2 className="w-5 h-5" />
                 </div>
                 <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Reports</h4>
                    <p className="text-xs text-slate-500">Grade submissions</p>
                 </div>
              </button>
           </div>
        </div>

      </div>

      <RAGUploadModal 
        isOpen={ragModalOpen}
        onClose={() => setRagModalOpen(false)}
      />
    </div>
  );
}
