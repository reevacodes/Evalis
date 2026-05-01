import Sidebar from "./Sidebar";

export default function AdminLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-80px)] bg-white dark:bg-[#0b0f19] text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar />

      <div className="flex-1 p-4 md:p-6 pb-24 md:pb-6 overflow-y-auto">{children}</div>
    </div>
  );
}
