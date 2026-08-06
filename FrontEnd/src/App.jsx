import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';

import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import Organization from './pages/Organization';
import AttendanceHub from './pages/AttendanceHub';
import Settings from './pages/Settings';
import Performance from './pages/Performance';
import Timesheet from './pages/Timesheet';
import Reports from './pages/Reports';
import LandingPage from './pages/LandingPage';
import Notifications from './pages/Notifications';
import LeaveTimeline from './pages/LeaveTimeline';

import { useAuth } from './context/AuthContext';

function AppRoutes() {
  const { token, user } = useAuth();
  const isAuthenticated = !!token;
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');

  return (
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
              <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" />} />
              <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
              <Route path="/reset-password" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />} />
              
              {/* Fallback old routes to HRIS routes to prevent 404s if accessed directly */}
              <Route path="/inventory" element={<Navigate to="/dashboard" replace />} />

              {/* Protected HRIS Routes */}
              <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="attendance-hub" element={<AttendanceHub />} />
                <Route path="settings" element={<Settings />} />
                <Route path="notifications" element={<Notifications />} />

                {/* Sidebar Menus */}
                <Route path="organization" element={isAdmin ? <Organization /> : <Navigate to="/dashboard" replace />} />
                <Route path="performance" element={isAdmin ? <Performance /> : <Navigate to="/dashboard" replace />} />
                <Route path="timesheet" element={isAdmin ? <Timesheet /> : <Navigate to="/dashboard" replace />} />
                <Route path="reports" element={isAdmin ? <Reports /> : <Navigate to="/dashboard" replace />} />
                
                {/* Standalone Calendar */}
                <Route path="calendar" element={<LeaveTimeline />} />

                {/* Fallback old routes */}
                <Route path="permissions" element={<Navigate to="/attendance-hub" replace />} />
                <Route path="attendance" element={<Navigate to="/attendance-hub" replace />} />
                <Route path="employees" element={<Navigate to="/organization" replace />} />
                <Route path="departments" element={<Navigate to="/organization" replace />} />
                <Route path="leave-management" element={<Navigate to="/attendance-hub" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <Router>
              <Toast />
              <AppRoutes />
            </Router>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
