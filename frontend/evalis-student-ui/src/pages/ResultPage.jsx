import { useState, useEffect } from "react";
import { getResults } from "../services/api";

const ResultPage = () => {
  const [result, setResult] = useState(null);

  useEffect(() => {
    getResults("student@email.com").then((res) => setResult(res.data));
  }, []);

  if (!result) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Exam Results</h1>

      <p>Score: {result.score}</p>
      <p>Total Questions: {result.total}</p>
    </div>
  );
};

export default ResultPage;
