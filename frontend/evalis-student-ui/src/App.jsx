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
import SetPassword from "./pages/SetPassword";
import StudentResults from "./pages/StudentResults";
import Profile from "./pages/Profile";
import PracticeResultPage from "./pages/PracticeResultPage";
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";
import AdminLayout from "./components/AdminLayout";
import AdminOverview from "./pages/AdminOverview";
import AdminUsers from "./pages/AdminUsers";
import InstructorSubmissions from "./pages/InstructorSubmissions";
import InstructorStudentResult from "./pages/InstructorStudentResult";
import TeacherLayout from "./components/TeacherLayout";
import TeacherOverview from "./pages/TeacherOverview";
import TeacherExamDashboard from "./pages/TeacherExamDashboard";
import AlertModal from "./components/AlertModal";

function AppContent() {
  const location = useLocation();
  const isLanding = location.pathname === "/";
  const isExamPage = location.pathname.includes("/student/exam/") || location.pathname.includes("/student/practice/");
  const isAdmin = location.pathname.startsWith("/admin");
  const isTeacher = location.pathname.startsWith("/teacher");

  return (
    <>
      {!isLanding && !isExamPage && <Navbar />}
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<Landing />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/set-password" element={<SetPassword />} />

        <Route path="/student/exam/:examId" element={<RoleRoute role="student"><ExamPage isPractice={false} /></RoleRoute>} />
        <Route path="/student/practice/:examId" element={<RoleRoute role="student"><ExamPage isPractice={true} /></RoleRoute>} />
        <Route path="/student/practice-result/:examId" element={<RoleRoute role="student"><PracticeResultPage /></RoleRoute>} />
        {/* <Route path="/results" element={<ResultPage />} /> */}

        {/* SHARED LOGGED-IN ROUTES */}
        <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />

        {/* STUDENT ONLY */}
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
        <Route 
          path="/student" 
          element={
            <RoleRoute role="student">
              <StudentDashboard />
            </RoleRoute>
          } 
        />
        <Route 
          path="/student/results/:examId" 
          element={
            <RoleRoute role="student">
              <StudentResults />
            </RoleRoute>
          } 
        />
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
          path="/admin/users"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <AdminUsers />
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
          path="/admin/exam/:examId/submissions/:submissionId"
          element={
            <RoleRoute role="admin">
              <AdminLayout>
                <InstructorStudentResult />
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

        <Route
          path="/teacher/exam/:examId/submissions/:submissionId"
          element={
            <RoleRoute role="teacher">
              <TeacherLayout>
                <InstructorStudentResult />
              </TeacherLayout>
            </RoleRoute>
          }
        />
      </Routes>
      <AlertModal />
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
