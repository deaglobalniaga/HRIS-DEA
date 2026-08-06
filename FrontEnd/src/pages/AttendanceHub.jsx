import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Clock, CalendarRange } from 'lucide-react';
import Attendance from './Attendance';
import Permissions from './Permissions';

const AttendanceHub = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.tab || 'attendance');

  useEffect(() => {
    if (location.state?.tab) {
      // eslint-disable-next-line
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  return (
    <div className="flex flex-col w-full h-full bg-slate-50">
      <div className="mb-6 px-1 flex flex-col xl:flex-row justify-start items-start xl:items-center gap-4">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 bg-white rounded-xl shadow-sm border border-slate-200 p-1 w-full xl:w-auto">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Clock size={16} /> Absensi
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`flex-1 xl:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'permissions' ? 'bg-red-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <CalendarRange size={16} /> Cuti & Izin
          </button>
        </div>
      </div>

      <div className="flex-1 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className={activeTab === 'attendance' ? 'block' : 'hidden'}>
          <Attendance />
        </div>
        <div className={activeTab === 'permissions' ? 'block' : 'hidden'}>
          <Permissions />
        </div>
      </div>
    </div>
  );
};

export default AttendanceHub;
