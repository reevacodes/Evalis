import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Bell, GraduationCap, Search, User, LogOut, Shield } from "lucide-react";

export default function Navbar() {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);

  if (!user) return null;

  // 🔥 ROLE-BASED NAV
  const navItems = {
    admin: [
      { name: "Dashboard", path: "/admin" },
      { name: "Exams", path: "/admin/exams" },
      { name: "Curriculum", path: "/admin/curriculum" },
    ],
    teacher: [
      { name: "Dashboard", path: "/teacher" },
      { name: "Create Exam", path: "/create-exam" },
      { name: "My Exams", path: "/teacher/exams" },
      { name: "Question Bank", path: "/question-bank" },
    ],
    student: [{ name: "Dashboard", path: "/student" }],
  };

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    // remove auth data
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    // clear axios header (extra safety)
    delete API.defaults.headers.common["Authorization"];

    // reset state
    setUser(null);

    // redirect
    navigate("/login");
  };
  return (
    <div className="sticky top-0 z-50 h-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-6 md:px-10 text-white font-sans transition-all">
      {/* LEFT: Branding & Links */}
      <div className="flex items-center gap-8">
        <h1
          onClick={() => navigate("/")}
          className="text-xl font-extrabold tracking-widest uppercase cursor-pointer flex items-center gap-3 text-slate-100"
        >
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center font-bold shadow-lg shadow-blue-500/30 text-white">E</div>
          Evalis
        </h1>

        <nav className="hidden md:flex gap-1 items-center border-l border-slate-800 pl-8">
          {navItems[user.role]?.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-inner"
                  : "text-slate-400 hover:bg-slate-900 border border-transparent hover:border-slate-800 hover:text-slate-200"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* RIGHT: Search & Profile */}
      <div className="flex items-center gap-6">
         {/* OPTIONAL SEARCH BAR */}
         <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded-full px-4 py-2 w-64 shadow-inner">
           <Search size={16} className="text-slate-500" />
           <input type="text" placeholder="Search Evalis..." className="bg-transparent border-none outline-none text-sm text-slate-300 ml-3 w-full placeholder-slate-600 focus:ring-0" />
         </div>

         {/* NOTIFICATIONS */}
         <button className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-900">
           <Bell size={20} />
           <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-950"></span>
         </button>

         {/* PROFILE DIVIDER */}
         <div className="hidden md:block h-10 w-px bg-slate-800"></div>

         {/* USER PROFILE BUBBLE */}
         <div className="relative">
           <button
             onClick={() => setOpen(!open)}
             className="flex items-center gap-3 bg-slate-900 border border-slate-800 pl-2 pr-4 py-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer group"
           >
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
               <div className="w-full h-full bg-slate-950 rounded-full flex items-center justify-center">
                  <GraduationCap size={18} className="text-slate-200" />
               </div>
             </div>

             <div className="text-left hidden md:block leading-tight">
               <p className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors capitalize">
                 {user?.name || user?.email.split('@')[0]}
               </p>
               <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">{user.role}</p>
             </div>
           </button>

           {open && (
             <div className="absolute right-0 mt-3 w-56 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
               <div className="p-4 border-b border-slate-800 bg-slate-950/50">
                  <p className="text-sm font-bold text-white truncate capitalize">{user?.name || user?.email.split('@')[0]}</p>
                  <p className="text-xs text-slate-500 truncate">{user?.email}</p>
               </div>
               
               <div className="p-2 space-y-1">
                 <button
                   onClick={() => { setOpen(false); navigate("/profile"); }}
                   className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-slate-800 rounded-xl text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                 >
                   <User size={16} className="text-slate-400" /> Profile Settings
                 </button>

                 {user.role === "admin" && (
                   <button
                     onClick={() => { setOpen(false); navigate("/admin"); }}
                     className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-blue-500/10 rounded-xl text-sm font-semibold text-blue-400 transition-colors"
                   >
                     <Shield size={16} /> Admin Panel
                   </button>
                 )}
               </div>

               <div className="border-t border-slate-800 p-2">
                 <button
                   onClick={() => { setOpen(false); handleLogout(); }}
                   className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-red-500/10 rounded-xl text-sm font-bold text-red-500 transition-colors"
                 >
                   <LogOut size={16} /> Secure Logout
                 </button>
               </div>
             </div>
           )}
         </div>
      </div>
    </div>
  );
}
