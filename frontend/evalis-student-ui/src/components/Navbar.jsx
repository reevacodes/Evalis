import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";
import { Bell, GraduationCap, Search, User, LogOut, Shield, Sun, Moon } from "lucide-react";
import { formatDateTime } from "../utils/formatDate";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [openNotifs, setOpenNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [expandedNotifId, setExpandedNotifId] = useState(null);

  useEffect(() => {
    if (user && user.role === "student") {
      API.get("/notifications/me").then(res => {
         setNotifications(res.data.notifications || []);
      }).catch(err => console.error(err));
    }
  }, [user, location.pathname]);

  const handleNotifClick = async (notif) => {
    if (!notif.is_read) {
       await API.put(`/notifications/${notif._id}/read`);
       setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, is_read: true } : n));
    }
    
    if (notif.link) {
        navigate(notif.link);
        setOpenNotifs(false);
    } else {
        // Toggle expansion if no link
        setExpandedNotifId(prev => prev === notif._id ? null : notif._id);
    }
  };

  const markAllRead = async () => {
    await API.put('/notifications/read-all');
    setNotifications(prev => prev.map(n => ({...n, is_read: true})));
  };

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
    navigate("/");
  };
  return (
    <div className="sticky top-0 z-50 h-20 bg-[#0b0f19]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 md:px-10 text-slate-900 dark:text-white font-sans transition-all">
      {/* LEFT: Branding & Links */}
      <div className="flex items-center gap-8">
        <div
          onClick={() => navigate("/")}
          className="cursor-pointer flex items-center transition-transform hover:scale-105"
        >
          <img src="/evalis_logo_transparent.png" alt="Evalis Logo" className="h-[35px] md:h-[40px] object-contain drop-shadow-sm" onError={(e) => { e.target.style.display='none'; }}/>
        </div>

        <nav className="hidden md:flex gap-1 items-center border-l border-white/10 pl-8">
          {navItems[user.role]?.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive(item.path)
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/20 shadow-inner"
                  : "text-gray-400 hover:bg-white/5 border border-transparent hover:border-white/10 hover:text-slate-900 dark:text-white"
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
         <div className="hidden lg:flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2 w-64 shadow-inner">
           <Search size={16} className="text-gray-400" />
           <input type="text" placeholder="Search Evalis..." className="bg-transparent border-none outline-none text-sm text-gray-300 ml-3 w-full placeholder-gray-500 focus:ring-0" />
         </div>

         {/* THEME TOGGLE MOVED TO PROFILE DROPDOWN */}

         {/* NOTIFICATIONS */}
         <div className="relative">
           <button 
             onClick={() => { setOpenNotifs(!openNotifs); setOpen(false); }}
             className="relative text-gray-400 hover:text-slate-900 dark:text-white transition-colors p-2 rounded-full hover:bg-white/10"
           >
             <Bell size={20} />
             {notifications.some(n => !n.is_read) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#0b0f19]"></span>
             )}
           </button>

           {openNotifs && (
             <div className="absolute right-0 mt-3 w-80 bg-[#0b0f19] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in z-50">
                <div className="p-4 border-b border-white/10 bg-white/5 flex justify-between items-center">
                   <p className="text-sm font-bold text-slate-900 dark:text-white">Notifications</p>
                   {notifications.some(n => !n.is_read) && (
                     <button onClick={markAllRead} className="text-xs text-blue-400 hover:text-blue-300">Mark all read</button>
                   )}
                </div>
                <div className="max-h-80 overflow-y-auto p-2 space-y-1">
                   {notifications.length === 0 ? (
                     <div className="p-4 text-center text-gray-500 text-sm">No new alerts</div>
                   ) : (
                     notifications.map(n => (
                       <button 
                         key={n._id}
                         onClick={() => handleNotifClick(n)}
                         className={`w-full text-left p-3 rounded-xl transition-colors ${!n.is_read ? 'bg-blue-500/10 hover:bg-blue-500/20' : 'hover:bg-white/5'}`}
                       >
                         <p className={`text-sm ${!n.is_read ? 'text-slate-900 dark:text-white font-bold' : 'text-gray-300'}`}>{n.title}</p>
                         <p className={`text-xs text-gray-400 mt-1 transition-all ${expandedNotifId === n._id ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>{n.message}</p>
                         {expandedNotifId === n._id && !n.link && (
                           <span className="text-[10px] text-blue-400 font-semibold mt-1 block">Read Less</span>
                         )}
                         <p className="text-[10px] text-gray-500 mt-2">{formatDateTime(n.created_at)}</p>
                       </button>
                     ))
                   )}
                </div>
             </div>
           )}
         </div>

         {/* PROFILE DIVIDER */}
         <div className="hidden md:block h-10 w-px bg-white/10"></div>

         {/* USER PROFILE BUBBLE */}
         <div className="relative">
           <button
             onClick={() => { setOpen(!open); setOpenNotifs(false); }}
             className="flex items-center gap-3 bg-white/5 border border-white/10 pl-2 pr-4 py-1.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer group"
           >
             <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
               <div className="w-full h-full bg-[#0b0f19] rounded-full flex items-center justify-center">
                  <GraduationCap size={18} className="text-gray-200" />
               </div>
             </div>

             <div className="text-left hidden md:block leading-tight">
               <p className="text-sm font-bold text-gray-200 group-hover:text-slate-900 dark:text-white transition-colors capitalize">
                 {user?.name || user?.email.split('@')[0]}
               </p>
               <p className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">{user.role}</p>
             </div>
           </button>

           {open && (
             <div className="absolute right-0 mt-3 w-56 bg-[#0b0f19] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
               <div className="p-4 border-b border-white/10 bg-white/5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate capitalize">{user?.name || user?.email.split('@')[0]}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
               </div>
               
               <div className="p-2 space-y-1">
                 <button
                   onClick={() => { setOpen(false); navigate("/profile"); }}
                   className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-white/10 rounded-xl text-sm font-semibold text-gray-300 hover:text-slate-900 dark:text-white transition-colors"
                 >
                   <User size={16} className="text-gray-400" /> Profile Settings
                 </button>

                 {user.role === "admin" && (
                   <button
                     onClick={() => { setOpen(false); navigate("/admin"); }}
                     className="flex items-center gap-3 w-full text-left px-3 py-2 hover:bg-blue-600/20 rounded-xl text-sm font-semibold text-blue-400 transition-colors"
                   >
                     <Shield size={16} /> Admin Panel
                   </button>
                 )}

                 <div 
                    onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                 >
                    <div className="flex items-center gap-3 text-sm font-semibold text-gray-300 hover:text-slate-900 dark:text-white">
                       {theme === 'dark' ? <Moon size={16} className="text-gray-400" /> : <Sun size={16} className="text-gray-400" />}
                       Dark Mode
                    </div>
                    {/* Toggle Switch */}
                    <button 
                        className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-gray-400'}`}
                    >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                 </div>
               </div>

               <div className="border-t border-white/10 p-2">
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
