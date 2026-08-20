import React, { useState, useEffect } from 'react';
import {
  Bell, LogOut, Megaphone, Camera, RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';

const EmployeeDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hris/employee-dashboard');
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch employee dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="animate-spin text-red-600" size={32} />
      </div>
    );
  }

  const profile = data?.profile || {};
  const todayStatus = data?.todayStatus || {};

  const fullName = (profile.full_name || user?.nama || user?.username || 'Karyawan') + '';
  const firstName = fullName.split(' ')[0] || 'Karyawan';
  const initials = fullName.slice(0, 2).toUpperCase() || 'US';
  const jobTitle = profile.job_title || 'Project Staff (PJO)';
  const division = profile.division || 'PT DEA GLOBAL NIAGA';

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentMonthName = monthNames[currentTime.getMonth()];
  const currentDayName = dayNames[currentTime.getDay()];
  const formattedDate = `Hari ini : ${currentDayName}, ${currentTime.getDate()} ${currentMonthName} ${currentTime.getFullYear()}`;
  const formattedTime = currentTime.toTimeString().split(' ')[0];

  return (
    <div className="flex flex-col w-full min-h-screen bg-slate-100 pb-20 font-sans select-none overflow-x-hidden">
      <div className="w-full bg-gradient-to-b from-slate-950 via-red-950 to-red-900 text-white rounded-b-[36px] sm:rounded-b-[44px] px-4 sm:px-6 pt-5 pb-10 shadow-xl shadow-red-950/30 relative overflow-hidden">
        <div className="flex items-center justify-between mb-4 relative z-10">
          <button
            onClick={() => navigate('/notifications')}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white relative hover:bg-white/20 transition-all border border-white/10"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-red-950" />
          </button>

          <button
            onClick={logout}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
            title="Keluar"
          >
            <LogOut size={18} />
          </button>
        </div>

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex-1 pr-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight flex items-center gap-1.5">
              {firstName} <span className="text-lg">👋</span>
            </h2>
            <p className="text-xs text-red-100 font-medium mt-0.5">
              {jobTitle} ({division})
            </p>
          </div>
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-white/20 backdrop-blur-md border border-white/30 shrink-0">
            <div className="w-full h-full rounded-full bg-red-800 flex items-center justify-center text-white font-black text-base shadow-inner">
              {initials}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center text-center relative z-10 py-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md font-mono">
            {formattedTime}
          </h1>
          <p className="text-xs font-semibold text-red-100 mt-1">
            {formattedDate}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto px-4 -mt-5 flex flex-col gap-3.5 relative z-20">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-start gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
            <Megaphone size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-extrabold text-slate-800">Pengumuman Operasional</h4>
            <span className="text-[10px] text-slate-400 block mb-1">{formattedDate}</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Pastikan selalu melakukan presensi wajah & menyalakan GPS sebelum batas jam kerja operasional.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div
            onClick={() => navigate('/attendance-hub')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-red-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors mb-2">
              <Camera size={22} />
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Jam Masuk</span>
            <h3 className="text-sm font-black text-slate-800 mt-1 font-mono">
              {todayStatus.checkInTime || '-- : --'}
            </h3>
          </div>

          <div
            onClick={() => navigate('/attendance-hub')}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col items-center text-center cursor-pointer hover:border-red-300 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-red-600 group-hover:bg-red-50 transition-colors mb-2">
              <Camera size={22} />
            </div>
            <span className="text-[11px] font-bold text-slate-500 uppercase">Jam Pulang</span>
            <h3 className="text-sm font-black text-slate-800 mt-1 font-mono">
              {todayStatus.checkOutTime || '-- : --'}
            </h3>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
