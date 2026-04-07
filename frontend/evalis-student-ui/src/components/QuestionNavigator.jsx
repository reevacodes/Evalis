export default function QuestionNavigator({
  questions,
  answers,
  current,
  setCurrent,
  marked,
}) {
  const getStatus = (index) => {
    if (marked.includes(index)) return "review";
    if (answers[index]) return "attempted";
    return "not-attempted";
  };

  return (
    <div className="navigator">
      {questions.map((q, index) => (
        <button
          key={index}
          className={`nav-btn ${getStatus(index)}`}
          onClick={() => setCurrent(index)}
        >
          {index + 1}
        </button>
      ))}
    </div>
  );
}
