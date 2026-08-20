import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, CalendarRange, ListFilter } from 'lucide-react';
import Attendance from '../employee/Attendance';
import Permissions from './Permissions';
import DailyAttendanceMonitorTab from '../../components/common/DailyAttendanceMonitorTab';
import { useAuth } from '../../context/AuthContext';

const AttendanceHub = () => {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  
  // Access control
  const isAdmin = ['admin', 'superadmin', 'super_admin', 'hrga_admin', 'hr', 'hse_admin'].includes(role);
  const canViewTabs = isAdmin;

  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'attendance');

  useEffect(() => {
    if (location.state?.tab && canViewTabs) {
      setActiveTab(location.state.tab);
    }
  }, [location.state, canViewTabs]);

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
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'attendance' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Clock size={16} /> Presensi Wajah
          </button>

          {/* Tab 2: Daftar & Monitor Kehadiran (For Admin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                activeTab === 'monitor' ? 'bg-gradient-to-r from-red-700 to-red-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ListFilter size={16} /> Daftar & Monitor Kehadiran
            </button>
          )}

          {/* Tab 3: Pencatatan Cuti & Roster (For Admin) */}
          {isAdmin && (
            <button
              onClick={() => setActiveTab('permissions')}
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
        {activeTab === 'monitor' && isAdmin && <DailyAttendanceMonitorTab />}
        {activeTab === 'permissions' && isAdmin && <Permissions />}
      </div>
    </div>
  );
};

export default AttendanceHub;
