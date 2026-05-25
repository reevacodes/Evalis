import axios from "axios";

// Automatically use the live backend URL when deployed, and localhost when developing
const API_URL = import.meta.env.VITE_API_URL || "https://evalis-backend-vvsj.onrender.com";

const API = axios.create({
  baseURL: API_URL,
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

      // Prevent redirect loop if already on landing
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
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

export const runSampleCode = async ({ code, question_id, language = "python" }) => {
  const res = await API.post("/code/run-sample", {
    code,
    question_id,
    language,
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

export const requestSchedule = (examId, payload) =>
  API.put(`/exam/${examId}/request-schedule`, payload);

export const requestUnlock = (examId) =>
  API.put(`/exam/${examId}/request-unlock`);

export const requestReschedule = (examId, payload) =>
  API.post(`/exam/${examId}/reschedule`, payload);

export const getRescheduleRequests = (status = "all") =>
  API.get(`/exam/reschedule-requests/all?status=${status}`);

export const updateRescheduleRequest = (requestId, payload) =>
  API.put(`/exam/reschedule-requests/${requestId}`, payload);

export const deleteRescheduleRequest = (requestId) =>
  API.delete(`/exam/reschedule-requests/${requestId}`);

export const applyGraceMarks = (examId, payload) =>
  API.put(`/exam/${examId}/grace-mark`, payload);

// =========================
// 🎓 STUDENT FLOW
// =========================

export const submitExam = ({ examId, ...payload }) =>
  API.post(`/exam/${examId}/submit`, payload);

export const startExam = (examId) =>
  API.post(`/exam/${examId}/start`);

export const updateLiveStatus = (examId, warnings) =>
  API.put(`/exam/${examId}/live-status`, { warnings });

export const fetchUserExamResults = (examId) =>
  API.get(`/exam/submissions/${examId}/me`);

export const publishExamResults = (examId) =>
  API.put(`/exam/${examId}/publish-results`);

export const fetchExamSubmissions = (examId) =>
  API.get(`/exam/${examId}/submissions`);

export const fetchSubmissionDetail = (submissionId) =>
  API.get(`/exam/submissions/detail/${submissionId}`);

// =========================
// 📚 PAST PAPERS & PRACTICE
// =========================

export const getPastPapers = () =>
  API.get("/past-papers");

export const fetchPastPaper = async (paperId, selectedSet = "A") => {
  const res = await API.get(`/past-papers/${paperId}?selected_set=${selectedSet}`);
  return res.data;
};

export const submitPractice = (paperId, payload) =>
  API.post(`/past-papers/${paperId}/practice-attempts`, payload);

export const getPracticeHistory = async () => {
  const res = await API.get("/past-papers/practice/history");
  return res.data;
};



// =========================
// 🌐 CURRICULUM
// =========================

export const fetchCurriculum = (semester) =>
  API.get(`/curriculum/${semester}`);

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

export const addBulkQuestions = (payload) =>
  API.post("/questions/questions/bulk", payload);

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

export const addQuestionsToExam = (examId, payload) =>
  API.post(`/exam/${examId}/add-questions`, payload);

// =========================
// 🔐 AUTH APIs
// =========================

export const sendSignupOtp = (data) =>
  API.post("/auth/send-signup-otp", data);

export const signup = (data) =>
  API.post("/auth/signup", data);

export const login = (data) =>
  API.post("/auth/login", data);

export const uploadUsersCSV = (formData) => API.post("/auth/upload-csv", formData);

export const getActivityLogs = () => API.get("/admin/activity-logs");
export const getLiveSessions = () => API.get("/admin/live-sessions");
export const inviteTeacher = (data) => API.post("/admin/create-teacher", data);
export const getAllUsers = () => API.get("/admin/users");
export const deleteUser = (userId) => API.delete(`/admin/users/${userId}`);

export const getMe = () =>
  API.get("/auth/me");

export const forgotPassword = (data) =>
  API.post("/auth/forgot-password", data);

export const resetPasswordToken = (data) =>
  API.post("/auth/reset-password", data);

// =========================
// 📚 PAST PAPER APIs
// =========================

export const uploadPastPaperJSON = async (payload) => {
  const res = await API.post("/past-papers/upload/json", payload);
  return res.data;
};

export const archiveExamToPastPapers = async (examId, year) => {
  const res = await API.post(`/past-papers/archive-exam/${examId}`, { year });
  return res.data;
};

export default API;
