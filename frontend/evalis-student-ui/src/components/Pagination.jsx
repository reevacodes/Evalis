export default function Pagination({ total, filters, setFilters }) {
  const totalPages = Math.ceil(total / filters.limit);

  return (
    <div className="flex gap-3 items-center">
      <button
        disabled={filters.page === 1}
        onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
        className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 disabled:opacity-50"
      >
        Prev
      </button>

      <span className="text-gray-400">
        Page {filters.page} of {totalPages}
      </span>

      <button
        disabled={filters.page === totalPages}
        onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
        className="bg-gray-100 dark:bg-slate-700 px-3 py-1 rounded hover:bg-slate-600 disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
