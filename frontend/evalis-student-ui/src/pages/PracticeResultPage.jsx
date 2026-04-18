import { useLocation, useNavigate, useParams } from "react-router-dom";

export default function PracticeResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { examId } = useParams();

  const result = location.state;

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
        <h2 className="text-2xl font-bold mb-4">No Practice Results Found</h2>
        <p className="text-slate-400 mb-8">It seems you haven't completed this practice exam or navigated here directly.</p>
        <button 
            onClick={() => navigate("/student")} 
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold transition-all"
        >
            Return to Dashboard
        </button>
      </div>
    );
  }

  const { score, analytics, coding_results } = result;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="bg-purple-600 h-2 w-full"></div>
            
            <div className="p-8 pb-6 border-b border-slate-800 text-center">
                <h1 className="text-3xl font-bold mb-2">Practice Mission Accomplished <span className="inline-block animate-bounce">🎯</span></h1>
                <p className="text-slate-400">Your practice paper has been instantly evaluated without permanently affecting your official records.</p>
            </div>

            <div className="p-8">
                {/* 🎯 TOP METRICS */}
                <div className="grid md:grid-cols-3 gap-6 mb-10">
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center shadow-inner break-words">
                        <p className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Total Score</p>
                        <p className="text-4xl font-extrabold text-white">{score} <span className="text-lg text-slate-500 font-normal">pts</span></p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center shadow-inner group transition-all">
                        <p className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">Accuracy</p>
                        <p className={`text-4xl font-extrabold ${analytics.accuracy >= 70 ? 'text-green-400' : analytics.accuracy >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {analytics.accuracy}%
                        </p>
                    </div>
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 text-center shadow-inner">
                        <p className="text-slate-400 text-sm uppercase tracking-wider font-bold mb-2">MCQ Ratio</p>
                        <p className="text-4xl font-extrabold text-blue-400">
                           {analytics.correct_mcqs} <span className="text-2xl text-slate-600">/ {analytics.total_mcqs}</span>
                        </p>
                    </div>
                </div>

                {/* 📊 TOPIC BREAKDOWN */}
                {analytics.topic_breakdown && Object.keys(analytics.topic_breakdown).length > 0 && (
                    <div className="mb-10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-purple-400">⚡</span> Topic Analytics</h2>
                        <div className="grid md:grid-cols-2 gap-4">
                            {Object.entries(analytics.topic_breakdown).map(([topic, stat]) => {
                                const rate = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
                                return (
                                    <div key={topic} className="bg-slate-800/50 rounded-lg p-4 flex justify-between items-center border border-slate-700/50">
                                        <div>
                                            <p className="font-bold text-white tracking-wide">{topic.toUpperCase()}</p>
                                            <p className="text-xs text-slate-400 mt-1">{stat.correct} out of {stat.total} correct</p>
                                        </div>
                                        <div className="text-right">
                                           <span className={`px-3 py-1 text-sm font-bold rounded-full ${rate >= 70 ? 'bg-green-500/20 text-green-400' : rate >= 40 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                              {rate}%
                                           </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                
                {/* 💻 CODING RESULTS BLOCK */}
                {coding_results && Object.keys(coding_results).length > 0 && (
                     <div className="mb-10">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-blue-400">{"</>"}</span> Coding Execution</h2>
                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-sm font-mono text-slate-300">
                           {coding_results.status === 'pending_manual_review_or_execution' 
                            ? "▶ Coding answers safely stored. Automated unit-tests for practice mode are queued." 
                            : JSON.stringify(coding_results, null, 2)}
                        </div>
                     </div>
                )}

                <div className="mt-8 pt-8 border-t border-slate-800 flex justify-end">
                    <button 
                        onClick={() => navigate("/student")} 
                        className="px-8 py-4 bg-slate-800 hover:bg-slate-700 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-xl font-bold transition-all text-white"
                    >
                        Return to Dashboard
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
