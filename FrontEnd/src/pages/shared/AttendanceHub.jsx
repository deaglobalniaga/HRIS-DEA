import React from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Clock, CalendarRange, ListFilter } from 'lucide-react';
import Attendance from '../employee/Attendance';
import Permissions from './Permissions';
import DailyAttendanceMonitorTab from '../../components/common/DailyAttendanceMonitorTab';
import { useAuth } from '../../context/AuthContext';

const AttendanceHub = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin'].includes(role) || username === 'arya_admin';
  const isHSE = role === 'hse_admin' || dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') || username === 'hse_admin';
  const isHRAdmin = (['admin', 'hrga_admin', 'hr'].includes(role) || dept.includes('hr') || dept.includes('hrga') || username === 'admin') && !isHSE;
  
  // Access control
  const isAdmin = isSuperAdmin || isHRAdmin || isHSE;
  const canViewTabs = isAdmin;

  // Pencatatan Cuti & Roster is strictly for HRGA and Superadmin. HSE cannot manage leaves.
  const canManageLeave = isSuperAdmin || isHRAdmin;

  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  const queryTab = searchParams.get('tab') || location.state?.tab;
  const activeTab = (queryTab === 'permissions' && !canManageLeave)
    ? 'attendance'
    : (queryTab || 'attendance');

  const handleTabChange = (newTab) => {
    setSearchParams({ tab: newTab });
  };

  // For Superadmin or regular Employee/User, render pure Attendance Scanner directly
  if (!canViewTabs) {
    return <Attendance />;
  }

  return (
    <div className="w-full flex flex-col gap-6 font-sans">
      <div className="flex flex-col xl:flex-row justify-start items-start xl:items-center gap-4">
        {/* Tab Navigation for HRGA & HSE Admin */}
        <div className="flex flex-wrap gap-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-1.5 w-full xl:w-auto">
          {/* Tab 1: Presensi Wajah (First Tab) */}
          <button
            onClick={() => handleTabChange('attendance')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'attendance' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={16} /> Presensi Wajah
          </button>

          {/* Tab 2: Daftar & Monitor Kehadiran (For Admin & HSE) */}
          {isAdmin && (
            <button
              onClick={() => handleTabChange('monitor')}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'monitor' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ListFilter size={16} /> Daftar & Monitor Kehadiran
            </button>
          )}

          {/* Tab 3: Pencatatan Cuti & Roster (Strictly for HRGA & Superadmin - HSE cannot manage leaves) */}
          {canManageLeave && (
            <button
              onClick={() => handleTabChange('permissions')}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'permissions' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <CalendarRange size={16} /> Pencatatan Cuti & Roster
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 w-full animate-in fade-in duration-300">
        {activeTab === 'attendance' && <Attendance />}
        {activeTab === 'monitor' && isAdmin && (
          <DailyAttendanceMonitorTab initialSubTab={searchParams.get('subtab') || location.state?.subtab || 'sudah'} />
        )}
        {activeTab === 'permissions' && canManageLeave && <Permissions />}
      </div>
    </div>
  );
};

export default AttendanceHub;
