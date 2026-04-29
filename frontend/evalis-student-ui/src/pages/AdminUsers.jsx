import { useState, useEffect } from "react";
import { getAllUsers, deleteUser } from "../services/api";
import { Trash2, User, Loader2, Shield, GraduationCap, Clock, Search } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await getAllUsers();
      setUsers(res.data);
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId, role) => {
    if (role === "admin") {
      alert("Cannot delete admin users from here.");
      return;
    }
    
    if (window.confirm("Are you sure you want to completely remove this user? This cannot be undone.")) {
      setDeleteLoading(userId);
      try {
        await deleteUser(userId);
        setUsers(users.filter(u => u._id !== userId));
      } catch (err) {
        alert(err.response?.data?.detail || "Failed to delete user");
      } finally {
        setDeleteLoading(null);
      }
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "admin": return <Shield className="w-4 h-4 text-purple-500" />;
      case "teacher": return <User className="w-4 h-4 text-blue-500" />;
      case "student": return <GraduationCap className="w-4 h-4 text-green-500" />;
      default: return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const nameMatch = u.name?.toLowerCase().includes(query);
    const emailMatch = u.email?.toLowerCase().includes(query);
    return nameMatch || emailMatch;
  });

  const teachers = filteredUsers.filter(u => u.role === "teacher");
  const students = filteredUsers.filter(u => u.role === "student");
  // Also keep track of admins just in case you want to show them
  const admins = filteredUsers.filter(u => u.role === "admin");

  if (loading) return <div className="p-8"><Loader2 className="w-6 h-6 animate-spin text-slate-500" /></div>;

  const renderUserTable = (userList, emptyMessage) => (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">User</th>
              <th className="px-6 py-4 font-medium">Role</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/50">
            {userList.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              userList.map(user => (
                <tr key={user._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {getRoleIcon(user.role)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white capitalize">{user.name || "Pending Invite"}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active === false ? (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                        <Clock className="w-3.5 h-3.5" /> Pending Activation
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {user.role !== "admin" && (
                      <button
                        onClick={() => handleDelete(user._id, user.role)}
                        disabled={deleteLoading === user._id}
                        title="Remove User"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deleteLoading === user._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">User Management</h1>
          <p className="text-slate-600 dark:text-gray-400 mt-1">Manage teachers, students, and platform access</p>
        </div>
        
        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-white/10 rounded-xl leading-5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors shadow-sm"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {admins.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
            <Shield className="w-5 h-5 text-purple-500" /> Administrators
          </h2>
          {renderUserTable(admins, "No administrators found.")}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <User className="w-5 h-5 text-blue-500" /> Instructors & Teachers
        </h2>
        {renderUserTable(teachers, "No teachers found.")}
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <GraduationCap className="w-5 h-5 text-green-500" /> Students
        </h2>
        {renderUserTable(students, "No students found.")}
      </div>
    </div>
  );
}
