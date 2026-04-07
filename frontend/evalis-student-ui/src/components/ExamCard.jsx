export default function ExamCard({ exam }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-xl hover:shadow-lg transition">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">{exam.exam_name}</h2>

        <span className="text-xs px-3 py-1 rounded-full bg-blue-500/20 text-blue-400">
          {exam.status}
        </span>
      </div>

      {/* Details */}
      <div className="mt-3 text-sm text-gray-400 space-y-1">
        <p>
          {exam.subject_code} • Sem {exam.semester}
        </p>
        <p>Duration: {exam.duration_minutes} min</p>
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-between items-center">
        <span className="text-xs text-gray-500">{exam.teacher_name}</span>

        <button className="text-sm text-blue-400 hover:underline">View</button>
      </div>
    </div>
  );
}
