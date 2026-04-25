import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Plus, BookOpen, Boxes, Settings, PenTool, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function TeacherSidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const menu = [
    { name: "Overview", path: "/teacher", icon: LayoutDashboard },
    { name: "My Exams", path: "/teacher/exams", icon: FileText },
    { name: "Create Exam", path: "/create-exam", icon: Plus },
  ];

  return (
    <div className="w-64 bg-gray-50 dark:bg-white/5 backdrop-blur-xl border-r border-gray-200 dark:border-white/10 p-5 flex flex-col transition-colors duration-300">
      <h2 className="text-xl font-semibold mb-10 text-slate-900 dark:text-white">
        Evalis <span className="text-purple-400">Teacher</span>
      </h2>

      <nav className="space-y-2 flex-1">
        {menu.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                active
                  ? "bg-purple-600 text-white"
                  : "text-slate-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div 
        onClick={toggleTheme} 
        className="flex items-center justify-between px-4 py-2 mt-auto text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white rounded-lg transition hover:bg-gray-200 dark:hover:bg-white/10 cursor-pointer"
      >
        <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={18} /> : <Sun size={18} />}
            Dark Mode
        </div>
        <button 
            className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-purple-500' : 'bg-gray-400'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-6">© 2026 Evalis</div>
    </div>
  );
}
