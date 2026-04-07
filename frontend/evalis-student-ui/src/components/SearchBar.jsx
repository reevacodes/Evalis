export default function SearchBar({ filters, setFilters }) {
  return (
    <input
      type="text"
      placeholder="Search questions..."
      className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-white placeholder-gray-400"
      value={filters.search}
      onChange={(e) =>
        setFilters({ ...filters, search: e.target.value, page: 1 })
      }
    />
  );
}
