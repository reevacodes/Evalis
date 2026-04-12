import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
  headers: {
    "Content-Type": "application/json",
  },
});

// =========================
// 🔐 REQUEST INTERCEPTOR (Attach Token)
// =========================
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);


// =========================
// 🔥 DEBUG INTERCEPTOR
// =========================
API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      console.warn("Unauthorized → redirecting to login");

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      window.location.href = "/";
    }

    console.error("API ERROR:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);


// =========================
// 🧪 CODING APIs (FIXED)
// =========================

export const runCode = async ({ code, input = "", language = "python" }) => {
  const res = await API.post("/code/run", {
    code,
    input,
    language,
  });
  return res.data;
};

export const submitCode = async ({
  code,
  question_id,
  language = "python",
  user_id,
}) => {
  const res = await API.post("/code/submit", {
    code,
    question_id,
    language,
    user_id,
  });
  return res.data;
};

// =========================
// 📘 EXAM APIs
// =========================

export const fetchExam = async (examId) => {
  const res = await API.get(`/exam/${examId}`);
  return res.data;
};

export const createExam = (payload) =>
  API.post(`/exam/create`, payload);

export const updateExam = (examId, payload) =>
  API.put(`/exam/${examId}`, payload);

export const deleteExam = (examId) =>
  API.delete(`/exam/${examId}`);

export const finalizeExam = (examId) =>
  API.put(`/exam/${examId}/finalize`);

export const getAllExams = () =>
  API.get("/exam");

export const requestSchedule = (examId) =>
  API.put(`/exam/${examId}/request-schedule`);

export const requestUnlock = (examId) =>
  API.put(`/exam/${examId}/request-unlock`);

export const requestReschedule = (examId, payload) =>
  API.post(`/exam/${examId}/reschedule`, payload);

export const getRescheduleRequests = (status = "pending") =>
  API.get(`/exam/reschedule-requests/all?status=${status}`);

export const updateRescheduleRequest = (requestId, payload) =>
  API.put(`/exam/reschedule-requests/${requestId}`, payload);

// =========================
// 🎓 STUDENT FLOW
// =========================

export const submitExam = ({ examId, ...payload }) =>
  API.post(`/exam/${examId}/submit`, payload);

export const getResults = (email) =>
  API.get(`/results/${email}`);

// =========================
// 📚 QUESTION BANK
// =========================

// ✅ ALREADY FIXED
export const getQuestions = (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v !== undefined)
  );

  return API.get("/questions/questions", { params: cleanParams });
};

// 🔥 FIXED PATHS BELOW
export const addQuestion = (payload) =>
  API.post("/questions/questions", payload);

export const deleteQuestion = (id) =>
  API.delete(`/questions/questions/${id}`);

export const updateQuestion = (id, payload) =>
  API.put(`/questions/questions/${id}`, payload);

// =========================
// 🤖 AI / RAG
// =========================

export const generateQuestions = (payload) =>
  API.post("/exam/generate", payload);

export const uploadSyllabus = (examId, formData) =>
  API.post(`/upload-syllabus/${examId}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

// =========================
// 🧠 ADVANCED BUILDER
// =========================

export const selectTopics = (examId, payload) =>
  API.post(`/select-topics/${examId}`, payload);

export const generateDraft = (examId) =>
  API.post(`/generate-draft/${examId}`);

export const generateSmartQuestions = (examId) =>
  API.post(`/generate-smart-questions/${examId}`);

export const deleteExamQuestion = (examId, secIdx, qIdx) =>
  API.delete(`/exam/${examId}/question`, {
    data: {
      section_index: secIdx,
      question_index: qIdx,
    },
  });



// =========================
// 🔐 AUTH APIs
// =========================

export const signup = (data) =>
  API.post("/auth/signup", data);

export const login = (data) =>
  API.post("/auth/login", data);

export const getMe = () =>
  API.get("/auth/me");

export default API;