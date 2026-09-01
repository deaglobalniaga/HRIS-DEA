import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area
} from 'recharts';
import {
  Users, Clock, CalendarRange, Briefcase, Activity, FileText,
  UserCheck, UserX, RefreshCw,
  TrendingUp, PieChart as PieChartIcon, CalendarDays, X,
  Calendar, Bell, Gift, Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/api';

const TopBadge = ({ icon: Icon, value, title, subtitle, colorClass, bgClass, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white rounded-2xl shadow-xs border border-slate-200/80 p-3 sm:p-3.5 flex flex-col justify-between h-full hover:shadow-md hover:border-slate-300 transition-all ${
      onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] group' : ''
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2 rounded-xl ${bgClass || 'bg-slate-50'} group-hover:scale-110 transition-transform`}>
        <Icon size={18} className={colorClass} strokeWidth={2.5} />
      </div>
      <span className="text-xl sm:text-2xl font-black text-slate-800 leading-none tracking-tight group-hover:text-blue-600 transition-colors">
        {value}
      </span>
    </div>
    <div>
      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-0.5 group-hover:text-slate-800 transition-colors">
        {title}
      </h4>
      <p className="text-[10px] text-slate-400 font-medium leading-tight truncate">
        {subtitle}
      </p>
    </div>
  </div>
);

const HRGADashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    attendanceRate: 0,
    leaveRequests: 0,
    divisionStats: [],
    todayStatus: [],
    weeklyAttendance: [],
    todayArrivals: [],
    activeLeavesList: [],
    notesList: [],
    timeline: [],
    contractStats: [],
    avgWorkHours: []
  });
  const [advStats, setAdvStats] = useState({ trend: [], heatmap: [] });
  const [timeframe, setTimeframe] = useState(6);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  const fetchStats = async () => {
    try {
      setIsSyncing(true);
      const res = await api.get('/hris/dashboard-stats');
      setStats(res.data);
      const [trendRes, heatRes] = await Promise.all([
        api.get(`/hris/analytics/trend?months=${timeframe}`).catch(() => ({ data: [] })),
        api.get('/hris/analytics/heatmap').catch(() => ({ data: [] }))
      ]);
      setAdvStats({ trend: trendRes.data || [], heatmap: heatRes.data || [] });
      setLastSyncTime(new Date());
    } catch (err) { 
      console.error("Failed to fetch dashboard stats", err); 
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => { 
    fetchStats(); 
  }, [timeframe]);

  const submitNewNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      await api.post('/hris/dashboard/system-notes', { note_text: newNoteText });
      setNewNoteText("");
      setIsAddingNote(false);
      fetchStats();
      addToast('Catatan HR berhasil ditambahkan!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Gagal menambahkan catatan.', 'error');
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await api.delete(`/hris/dashboard/system-notes/${id}`);
      fetchStats();
      addToast('Catatan HR berhasil dihapus.', 'info');
    } catch (err) {
      console.error(err);
      addToast('Gagal menghapus catatan.', 'error');
    }
  };

  // Pie Colors for Komposisi Hari Ini
  const pieColors = ['#10B981', '#F59E0B', '#EF4444'];
  const absentCount = stats.todayStatus?.[2]?.value ?? 0;
  const presentCount = stats.todayStatus?.[0]?.value ?? 0;
  const leaveCount = stats.todayStatus?.[1]?.value ?? (stats.leaveRequests || 0);

  // Total Contract Count for center label
  const totalContracts = (stats.contractStats || []).reduce((acc, curr) => acc + (curr.value || 0), 0) || (stats.totalEmployees || 0);

  return (
    <div className="flex flex-col w-full h-full pb-8 font-sans space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Ringkasan HRGA</h1>
          <div className="flex items-center text-xs text-slate-500 font-bold mt-1 gap-2">
            <Clock size={13} className="text-slate-400" />
            <span>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
            <span>
              {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
            </span>
          </div>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-3">
          <button 
            onClick={fetchStats}
            disabled={isSyncing}
            className="flex items-center gap-2.5 bg-white px-3.5 py-2 rounded-2xl border border-slate-200/90 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition-all text-left cursor-pointer"
          >
            <RefreshCw size={16} className={`text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-800 leading-none">Sinkronisasi Data</span>
              <span className="text-[10px] font-medium text-slate-400 leading-none mt-1">
                Terakhir: {lastSyncTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Row 1: 6 Top KPI Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <TopBadge 
          icon={Users} 
          value={stats.totalEmployees || 0} 
          title="Total Karyawan" 
          subtitle="Lihat detail" 
          colorClass="text-blue-600" 
          bgClass="bg-blue-50"
          onClick={() => navigate('/organization?tab=employees')} 
        />
        <TopBadge 
          icon={UserCheck} 
          value={`${stats.attendanceRate || 0}%`} 
          title="Tingkat Hadir" 
          subtitle="Rata-rata hari ini" 
          colorClass="text-emerald-600" 
          bgClass="bg-emerald-50"
          onClick={() => navigate('/attendance-hub')} 
        />
        <TopBadge 
          icon={Gift} 
          value={stats.leaveRequests || 0} 
          title="Cuti Tertunda" 
          subtitle="Menunggu persetujuan" 
          colorClass="text-amber-500" 
          bgClass="bg-amber-50"
          onClick={() => navigate('/attendance-hub', { state: { tab: 'permissions' } })} 
        />
        <TopBadge 
          icon={UserX} 
          value={absentCount} 
          title="Absen" 
          subtitle="Tanpa keterangan" 
          colorClass="text-rose-500" 
          bgClass="bg-rose-50"
          onClick={() => navigate('/attendance-hub')} 
        />
        <TopBadge 
          icon={Building2} 
          value={stats.divisionStats?.length || 0} 
          title="Divisi Aktif" 
          subtitle="Struktur organisasi" 
          colorClass="text-purple-600" 
          bgClass="bg-purple-50"
          onClick={() => navigate('/organization?tab=departments')} 
        />
        <TopBadge 
          icon={FileText} 
          value={stats.totalDocuments || 0} 
          title="Dokumen Karyawan" 
          subtitle="Berkas & sertifikat karyawan" 
          colorClass="text-teal-600" 
          bgClass="bg-teal-50"
          onClick={() => navigate('/organization?tab=employees')} 
        />
      </div>

      {/* Row 2: 3 Cards (Kehadiran Hari Ini, Cuti & Izin, Catatan & Agenda Internal) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Kehadiran Hari Ini */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-64 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">
              Kehadiran Hari Ini ({stats.todayArrivals?.length || 0})
            </h3>
            <span 
              onClick={() => navigate('/attendance-hub')} 
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
            >
              Lihat semua
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 py-1">
            {stats.todayArrivals?.length > 0 ? (
              stats.todayArrivals.map((arr, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 font-black text-[11px] flex items-center justify-center shrink-0">
                      {arr.name ? arr.name.charAt(0) : 'U'}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">{arr.name}</span>
                      <span className="text-[10px] text-slate-400 font-medium">{arr.time}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    arr.status === 'CHECK IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {arr.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <Calendar size={28} className="mb-1.5 text-slate-300 stroke-[1.5]" />
                <span className="text-xs font-bold text-slate-500">Belum ada absensi hari ini</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Cuti & Izin */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-64 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">
              Cuti & Izin ({stats.activeLeavesList?.length || 0})
            </h3>
            <span 
              onClick={() => navigate('/attendance-hub', { state: { tab: 'permissions' } })} 
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
            >
              Lihat semua
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-2">
            {stats.activeLeavesList?.length > 0 ? (
              stats.activeLeavesList.map((lv, i) => (
                <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded-full border border-slate-300 text-[10px] font-black text-slate-600 flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800 truncate">{lv.name}</span>
                        <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                          {lv.status}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{lv.time}</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-slate-500 text-right shrink-0">
                    {lv.detail}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                <CalendarDays size={28} className="mb-1.5 text-slate-300 stroke-[1.5]" />
                <span className="text-xs font-bold text-slate-500">Tidak ada cuti aktif</span>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Catatan & Agenda Internal */}
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-64 flex flex-col justify-between relative">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">
              Catatan & Agenda Internal ({stats.notesList?.length || 0})
            </h3>
            <button 
              onClick={() => setIsAddingNote(!isAddingNote)} 
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline flex items-center gap-1"
            >
              {isAddingNote ? 'Batal' : '+ Tambah'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 py-1 flex flex-col gap-2">
            {isAddingNote && (
              <div className="flex flex-col gap-1.5 p-2 bg-blue-50/70 rounded-xl border border-blue-100 animate-in fade-in shrink-0">
                <input 
                  type="text" 
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Ketik catatan atau agenda internal..."
                  className="text-xs p-2 bg-white rounded-lg border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400 font-medium text-slate-800"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitNewNote()}
                />
                <div className="flex justify-end gap-1.5">
                  <button 
                    onClick={() => setIsAddingNote(false)}
                    className="text-[10px] font-bold text-slate-500 px-2 py-1 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button 
                    onClick={submitNewNote} 
                    className="text-[10px] font-black bg-blue-600 text-white px-2.5 py-1 rounded-lg hover:bg-blue-700 cursor-pointer shadow-xs"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            )}

            {stats.notesList?.length > 0 ? (
              stats.notesList.map((rem, i) => (
                <div key={rem.id || i} className="flex gap-2 items-start group p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-all">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-blue-600 ring-4 ring-blue-100"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800 font-bold leading-snug">{rem.text}</p>
                    {rem.created_at && (
                      <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                        {new Date(rem.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} • {rem.created_by || 'Admin HRGA'}
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => handleDeleteNote(rem.id)} 
                    title="Hapus Catatan"
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer p-0.5 rounded hover:bg-red-50"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            ) : (
              !isAddingNote && (
                <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
                  <Bell size={26} className="mb-1.5 text-slate-300 stroke-[1.5]" />
                  <span className="text-xs font-bold text-slate-500">Belum ada catatan internal</span>
                  <p className="text-[10px] text-slate-400 mt-0.5">Klik "+ Tambah" untuk mencatat agenda atau memo tim</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Row 3: 3 Cards (Status Divisi, Tren Kehadiran 7 Hari, Komposisi Hari Ini) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Status Divisi (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-56 flex flex-col">
          <div className="pb-2 border-b border-slate-100 shrink-0">
            <h3 className="text-xs font-black text-slate-900">Status Divisi</h3>
          </div>
          <div className="overflow-y-auto flex-1 pt-2 pr-0.5" style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}>
            <div className="grid grid-cols-2 gap-2">
              {(stats.divisionStats?.length > 0 ? stats.divisionStats : [
                { name: 'IT', count: 1 },
                { name: 'HRGA', count: 7 },
                { name: 'Direksi & Manajemen', count: 4 },
                { name: 'Pengelola KO', count: 2 },
                { name: 'Pengelola K3', count: 2 },
                { name: 'Project BIB', count: 11 },
                { name: 'Maintenance BIB', count: 15 },
                { name: 'HSE', count: 1 }
              ]).map((dept, i) => {
                const styles = [
                  'bg-emerald-50 text-emerald-800 border-emerald-100',
                  'bg-blue-50 text-blue-800 border-blue-100',
                  'bg-amber-50 text-amber-800 border-amber-100',
                  'bg-slate-50 text-slate-700 border-slate-200/60'
                ];
                const s = styles[i % styles.length];
                return (
                  <div 
                    key={i} 
                    onClick={() => navigate('/organization?tab=departments')}
                    className={`${s} rounded-xl border p-1.5 flex flex-col items-center justify-center text-center transition-transform hover:scale-[1.03] cursor-pointer`}
                  >
                    <span className="text-[11px] font-black leading-tight truncate w-full px-1">
                      {dept.name}
                    </span>
                    <span className="text-[9px] font-bold opacity-75 mt-0.5">
                      {dept.count} Karyawan
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Card 2: Tren Kehadiran 7 Hari (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-56 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">Tren Kehadiran (7 Hari)</h3>
            <span 
              onClick={() => navigate('/timesheet')} 
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
            >
              Lihat analitik
            </span>
          </div>
          <div className="flex-1 w-full pt-2">
            {stats.weeklyAttendance && stats.weeklyAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyAttendance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 'bold' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', padding: '6px 10px', fontSize: '11px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="present" stroke="#0F172A" strokeWidth={2.5} dot={{ r: 3, fill: '#0F172A' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                Tidak ada data
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Komposisi Hari Ini (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-56 flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">Komposisi Hari Ini</h3>
          </div>
          <div className="flex-1 flex items-center justify-around pt-1">
            {/* Donut Chart */}
            <div className="w-28 h-28 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stats.todayStatus?.some(s => s.value > 0) ? stats.todayStatus : [
                      { name: 'Hadir', value: presentCount, fill: '#10B981' },
                      { name: 'Cuti', value: leaveCount, fill: '#F59E0B' },
                      { name: 'Absen', value: absentCount, fill: '#EF4444' }
                    ]} 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={30} 
                    outerRadius={46} 
                    paddingAngle={3}
                    dataKey="value" 
                    stroke="none"
                  >
                    {pieColors.map((color, idx) => (
                      <Cell key={`cell-${idx}`} fill={color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px', padding: '4px 8px', fontWeight: 'bold', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend Column */}
            <div className="flex flex-col gap-2 pr-2">
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">HADIR:</span>
                <span className="text-slate-900 ml-auto font-black">{presentCount}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                <span className="text-slate-600">CUTI:</span>
                <span className="text-slate-900 ml-auto font-black">{leaveCount}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span className="text-slate-600">ABSEN:</span>
                <span className="text-slate-900 ml-auto font-black">{absentCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: 3 Cards (Timeline & Agenda Operasional, Status Kontrak, Rata-Rata Jam Kerja) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Card 1: Timeline & Agenda Operasional (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-60 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">
              Timeline & Agenda Operasional
            </h3>
            <button 
              onClick={() => navigate('/calendar')} 
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
            >
              Lihat kalender
            </button>
          </div>
          <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 py-1">
            {stats.timeline && stats.timeline.length > 0 ? stats.timeline.slice(0, 3).map((evt, i) => (
              <div key={evt.id || i} className="p-2 rounded-xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-100 transition-all flex items-start gap-2.5">
                <div className="flex flex-col items-center shrink-0 pt-0.5">
                  <span className="text-[10px] font-black text-slate-800 font-mono bg-white px-1.5 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                    {evt.time || '--:--'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`text-[8px] font-black px-1.5 py-0.2 rounded-full border ${evt.tagColor || 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                      {evt.tag || 'AGENDA'}
                    </span>
                    <h4 className="text-[11px] font-bold text-slate-900 truncate">
                      {evt.title}
                    </h4>
                  </div>
                  {evt.description && (
                    <p className="text-[9px] text-slate-500 font-medium truncate mt-0.5">
                      {evt.description}
                    </p>
                  )}
                </div>
              </div>
            )) : (
              <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-400">
                Tidak ada agenda operasional hari ini
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Status Kontrak with Center Label (3 Cols) */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-60 flex flex-col justify-between">
          <div className="pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">Status Kontrak</h3>
          </div>
          <div className="flex-1 flex items-center justify-around pt-1">
            {/* Center-labeled Donut Chart */}
            <div className="w-32 h-32 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={stats.contractStats?.length > 0 ? stats.contractStats : [
                      { name: 'PKWT', value: 47, fill: '#3B82F6' },
                      { name: 'PKWTT', value: 0, fill: '#10B981' }
                    ]} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%" 
                    innerRadius={38} 
                    outerRadius={54} 
                    paddingAngle={2}
                    stroke="none"
                  >
                    {(stats.contractStats?.length > 0 ? stats.contractStats : [
                      { fill: '#3B82F6' },
                      { fill: '#10B981' }
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill || (index === 0 ? '#3B82F6' : '#10B981')} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>

              {/* Centered Total Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-base font-black text-slate-900 leading-none">
                  {totalContracts}
                </span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mt-0.5">
                  TOTAL
                </span>
              </div>
            </div>

            {/* Legend Column */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500"></span>
                <span className="text-slate-600">PKWT:</span>
                <span className="text-slate-900 font-black">{stats.contractStats?.[0]?.value ?? totalContracts}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-black">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span>
                <span className="text-slate-600">PKWTT:</span>
                <span className="text-slate-900 font-black">{stats.contractStats?.[1]?.value ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Rata-Rata Jam Kerja 7 Hari (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-60 flex flex-col justify-between">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-900">Rata-Rata Jam Kerja (7 Hari)</h3>
            <span 
              onClick={() => navigate('/timesheet')} 
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer hover:underline"
            >
              Lihat analitik
            </span>
          </div>
          <div className="flex-1 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.avgWorkHours || []} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="hours" name="Jam Kerja" stroke="#8b5cf6" strokeWidth={2.5} fillOpacity={1} fill="url(#purpleGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 5: Analytics Lanjutan Section (Side-by-Side 2 Charts without Radar Chart) */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-red-800" />
          <h2 className="text-sm font-black text-slate-900">Analytics Lanjutan</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Chart 1: Tren Kehadiran Jangka Panjang (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-72 flex flex-col justify-between">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={14} className="text-red-800" />
                Tren Kehadiran Jangka Panjang
              </h3>
              <select 
                value={timeframe} 
                onChange={(e) => setTimeframe(Number(e.target.value))} 
                className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value={3}>3 Bulan</option>
                <option value={6}>6 Bulan</option>
                <option value={12}>1 Tahun</option>
              </select>
            </div>

            <div className="flex-1 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={advStats.trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGreenTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="hadir" name="Tepat Waktu" stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorGreenTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Heatmap Absensi Harian 30 Hari Terakhir (6 Cols) */}
          <div className="lg:col-span-6 bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 h-72 flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <CalendarDays size={14} className="text-red-800" />
                Heatmap Absensi Harian (30 Hari Terakhir)
              </h3>
              
              {/* Legend Badges */}
              <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Sesuai
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span> Terlambat
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span> Absen
                </span>
              </div>
            </div>

            <div className="flex-1 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={advStats.heatmap} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(val) => new Date(val).getDate()} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 'bold' }} 
                    dy={5} 
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 'bold' }} />
                  <Tooltip 
                    labelFormatter={(l) => new Date(l).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} 
                    contentStyle={{ borderRadius: '10px', fontSize: '10px', fontWeight: 'bold' }} 
                  />
                  <Bar dataKey="count" name="Hadir" stackId="a" fill="#10B981" radius={[0, 0, 2, 2]} />
                  <Bar dataKey="late" name="Terlambat" stackId="a" fill="#F59E0B" />
                  <Bar dataKey="absent" name="Absen" stackId="a" fill="#EF4444" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Clean Copyright Footer */}
      <div className="pt-6 pb-2 text-center text-xs font-semibold text-slate-400">
        © 2025 HRGA Management System. All rights reserved.
      </div>
    </div>
  );
};

export default HRGADashboard;
