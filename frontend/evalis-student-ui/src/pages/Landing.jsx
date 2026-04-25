import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import AuthModal from "../components/AuthModal";
import { useAuth } from "../context/AuthContext";

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
      <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex items-center justify-center font-sans">
         {/* Dynamic Background Elements */}
         <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/15 blur-[120px] mix-blend-screen pointer-events-none" />
         <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-purple-600/15 blur-[120px] mix-blend-screen pointer-events-none" />

         <div className="relative z-10 w-full max-w-7xl px-8 lg:px-16 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-24 items-center">

            {/* Left Side: Big Bold Typography */}
            <div className="flex flex-col justify-center max-w-2xl py-12 lg:py-0">
               
               <div className="mb-10 flex items-center gap-4">
                  <img 
                     src="/evalis_logo_transparent.png" 
                     alt="Evalis Logo" 
                     className="h-16 md:h-20 object-contain drop-shadow-[0_0_30px_rgba(37,99,235,0.4)]" 
                     onError={(e) => { e.target.style.display = 'none'; }} 
                  />
                  <span className="text-4xl md:text-5xl font-extrabold tracking-widest text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">EVALIS</span>
               </div>

               <h1 className="text-7xl md:text-[6rem] lg:text-[7rem] font-extrabold tracking-tighter leading-[0.95] mb-8">
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-indigo-600">Build.</span><br />
                  <span className="text-white">Evaluate.</span><br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-pink-600">Scale.</span>
               </h1>

               <p className="text-xl md:text-2xl text-gray-400 font-light leading-relaxed mb-2 max-w-lg">
                  The ultimate assessment portal.
               </p>
               <p className="text-lg text-gray-500 font-light max-w-lg mb-8">
                  Experience frictionless code execution and analytics, built exclusively for MIET.
               </p>

            </div>

            {/* Right Side: Glassmorphism Login & Partner Logo */}
            <div className="flex flex-col items-center lg:items-end justify-center w-full">
               <div className="w-full max-w-md relative flex flex-col items-center lg:items-end">
                  
                  {/* Partner Section - Top of Modal */}
                  <div className="mb-10 flex flex-col items-center justify-center w-full">
                     <div className="relative group cursor-pointer">
                        <div className="absolute inset-0 bg-white/10 rounded-2xl blur-xl group-hover:bg-white/20 transition-all duration-500"></div>
                        <div className="relative bg-slate-200/95 border border-white/30 backdrop-blur-md px-8 py-4 rounded-2xl transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.1)] group-hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] group-hover:-translate-y-1">
                           <img 
                              src="/miet_logo_transparent.png" 
                              alt="MIET Logo" 
                              className="h-12 object-contain opacity-100 drop-shadow-sm transition-opacity" 
                              onError={(e) => { e.target.style.display = 'none'; }} 
                           />
                        </div>
                     </div>
                  </div>

                  {/* Floating effect for modal container */}
                  <div className="relative z-20 w-full">
                     <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-lg pointer-events-none"></div>
                     <div className="relative w-full">
                        <AuthModal onClose={() => { }} hideClose={true} isInline={true} />
                     </div>
                  </div>

               </div>
            </div>
         </div>
      </div>
   );
}
