import { createContext, useContext, useState, useEffect } from "react";

const ExamContext = createContext();

export const ExamProvider = ({ children }) => {
  // 🔥 Load from localStorage (prevents loss on navigation/refresh)
  const [selectedQuestions, setSelectedQuestions] = useState(() => {
    const saved = localStorage.getItem("selectedQuestions");
    return saved ? JSON.parse(saved) : [];
  });

  // 🔥 Persist to localStorage
  useEffect(() => {
    localStorage.setItem(
      "selectedQuestions",
      JSON.stringify(selectedQuestions),
    );
  }, [selectedQuestions]);

  // ➕ ADD QUESTION
  const addQuestion = (q) => {
    setSelectedQuestions((prev) => {
      if (prev.some((item) => item.id === q.id)) {

        return prev;
      }

      const updated = [...prev, q];

      return updated;
    });
  };

  // ❌ REMOVE QUESTION
  const removeQuestion = (id) => {
    setSelectedQuestions((prev) => {
      const updated = prev.filter((q) => q.id !== id);

      return updated;
    });
  };

  // 🧹 CLEAR ALL
  const clearQuestions = () => {

    setSelectedQuestions([]);
    localStorage.removeItem("selectedQuestions");
  };

  return (
    <ExamContext.Provider
      value={{
        selectedQuestions,
        addQuestion,
        removeQuestion,
        clearQuestions,
      }}
    >
      {children}
    </ExamContext.Provider>
  );
};

export const useExam = () => {
  const context = useContext(ExamContext);

  if (!context) {
    throw new Error("useExam must be used within ExamProvider");
  }

  return context;
};
