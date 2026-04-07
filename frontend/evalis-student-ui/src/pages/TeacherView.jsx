import { useLocation } from "react-router-dom";

export default function TeacherView() {
  const { state } = useLocation();
  const exam = state?.exam;

  if (!exam) {
    return <div className="text-white p-8">No exam data</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <h1 className="text-2xl font-bold mb-4 text-blue-500">
        {exam.exam_name}
      </h1>

      <p className="text-gray-400 mb-2">
        {exam.subject} • {exam.course_code}
      </p>

      <p className="text-gray-500 mb-6">
        Duration: {exam.duration} mins | {exam.exam_type}
      </p>

      <div className="bg-slate-900 p-6 rounded-lg border border-slate-700">
        <h2 className="text-lg font-semibold mb-4">Questions Preview</h2>

        {exam.draft_questions?.length > 0 ? (
          exam.draft_questions.map((q, i) => (
            <div key={i} className="mb-3">
              <p>
                <span className="text-blue-400">Q{i + 1}.</span> {q.question}
              </p>
            </div>
          ))
        ) : (
          <p className="text-gray-400">No draft generated yet</p>
        )}
      </div>
    </div>
  );
}
