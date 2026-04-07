import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, FileText, Plus } from "lucide-react";

export default function TeacherSidebar() {
  const location = useLocation();

  const menu = [
    { name: "Overview", path: "/teacher", icon: LayoutDashboard },
    { name: "My Exams", path: "/teacher/exams", icon: FileText },
    { name: "Create Exam", path: "/create-exam", icon: Plus },
  ];

  return (
    <div className="w-64 bg-white/5 backdrop-blur-xl border-r border-white/10 p-5 flex flex-col">
      <h2 className="text-xl font-semibold mb-10">
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
