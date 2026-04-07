import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, BookOpen, Boxes } from "lucide-react";

export default function Sidebar() {
  const location = useLocation();

  const menu = [
    { name: "Overview", path: "/admin", icon: LayoutDashboard },
    { name: "Exams", path: "/admin/exams", icon: FileText },
    { name: "Curriculum", path: "/admin/curriculum", icon: BookOpen },
    { name: "Question Bank", path: "/question-bank", icon: Boxes },
  ];

  return (
    <div className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-5 flex flex-col">
      <h2 className="text-xl font-semibold mb-10">
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
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="text-xs text-gray-500 mt-6">© 2026 Evalis</div>
    </div>
  );
}
