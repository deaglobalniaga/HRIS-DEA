import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import Toast from './components/Toast';

import MainLayout from './layouts/MainLayout';
import {
  LandingPage,
  Login,
  Signup,
  ForgotPassword,
  ResetPassword,
  Dashboard,
  Organization,
  AttendanceHub,
  Settings,
  Performance,
  Timesheet,
  Reports,
  Notifications,
  LeaveTimeline,
  PersonalCertifications,
  OrganizationTree
} from './pages';
import PushManager from './components/common/PushManager';
import UniversalErrorPage from './components/common/UniversalErrorPage';

import { useAuth } from './context/AuthContext';

function AppRoutes() {
  const { token, user } = useAuth();
  const isAuthenticated = !!token;
  const role = (user?.role || '').toLowerCase();
  const isAdmin = ['admin', 'superadmin', 'super_admin', 'hr', 'hrga_admin', 'hse_admin'].includes(role);
  const isHRAdmin = isAdmin;
  const canAccessOrg = isAdmin;

  return (
    <>
      <PushManager />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/signup" element={!isAuthenticated ? <Signup /> : <Navigate to="/dashboard" />} />
        <Route path="/forgot-password" element={!isAuthenticated ? <ForgotPassword /> : <Navigate to="/dashboard" />} />
        <Route path="/reset-password" element={!isAuthenticated ? <ResetPassword /> : <Navigate to="/dashboard" />} />
        
        {/* Universal Error & Status Pages (400+) */}
        <Route path="/error" element={<UniversalErrorPage />} />
        <Route path="/400" element={<UniversalErrorPage code={400} />} />
        <Route path="/401" element={<UniversalErrorPage code={401} />} />
        <Route path="/403" element={<UniversalErrorPage code={403} />} />
        <Route path="/404" element={<UniversalErrorPage code={404} />} />
        <Route path="/429" element={<UniversalErrorPage code={429} />} />
        <Route path="/500" element={<UniversalErrorPage code={500} />} />
        <Route path="/503" element={<UniversalErrorPage code={503} />} />
        <Route path="/server-down" element={<UniversalErrorPage code={503} />} />
        <Route path="/maintenance" element={<UniversalErrorPage code={503} customTitle="Sistem Dalam Pemeliharaan Terjadwal" customMessage="Tim IT PT DEA GLOBAL NIAGA sedang melakukan optimasi server dan peningkatan sistem keamanan." />} />
        
        {/* Fallback old routes */}
        <Route path="/inventory" element={<Navigate to="/dashboard" replace />} />

        {/* Protected HRIS Routes */}
        <Route path="/" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="attendance-hub" element={<AttendanceHub />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="calendar" element={<LeaveTimeline />} />

          {/* User & Karyawan Dedicated Modules */}
          <Route path="personal-certifications" element={<PersonalCertifications />} />
          <Route path="organization-tree" element={<OrganizationTree />} />

          {/* Operational Modules (Admin Access) */}
          <Route path="performance" element={isAdmin ? <Performance /> : <Navigate to="/dashboard" replace />} />
          <Route path="organization" element={canAccessOrg ? <Organization /> : <OrganizationTree />} />
          <Route path="timesheet" element={canAccessOrg ? <Timesheet /> : <AttendanceHub />} />
          <Route path="reports" element={canAccessOrg ? <Reports /> : <Navigate to="/dashboard" replace />} />
          <Route path="certifications" element={<Navigate to="/organization" replace />} />

          {/* Aliases & Fallbacks */}
          <Route path="leave-timeline" element={<Navigate to="/calendar" replace />} />
          <Route path="permissions" element={<Navigate to="/attendance-hub" replace />} />
          <Route path="attendance" element={<Navigate to="/attendance-hub" replace />} />
          <Route path="employees" element={<Navigate to={canAccessOrg ? "/organization" : "/organization-tree"} replace />} />
          <Route path="departments" element={<Navigate to={canAccessOrg ? "/organization" : "/organization-tree"} replace />} />
          <Route path="*" element={<UniversalErrorPage code={404} />} />
        </Route>
        
        {/* Global Fallback */}
        <Route path="*" element={<UniversalErrorPage code={404} />} />
      </Routes>
    </>
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
