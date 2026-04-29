import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, BookOpen, Boxes, Archive, Sun, Moon, Users } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const menu = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Exams", path: "/admin/exams", icon: FileText },
    { name: "Curriculum", path: "/admin/curriculum", icon: BookOpen },
    { name: "Question Bank", path: "/question-bank", icon: Boxes },
    { name: "Practice Archive", path: "/admin/practice-archive", icon: Archive },
    { name: "Mock Upload", path: "/admin/mock-upload", icon: FileText },
  ];

  return (
    <div className="w-64 bg-gray-50 dark:bg-white/5 backdrop-blur-xl border-r border-gray-200 dark:border-white/10 p-5 flex flex-col transition-colors duration-300">
      <h2 className="text-xl font-semibold mb-10 text-slate-900 dark:text-white">
        Evalis <span className="text-blue-400">Admin</span>
      </h2>

      <nav className="space-y-2 flex-1">
        {menu.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition ${
                isActive
                  ? "bg-blue-600 text-white"
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
            className={`w-10 h-5 rounded-full relative transition-colors ${theme === 'dark' ? 'bg-blue-500' : 'bg-gray-400'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      <div className="text-xs text-gray-500 mt-6">© 2026 Evalis</div>
    </div>
  );
}
