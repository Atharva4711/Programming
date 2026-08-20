import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard";
import Timetable from "@/pages/Timetable";
import Attendance from "@/pages/Attendance";
import Assignments from "@/pages/Assignments";
import Quizzes from "@/pages/Quizzes";
import Notices from "@/pages/Notices";
import LostFound from "@/pages/LostFound";
import Profile from "@/pages/Profile";
import PublicAttend from "@/pages/PublicAttend";
import Layout from "@/components/Layout";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-slate-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}
function PublicOnly({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="p-10 text-slate-500">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/signup" element={<PublicOnly><Signup /></PublicOnly>} />
          <Route path="/forgot-password" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/reset-password" element={<PublicOnly><ResetPassword /></PublicOnly>} />
          {/* Public QR landing — no Layout so it renders standalone on mobile */}
          <Route path="/attend/:token" element={<PublicAttend />} />
          <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
          <Route path="/timetable" element={<Protected><Timetable /></Protected>} />
          <Route path="/attendance" element={<Protected><Attendance /></Protected>} />
          <Route path="/assignments" element={<Protected><Assignments /></Protected>} />
          <Route path="/quizzes" element={<Protected><Quizzes /></Protected>} />
          <Route path="/notices" element={<Protected><Notices /></Protected>} />
          <Route path="/lost-found" element={<Protected><LostFound /></Protected>} />
          <Route path="/profile" element={<Protected><Profile /></Protected>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
export default App;
