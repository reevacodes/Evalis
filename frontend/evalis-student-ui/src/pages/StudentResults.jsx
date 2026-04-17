import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchUserExamResults } from "../services/api";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from "recharts";
import { LayoutDashboard, BookOpen, Layers, Users, Database, Settings, HelpCircle, Bell, Search, GraduationCap } from "lucide-react";

export default function StudentResults() {
  const { examId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    const loadResults = async () => {
      try {
        const res = await fetchUserExamResults(examId);
        setData(res.data);
      } catch (err) {
        console.error("Failed to load results", err);
      } finally {
        setLoading(false);
      }
    };

    loadResults();
  }, [examId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
         <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mr-3"></div>
         Aggregating Performance Analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-red-400">
        Failed to locate submission record.
      </div>
    );
  }

  if (!data.is_published) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 text-white">
        <div className="bg-slate-900 border border-slate-800/60 p-8 rounded-2xl md:w-[500px] text-center shadow-xl">
          <div className="w-20 h-20 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-3 tracking-wide text-slate-100">
            Results Locked
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">
            Your instructor has not yet verified the final coding submissions and published the global analytics graph. 
            Check back later!
          </p>
          <button
            onClick={() => navigate("/student")}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl transition font-medium shadow-lg shadow-indigo-600/20"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const sub = data.submission;
  const analytics = sub.analytics || {};
  const accuracy = analytics.accuracy || 0;
  
  // Custom Data Mappings for Charts
  const topicData = (analytics.strong_topics || []).map(t => ({ name: t, score: 90, type: 'strong' }))
    .concat((analytics.weak_topics || []).map(t => ({ name: t, score: 30, type: 'weak' })));
    
  if (topicData.length === 0) {
    topicData.push({ name: "General Knowledge", score: accuracy, type: 'strong' });
  }

  // Faux Timeline for visual beauty (mapping to attempts/time if we had it)
  const timelineData = [
    { name: '10m', val: 20 },
    { name: '20m', val: 50 },
    { name: '30m', val: 40 },
    { name: '40m', val: 80 },
    { name: '50m', val: 70 },
    { name: '60m', val: accuracy },
  ];

  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (accuracy / 100) * circumference;

  const NavItem = ({ icon: Icon, text, active }) => (
    <div className={`flex items-center gap-4 px-6 py-3 cursor-pointer border-l-2 transition-all ${active ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-transparent text-slate-500 hover:text-slate-300'}`}>
      <Icon size={20} strokeWidth={2} className={active ? "text-indigo-400" : "text-slate-500"}/>
      <span className="font-semibold text-sm">{text}</span>
    </div>
  );

  return (
    <div className="bg-[#0b0f19] text-white flex font-sans">
      {/* 🚀 MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto w-full">
        {/* HEADER MOVED TO GLOBAL NAVBAR */}

        {/* DASHBOARD BODY */}
        <div className="p-8 pb-20">
          
          <div className="mb-8 flex justify-between items-end">
             <div>
                <h1 className="text-2xl font-bold text-white mb-1">Performance Analytics</h1>
                <p className="text-sm text-slate-400">Deep dive into your attempt for <span className="text-indigo-400 font-medium">{data.exam_title}</span>.</p>
             </div>
             <button onClick={() => navigate("/student")} className="px-5 py-2.5 rounded-full bg-[#151c2c] border border-white/10 text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors">
               ← Back
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* KPI 1: Accuracy */}
            <div className="bg-[#151c2c] border border-white/10 rounded-2xl p-6 flex flex-col relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/5 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
               <h3 className="text-sm font-bold text-slate-400 mb-6 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500"></div> System Accuracy</h3>
               <div className="flex items-center gap-6 mt-auto">
                 <div className="relative w-20 h-20">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" className="text-[#1e293b]" />
                      <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="6" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className={`${accuracy >= 70 ? 'text-indigo-500' : accuracy >= 40 ? 'text-orange-500' : 'text-red-500'} stroke-current drop-shadow-[0_0_10px_rgba(99,102,241,0.4)] transition-all duration-1000`} strokeLinecap="round"/>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-xl font-bold">{accuracy}%</span>
                    </div>
                 </div>
                 <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Score</p>
                   <p className="text-3xl font-black text-slate-100">{sub.mcq_score}</p>
                 </div>
               </div>
            </div>

            {/* KPI 2: MCQs */}
            <div className="bg-[#151c2c] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
               <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> MCQ Interactions</h3>
               <div className="space-y-4 mt-6">
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-xs font-semibold text-slate-400">Total Valid Output</span>
                    <span className="text-lg font-bold text-emerald-400">{analytics.correct_mcqs}</span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                    <span className="text-xs font-semibold text-slate-400">Attempted</span>
                    <span className="text-lg font-bold text-slate-200">{analytics.attempted_mcqs} / {analytics.total_mcqs}</span>
                  </div>
               </div>
            </div>

            {/* KPI 3: Coding */}
            <div className="bg-[#151c2c] border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
               <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-orange-500"></div> Coding Submissions</h3>
               <div className="flex items-end gap-5 mt-6">
                 <div>
                   <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Recorded</p>
                   <p className="text-4xl font-black text-slate-100">{Object.keys(sub.coding_answers || {}).length}</p>
                 </div>
                 <div className="flex-1 h-12 flex items-end gap-1 pb-1">
                   {[40, 60, 30, 80, 50, 90, 100].map((h, i) => (
                     <div key={i} className="flex-1 bg-orange-500/20 rounded-t-sm" style={{ height: `${h}%` }}>
                       <div className="w-full bg-orange-500 rounded-t-sm" style={{ height: '3px' }}></div>
                     </div>
                   ))}
                 </div>
               </div>
            </div>
          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            
            <div className="bg-[#151c2c] border border-white/10 rounded-2xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-slate-200 mb-6">Performance Timeline</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }} 
                      itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="val" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#151c2c] border border-white/10 rounded-2xl p-6 shadow-lg">
              <h3 className="text-base font-bold text-slate-200 mb-6">Topic Breakdown (SWOT)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topicData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={130} tickFormatter={(val) => val.length > 18 ? val.substring(0, 18) + "..." : val} />
                    <Tooltip 
                      cursor={{fill: '#1e293b', opacity: 0.4}}
                      contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '8px' }} 
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                      {topicData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.type === 'strong' ? '#10b981' : '#f43f5e'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>

          {/* TABLE */}
          <div className="bg-[#151c2c] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
             <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-200">Coding Solutions Ledger</h3>
                {sub.pending_manual_review ? (
                   <span className="px-3 py-1 flex items-center gap-2 text-xs font-bold rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                     <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> Pending Review
                   </span>
                ) : (
                   <span className="px-3 py-1 text-xs font-bold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                     Evaluated
                   </span>
                )}
             </div>

             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-white/5 border-b border-white/10 text-[10px] uppercase font-bold tracking-widest text-slate-500">
                     <th className="px-6 py-4">Question Vector</th>
                     <th className="px-6 py-4">Language Stack</th>
                     <th className="px-6 py-4">Status</th>
                     <th className="px-6 py-4 text-right">Action</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-[#1e293b]">
                   {Object.keys(sub.coding_answers || {}).length > 0 ? (
                      Object.entries(sub.coding_answers).map(([key, cData], idx) => (
                        <tr key={key} className="hover:bg-slate-800 transition-colors group cursor-pointer">
                           <td className="px-6 py-4">
                             <div className="font-semibold text-slate-200 flex items-center gap-3">
                               <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/20">
                                 {idx + 1}
                               </div>
                               Question Vector {idx + 1}
                             </div>
                           </td>
                           <td className="px-6 py-4">
                             <span className="px-2.5 py-1 text-xs font-medium rounded-md bg-[#1e293b] border border-slate-700 text-slate-300 font-mono">
                               {cData.language || "python"}
                             </span>
                           </td>
                           <td className="px-6 py-4">
                             <span className="text-sm font-medium text-slate-400 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Code Stored
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right">
                             <button className="text-indigo-400 text-sm font-semibold hover:text-indigo-300 transition-colors opacity-0 group-hover:opacity-100">
                               Review Code →
                             </button>
                           </td>
                        </tr>
                      ))
                   ) : (
                     <tr>
                        <td colSpan="4" className="px-6 py-12 text-center">
                           <div className="flex flex-col items-center">
                              <span className="text-4xl opacity-20 mb-3">💻</span>
                              <p className="text-slate-500 font-medium text-sm">No coding submissions detected in this pipeline.</p>
                           </div>
                        </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>

        </div>
      </main>

    </div>
  );
}
