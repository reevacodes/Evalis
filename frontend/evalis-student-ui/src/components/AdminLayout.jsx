import Sidebar from "./Sidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">
      <Sidebar />

      <div className="flex-1 p-6 overflow-y-auto">{children}</div>
    </div>
  );
}
