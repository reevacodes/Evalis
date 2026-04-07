export default function Filters({ filters, setFilters }) {
  return (
    <div className="flex gap-4 flex-wrap">
      <input
        placeholder="Subject"
        className="p-2 bg-slate-800 border border-slate-700 rounded text-white"
        value={filters.subject}
        onChange={(e) =>
          setFilters({ ...filters, subject: e.target.value, page: 1 })
        }
      />

      <select
        className="p-2 bg-slate-800 border border-slate-700 rounded text-white"
        value={filters.difficulty}
        onChange={(e) =>
          setFilters({ ...filters, difficulty: e.target.value, page: 1 })
        }
      >
        <option value="">All Difficulty</option>
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </div>
  );
}
