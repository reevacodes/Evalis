import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import ExamPage from "./pages/ExamPage";
// import ResultPage from "./pages/ResultPage";
import QuestionBank from "./pages/QuestionBank";
// import ExamBuilder from "./pages/ExamBuilder";
import Navbar from "./components/Navbar";
import CreateExam from "./pages/CreateExam";
import TopicEditor from "./pages/TopicEditor";
// import DraftPreview from "./pages/DraftPreview";
// import ExamDashboard from "./pages/ExamDashboard";
// import TeacherView from "./pages/TeacherView";
import AdminCurriculum from "./pages/AdminCurriculum";
import PreviewExam from "./pages/PreviewExam";
// import ExamPaper from "./pages/ExamPaper";
import AllExams from "./pages/AllExams";
import AdminExamDashboard from "./pages/AdminExamDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ExamEditor from "./pages/ExamEditor";
import ExamFinalized from "./pages/ExamFinalized";
import PublishExam from "./pages/PublishExam";
import Landing from "./pages/Landing";
import ResetPassword from "./pages/ResetPassword";
import StudentResults from "./pages/StudentResults";
import PracticeResultPage from "./pages/PracticeResultPage";
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";
import AdminLayout from "./components/AdminLayout";
import AdminOverview from "./pages/AdminOverview";
import AdminPracticeUpload from "./pages/AdminPracticeUpload";
import InstructorSubmissions from "./pages/InstructorSubmissions";
import TeacherLayout from "./components/TeacherLayout";
import TeacherOverview from "./pages/TeacherOverview";
import TeacherExamDashboard from "./pages/TeacherExamDashboard";

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isAdmin = location.pathname.startsWith("/admin");
  const isTeacher = location.pathname.startsWith("/teacher");

  return (
    <>
      {!isLanding && <Navbar />}
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Landing />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/student/exam/:examId" element={<ExamPage isPractice={false} />} />
        <Route path="/student/practice/:examId" element={<ExamPage isPractice={true} />} />
        <Route path="/student/practice-result/:examId" element={<PracticeResultPage />} />
        {/* <Route path="/results" element={<ResultPage />} /> */}

        {/* 🔥 Question Bank */}
        <Route
          path="/question-bank"
          element={
            <PrivateRoute>
              <QuestionBank />
            </PrivateRoute>
          }
        />

        {/* <Route path="/exam-builder" element={<ExamBuilder />} /> */}
        <Route
          path="/create-exam"
          element={
            <PrivateRoute>
              <CreateExam />
            </PrivateRoute>
          }
        />
        <Route path="/topic-editor" element={<TopicEditor />} />
        {/* <Route path="/topics" element={<DraftPreview />} /> */}
        {/* <Route path="/exams" element={<ExamDashboard />} /> */}
        {/* <Route path="/teacher-view" element={<TeacherView />} /> */}
        <Route path="/exam/:examId/preview" element={<PreviewExam />} />
        {/* <Route path="/exam/:examId/paper" element={<ExamPaper />} />  */}
        <Route path="/exams" element={<AllExams />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/results/:examId" element={<StudentResults />} />
        <Route path="/exam/:examId/edit" element={<ExamEditor />} />
        <Route path="/exam/:examId/finalized" element={<ExamFinalized />} />
        <Route path="/exam/:examId/published" element={<PublishExam />} />
        {/* 🔥 ADMIN ROUTES */}
        <Route
          path="/admin"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminOverview />
              </AdminLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/admin/exams"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminExamDashboard />
              </AdminLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/admin/exam/:examId/submissions"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <InstructorSubmissions />
              </AdminLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/admin/practice-archive"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminPracticeUpload />
              </AdminLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/admin/curriculum"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminCurriculum />
              </AdminLayout>
            </RoleRoute>
          }
        />
        {/* TEACHER ROUTES */}

        <Route
          path="/teacher"
          element={
            <RoleRoute role="teacher">
              <TeacherLayout>
                <TeacherOverview />
              </TeacherLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/teacher/exams"
          element={
            <RoleRoute role="teacher">
              <TeacherLayout>
                <TeacherExamDashboard />
              </TeacherLayout>
            </RoleRoute>
          }
        />

        <Route
          path="/teacher/exam/:examId/submissions"
          element={
            <RoleRoute role="teacher">
              <TeacherLayout>
                <InstructorSubmissions />
              </TeacherLayout>
            </RoleRoute>
          }
        />
      </Routes>
    </>
  );
}

import { ThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  );
}
export default App;
