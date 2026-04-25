export default function StatCard({ title, value, color = "white" }) {
  return (
    <div className="bg-gray-50 dark:bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-xl hover:scale-[1.02] transition shadow-sm dark:shadow-none">
      <p className="text-sm text-slate-600 dark:text-gray-400">{title}</p>

      <h2 className={`text-2xl font-bold mt-2 ${color === "white" ? "text-slate-900 dark:text-white" : `text-${color}`}`}>{value}</h2>
    </div>
  );
}
