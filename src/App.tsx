import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppSettingsProvider } from "@/contexts/AppSettingsContext";
import { AppLayout } from "@/components/AppLayout";
import { ExternalRedirect } from "@/components/ExternalRedirect";
import { ProtectedAdminRoute } from "@/components/ProtectedAdminRoute";
import { GlobalSecurity } from "@/components/GlobalSecurity";
import IndexRedirect from "@/pages/IndexRedirect";
import HomePage from "@/pages/HomePage";
import CourseDetailsPage from "@/pages/CourseDetailsPage";
import AuthPage from "@/pages/AuthPage";
import MyCoursesPage from "@/pages/MyCoursesPage";
import CourseContentPage from "@/pages/CourseContentPage";
import VideoPlayerPage from "@/pages/VideoPlayerPage";
import ProfilePage from "@/pages/ProfilePage";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminCoursesPage from "@/pages/admin/AdminCoursesPage";
import AdminVideosPage from "@/pages/admin/AdminVideosPage";
import AdminAddVideoPage from "@/pages/admin/AdminAddVideoPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminExamsPage from "@/pages/admin/AdminExamsPage";
import AdminAddExamPage from "@/pages/admin/AdminAddExamPage";
import ExamListPage from "@/pages/ExamListPage";
import ExamTakePage from "@/pages/ExamTakePage";
import AdminDataPage from "@/pages/admin/AdminDataPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppSettingsProvider>
            <GlobalSecurity />
            <ExternalRedirect />
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<IndexRedirect />} />
                <Route path="/home" element={<HomePage />} />
                <Route path="/course/:courseId" element={<CourseDetailsPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/my-courses" element={<MyCoursesPage />} />
                <Route path="/my-courses/:courseId" element={<CourseContentPage />} />
                <Route path="/video/:videoId" element={<VideoPlayerPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/exams" element={<ExamListPage />} />
                <Route path="/exams/:examId" element={<ExamTakePage />} />
                <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
                <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUsersPage /></ProtectedAdminRoute>} />
                <Route path="/admin/courses" element={<ProtectedAdminRoute><AdminCoursesPage /></ProtectedAdminRoute>} />
                <Route path="/admin/videos" element={<ProtectedAdminRoute><AdminVideosPage /></ProtectedAdminRoute>} />
                <Route path="/admin/videos/add" element={<ProtectedAdminRoute><AdminAddVideoPage /></ProtectedAdminRoute>} />
                <Route path="/admin/settings" element={<ProtectedAdminRoute><AdminSettingsPage /></ProtectedAdminRoute>} />
                <Route path="/admin/exams" element={<ProtectedAdminRoute><AdminExamsPage /></ProtectedAdminRoute>} />
                <Route path="/admin/exams/add" element={<ProtectedAdminRoute><AdminAddExamPage /></ProtectedAdminRoute>} />
                <Route path="/admin/courses/add" element={<ProtectedAdminRoute><AdminCoursesPage /></ProtectedAdminRoute>} />
                
                <Route path="/admin/data" element={<ProtectedAdminRoute><AdminDataPage /></ProtectedAdminRoute>} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
