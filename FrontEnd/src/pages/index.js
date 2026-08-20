// ==========================================
// HRIS ROLE-BASED MODULAR ROUTE & PAGE EXPORTS
// PT DEA GLOBAL NIAGA
// ==========================================

// --- 1. Authentication Modules ---
export { default as LandingPage } from './auth/LandingPage';
export { default as Login } from './auth/Login';
export { default as Signup } from './auth/Signup';
export { default as ForgotPassword } from './auth/ForgotPassword';
export { default as ResetPassword } from './auth/ResetPassword';

// --- 2. Super Admin Governance Modules ---
export { default as SuperAdminDashboard } from './superadmin/SuperAdminDashboard';
export { default as CompanySettings } from './superadmin/CompanySettings';
export { default as AccessRights } from './superadmin/AccessRights';

// --- 3. HRGA Operational Modules ---
export { default as HRGADashboard } from './hrga/HRGADashboard';
export { default as Employees } from './hrga/Employees';
export { default as Departments } from './hrga/Departments';
export { default as Organization } from './hrga/Organization';

// --- 4. HSE & K3 Safety Compliance Modules ---
export { default as HSEDashboard } from './hse/HSEDashboard';
export { default as Certifications } from './hse/Certifications';

// --- 5. Employee Self-Service (ESS) Modules ---
export { default as EmployeeDashboard } from './employee/EmployeeDashboard';
export { default as Attendance } from './employee/Attendance';
export { default as PersonalCertifications } from './employee/PersonalCertifications';
export { default as OrganizationTree } from './employee/OrganizationTree';

// --- 6. Shared & Cross-Role Modules ---
export { default as Dashboard } from './Dashboard';
export { default as AttendanceHub } from './shared/AttendanceHub';
export { default as LeaveTimeline } from './shared/LeaveTimeline';
export { default as Notifications } from './shared/Notifications';
export { default as Performance } from './shared/Performance';
export { default as Permissions } from './shared/Permissions';
export { default as Reports } from './shared/Reports';
export { default as Settings } from './shared/Settings';
export { default as Timesheet } from './shared/Timesheet';
