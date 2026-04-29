import { Loader2, Sparkles } from "lucide-react";

export default function Loader({ text = "Loading...", fullScreen = true }) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-6">
      <div className="relative flex items-center justify-center">
        {/* Cute animated background circles */}
        <div className="absolute w-24 h-24 bg-indigo-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        <div className="absolute w-16 h-16 bg-blue-500/30 rounded-full animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
        
        {/* Main Spinner */}
        <div className="relative bg-white dark:bg-slate-900 p-4 rounded-full shadow-lg border border-indigo-100 dark:border-slate-800">
           <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
           <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400 animate-pulse" />
        </div>
      </div>
      
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-wide">
          {text}
        </h3>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest animate-pulse">
          Please wait a moment...
        </p>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/80 dark:bg-slate-950/80 backdrop-blur-md transition-all">
        {content}
      </div>
    );
  }

  return <div className="py-20 w-full flex justify-center">{content}</div>;
}
