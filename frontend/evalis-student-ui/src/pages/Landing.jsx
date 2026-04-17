import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";
import { Code, BrainCircuit } from "lucide-react";

export default function Landing() {
   const navigate = useNavigate();
   const { user } = useAuth();

   useEffect(() => {
      if (user) {
         if (user.role === "admin") navigate("/admin");
         else if (user.role === "teacher") navigate("/teacher");
         else navigate("/student");
      }
   }, [user, navigate]);

   return (
      <div className="min-h-screen bg-[#0b0f19] text-slate-200 relative overflow-hidden flex items-center justify-center font-sans tracking-wide">
         {/* Subtle Formal Glass Gradient */}
         <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-transparent to-purple-600/10 pointer-events-none" />

         <div className="relative z-10 w-full max-w-7xl px-8 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">

            {/* Left Side: Evalis Branding Context */}
            <div className="flex flex-col justify-center h-full max-w-lg pt-10">

               {/* Perfected Vector Node Logo block provided by user */}
               <div className="mb-6 flex items-center justify-start">
                  <img src="/evalis_logo_transparent.png" alt="Evalis Logo" className="h-[80px] object-contain drop-shadow-[0_0_20px_rgba(37,99,235,0.2)]" onError={(e) => { e.target.style.display = 'none'; }} />
               </div>

               <h1 className="text-5xl md:text-6xl font-semibold leading-[1.15] text-white tracking-tight mb-6">
                  <span className="text-blue-500">| </span>Evalis <br />
                  <span className="text-gray-400 text-4xl md:text-4xl mt-2 block tracking-normal font-medium">Exclusive Assessment Portal</span>
               </h1>

               <p className="text-base text-gray-400 leading-relaxed mb-12">
                  The unified exam framework for MIET. Construct stringent evaluation matrices, deploy code environments securely, and grade dynamically.
               </p>

               <div className="flex flex-col gap-6 w-full">
                  <div className="flex items-start gap-5">
                     <div className="mt-1 flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Code size={18} />
                     </div>
                     <div>
                        <h3 className="text-sm font-semibold text-white">Live Code Execution</h3>
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">Dockerized sandbox environments built for zero-latency secure testing.</p>
                     </div>
                  </div>

                  <div className="flex items-start gap-5">
                     <div className="mt-1 flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <BrainCircuit size={18} />
                     </div>
                     <div>
                        <h3 className="text-sm font-semibold text-white">SWOT Analytics Engine</h3>
                        <p className="text-sm text-gray-400 mt-1 leading-relaxed">Granular telemetry breaking down student logic and performance gaps.</p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Right Side: AuthModal Form & MIET Logo */}
            <div className="flex flex-col items-center justify-center w-full lg:justify-end">
               <div className="w-full max-w-md flex flex-col items-center">

                  {/* MIET Logo encased in a subtle light-grey frosted glass shell */}
                  <div className="mb-8 w-full flex flex-col items-center justify-center gap-3">
                     <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500 font-bold border-b border-white/10 pb-1">Primary Campus Partner</span>
                     <div className="bg-slate-200/90 backdrop-blur-md border border-white/30 px-6 py-3 rounded-xl shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-transform hover:scale-[1.02]">
                        <img src="/miet_logo_transparent.png" alt="MIET Logo" className="h-[40px] object-contain drop-shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} />
                     </div>
                  </div>

                  <div className="w-full transition-transform transform">
                     <AuthModal onClose={() => { }} hideClose={true} isInline={true} />
                  </div>

                  <p className="mt-8 text-center text-xs font-semibold text-slate-600 uppercase tracking-[0.2em]">
                     Powered by Evalis Core Systems
                  </p>
               </div>
            </div>
         </div>
      </div>
   );
}
