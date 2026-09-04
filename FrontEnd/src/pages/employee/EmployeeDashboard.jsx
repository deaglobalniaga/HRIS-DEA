import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, LogOut, Megaphone, Camera, RefreshCw, User, Shield, Briefcase,
  Building2, Award, ChevronRight, X, Calendar as CalendarIcon, MapPin, Hash, CheckCircle2,
  ChevronLeft, Clock, CalendarDays
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
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Calendar State
  const [calDate, setCalDate] = useState(new Date());

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
  const weeklyHistory = data?.weeklyHistory || [];
  const leaveSummary = data?.leaveSummary || { available: 12, used: 0, pending: 0 };

  const fullName = (profile.full_name || user?.nama || user?.username || 'Karyawan') + '';
  const firstName = fullName.split(' ')[0] || 'Karyawan';
  const initials = fullName.slice(0, 2).toUpperCase() || 'US';
  const jobTitle = profile.job_title || user?.jabatan || 'Project Staff (PJO)';
  const division = profile.division || user?.department || 'PT DEA GLOBAL NIAGA';
  const nomorPegawai = profile.nomor_pegawai || user?.nomor_pegawai || 'DGN-EMP-001';
  const penempatan = profile.penempatan || user?.penempatan || 'Site BIB / Kantor Pusat';
  const statusKaryawan = profile.status_karyawan || user?.status_karyawan || 'Karyawan Aktif';

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const currentMonthName = monthNames[currentTime.getMonth()];
  const currentDayName = dayNames[currentTime.getDay()];
  const formattedDate = `Hari ini : ${currentDayName}, ${currentTime.getDate()} ${currentMonthName} ${currentTime.getFullYear()}`;
  const formattedTime = currentTime.toTimeString().split(' ')[0];

  // Calendar Helper Functions
  const calYear = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const firstDayIndex = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCalDate(new Date(calYear, calMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCalDate(new Date(calYear, calMonth + 1, 1));
  };

  return (
    <div className="flex flex-col w-full bg-slate-100 font-sans select-none overflow-x-hidden">
      {/* Header Banner with Parallelogram Geometry */}
      <div className="w-full bg-[#120202] text-white rounded-b-[36px] sm:rounded-b-[44px] px-4 sm:px-6 pt-5 pb-10 shadow-xl shadow-red-950/40 relative overflow-hidden">
        {/* Vertical Parallelogram Polygon Container (Red angled split matching design) */}
        <div
          className="absolute top-0 right-0 h-full w-[46%] sm:w-[40%] pointer-events-none z-0"
          style={{
            clipPath: 'polygon(32% 0%, 100% 0%, 100% 100%, 0% 100%)',
            background: 'linear-gradient(145deg, #b91c1c 0%, #880808 60%, #5b0505 100%)',
            opacity: 0.95
          }}
        />

        {/* Top Actions */}
        <div className="flex items-center justify-between mb-4 relative z-10">
          <button
            onClick={() => navigate('/notifications')}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white relative hover:bg-white/20 transition-all border border-white/10"
            title="Notifikasi"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-red-950" />
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={logout}
              className="w-10 h-10 rounded-full bg-white/15 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/25 transition-all border border-white/20 active:scale-95 cursor-pointer shadow-sm"
              title="Keluar dari Akun"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* User Info & Parallelogram Avatar Badge */}
        <div className="flex items-center justify-between mb-5 relative z-10">
          <div className="flex-1 pr-2">
            <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight flex items-center gap-1.5 text-white">
              {firstName} <span className="text-lg">👋</span>
            </h2>
            <p className="text-xs text-red-200 font-medium mt-0.5">
              {jobTitle} ({division})
            </p>
          </div>
          
          {/* Avatar intersecting the Parallelogram Shape */}
          <button
            type="button"
            onClick={() => setShowProfileModal(true)}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-1 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 shrink-0 transition-transform active:scale-95 shadow-xl group cursor-pointer"
            title="Klik untuk membuka kartu profil"
          >
            <div className="w-full h-full rounded-full bg-red-900 group-hover:bg-red-800 flex items-center justify-center text-white font-black text-base shadow-inner transition">
              {initials}
            </div>
          </button>
        </div>

        {/* Live Clock Display */}
        <div className="flex flex-col items-center justify-center text-center relative z-10 py-1">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md font-mono">
            {formattedTime}
          </h1>
          <p className="text-xs font-semibold text-red-100 mt-1">
            {formattedDate}
          </p>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="w-full max-w-md mx-auto px-4 -mt-5 flex flex-col gap-3.5 relative z-20">
        {/* Operational Banner */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 flex items-start gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl shrink-0 mt-0.5">
            <Megaphone size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-extrabold text-slate-800">Pengumuman Operasional</h4>
            <span className="text-[10px] text-slate-400 block mb-1">{formattedDate}</span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Pastikan selalu melakukan presensi biometrik wajah & GPS sebelum batas jam kerja operasional.
            </p>
          </div>
        </div>

        {/* Quick Clock Status Cards */}
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

        {/* Interactive Home Calendar Widget */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between mb-3.5 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-700 flex items-center justify-center">
                <CalendarDays size={16} />
              </div>
              <h3 className="text-xs font-black text-slate-800">
                {monthNames[calMonth]} {calYear}
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition border border-slate-200/70"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={handleNextMonth}
                className="w-7 h-7 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 flex items-center justify-center transition border border-slate-200/70"
                title="Bulan Berikutnya"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          {/* Calendar Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
              <span
                key={d}
                className={`text-[10px] font-bold py-1 ${i === 0 ? 'text-red-500' : 'text-slate-400'}`}
              >
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Days Matrix */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {/* Empty slots before first day */}
            {Array.from({ length: firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-8 rounded-lg" />
            ))}

            {/* Days of current month */}
            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const dayNum = idx + 1;
              const isToday =
                dayNum === currentTime.getDate() &&
                calMonth === currentTime.getMonth() &&
                calYear === currentTime.getFullYear();

              const dayOfWeek = new Date(calYear, calMonth, dayNum).getDay();
              const isSunday = dayOfWeek === 0;

              return (
                <div
                  key={`day-${dayNum}`}
                  className={`h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all relative ${
                    isToday
                      ? 'bg-red-700 text-white shadow-md shadow-red-700/30'
                      : isSunday
                      ? 'text-red-400 hover:bg-red-50'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {dayNum}
                </div>
              );
            })}
          </div>

          {/* Mini Calendar Footer Notes */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-700" /> Hari Ini
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Roster 8/2
            </span>
            <span className="text-slate-400">
              Sisa Cuti: <b className="text-slate-700">{leaveSummary.available} Hari</b>
            </span>
          </div>
        </div>
      </div>

      {/* Modern Profile Modal Pop-up Card for Mobile & Desktop (Portal above all layouts) */}
      {showProfileModal && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pb-20 sm:pb-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm sm:max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[82vh] -translate-y-4 sm:translate-y-0 border border-slate-200/80"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Banner */}
            <div className="relative bg-gradient-to-r from-slate-900 via-red-950 to-red-900 p-5 sm:p-6 text-white overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 p-1 border border-white/20 shrink-0 backdrop-blur-md">
                  <div className="w-full h-full rounded-xl bg-red-800 flex items-center justify-center text-white font-black text-xl shadow-inner">
                    {initials}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-400/30">
                    <CheckCircle2 size={11} /> {statusKaryawan}
                  </span>
                  <h3 className="text-base font-black text-white truncate mt-1 leading-tight">{fullName}</h3>
                  <p className="text-xs text-red-200 truncate">{jobTitle}</p>
                </div>
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">ID Karyawan</span>
                  <p className="font-mono font-bold text-slate-800 truncate">{nomorPegawai}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Departemen</span>
                  <p className="font-bold text-slate-800 truncate">{division}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 block mb-0.5">Penempatan Operasional</span>
                  <p className="font-bold text-slate-800 truncate">{penempatan}</p>
                </div>
              </div>

              {/* Quick Action Navigation Buttons */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setShowProfileModal(false); navigate('/settings'); }}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-red-50/50 border border-slate-200/80 hover:border-red-200 flex items-center justify-between text-xs font-bold text-slate-800 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center">
                      <Shield size={16} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900">Pengaturan & Keamanan</p>
                      <p className="text-[10px] text-slate-500 font-normal">MFA, Kata Sandi, Biometrik Wajah</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-red-700 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => { setShowProfileModal(false); navigate('/personal-certifications'); }}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-red-50/50 border border-slate-200/80 hover:border-red-200 flex items-center justify-between text-xs font-bold text-slate-800 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Award size={16} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900">Sertifikasi & Lisensi K3</p>
                      <p className="text-[10px] text-slate-500 font-normal">SIO, sertifikat keahlian, masa berlaku</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-red-700 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => { setShowProfileModal(false); navigate('/organization-tree'); }}
                  className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-red-50/50 border border-slate-200/80 hover:border-red-200 flex items-center justify-between text-xs font-bold text-slate-800 transition group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                      <Building2 size={16} />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-slate-900">Struktur Organisasi</p>
                      <p className="text-[10px] text-slate-500 font-normal">Hierarki jabatan PT DEA GLOBAL NIAGA</p>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 group-hover:text-red-700 transition" />
                </button>

                <button
                  type="button"
                  onClick={() => { setShowProfileModal(false); logout(); }}
                  className="w-full p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 flex items-center justify-center gap-2 text-xs font-black text-rose-700 transition mt-3 cursor-pointer"
                >
                  <LogOut size={16} /> Keluar dari Akun (Logout)
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default EmployeeDashboard;
