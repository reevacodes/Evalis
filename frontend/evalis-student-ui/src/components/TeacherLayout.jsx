import Sidebar from "./TeacherSidebar";

export default function TeacherLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">
      <Sidebar />
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
