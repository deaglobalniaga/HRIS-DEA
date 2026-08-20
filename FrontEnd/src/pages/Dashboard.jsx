import React, { Component } from 'react';
import { useAuth } from '../context/AuthContext';
import ServerDownPage from '../components/common/ServerDownPage';

import SuperAdminDashboard from './superadmin/SuperAdminDashboard';
import HSEDashboard from './hse/HSEDashboard';
import HRGADashboard from './hrga/HRGADashboard';
import EmployeeDashboard from './employee/EmployeeDashboard';

// ========================================
// BULLETPROOF ERROR BOUNDARY
// ========================================
class DashboardErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Dashboard caught render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ServerDownPage
          statusCode={500}
          errorTitle="Komponen Dashboard Mengalami Gangguan"
          errorMessage="Visualisasi data dashboard terputus saat merender grafik. Silakan lakukan diagnosa koneksi atau muat ulang."
          errorDetails={this.state.error?.toString() || 'Unknown React State Render Exception'}
          onRetry={() => {
            this.setState({ hasError: false });
            window.location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}

// ========================================
// MAIN DASHBOARD (RBAC SMART ROUTER)
// ========================================
const Dashboard = () => {
  const { user } = useAuth();
  const role = (user?.role || 'user').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role);
  const isHSEAdmin = role === 'hse_admin' || (
    (['admin', 'hr', 'hrga_admin'].includes(role) || role.includes('admin')) && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );

  // 1. Super Admin Executive & Security Command Center
  if (isSuperAdmin) {
    return (
      <DashboardErrorBoundary>
        <SuperAdminDashboard />
      </DashboardErrorBoundary>
    );
  }

  // 2. HSE Admin & K3 Safety Command Center
  if (isHSEAdmin) {
    return (
      <DashboardErrorBoundary>
        <HSEDashboard />
      </DashboardErrorBoundary>
    );
  }

  // 3. HRGA Admin Operational Center
  if (['admin', 'hr', 'hrga_admin'].includes(role) || role.includes('admin')) {
    return (
      <DashboardErrorBoundary>
        <HRGADashboard />
      </DashboardErrorBoundary>
    );
  }

  // 4. Default / Employee Mobile Dashboard
  return (
    <DashboardErrorBoundary>
      <EmployeeDashboard />
    </DashboardErrorBoundary>
  );
};

export default Dashboard;
