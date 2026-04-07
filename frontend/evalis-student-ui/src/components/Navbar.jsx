import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import API from "../services/api";

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
    <div className="h-16 bg-[#0b0f19] border-b border-white/10 flex items-center justify-between px-6 text-white">
      {/* LEFT */}
      <div className="flex items-center gap-6">
        <h1
          onClick={() => navigate("/")}
          className="text-xl font-semibold cursor-pointer"
        >
          Evalis
        </h1>

        <div className="hidden md:flex gap-2">
          {navItems[user.role]?.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`px-3 py-1 rounded-md text-sm transition ${
                isActive(item.path)
                  ? "bg-blue-600 text-white"
                  : "text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* 🔔 */}
        <button className="relative hover:bg-white/10 p-2 rounded-md">
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* 👤 PROFILE */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-3 bg-white/10 px-3 py-2 rounded-lg hover:bg-white/20"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm">
              {user?.email?.[0]?.toUpperCase()}
            </div>

            <div className="text-left hidden md:block">
              <p className="text-sm">{user?.name || user?.email}</p>
              <p className="text-xs text-gray-400 capitalize">{user.role}</p>
            </div>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-44 bg-[#0b0f19] border border-white/10 rounded-lg shadow-lg">
              <button
                onClick={() => navigate("/profile")}
                className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm"
              >
                Profile
              </button>

              {/* 🔥 ADMIN ONLY */}
              {user.role === "admin" && (
                <>
                  <button
                    onClick={() => navigate("/admin")}
                    className="w-full text-left px-4 py-2 hover:bg-white/5 text-sm text-blue-400"
                  >
                    Admin Panel
                  </button>
                </>
              )}

              <div className="border-t border-white/10 my-2"></div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-red-600 text-sm"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
