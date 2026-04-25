export default function SearchBar({ filters, setFilters }) {
  return (
    <input
      type="text"
      placeholder="Search questions..."
      className="w-full p-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-gray-400"
      value={filters.search}
      onChange={(e) =>
        setFilters({ ...filters, search: e.target.value, page: 1 })
      }
    />
  );
}
