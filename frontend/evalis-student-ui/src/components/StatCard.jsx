export default function StatCard({ title, value, color = "white" }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-xl hover:scale-[1.02] transition">
      <p className="text-sm text-gray-400">{title}</p>

      <h2 className={`text-2xl font-bold mt-2 text-${color}`}>{value}</h2>
    </div>
  );
}
