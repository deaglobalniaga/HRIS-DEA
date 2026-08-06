import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, PieChart, Pie, Cell, Legend,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, AreaChart, Area, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import {
  Users, Clock, CalendarRange, Briefcase, Activity, FileText,
  UserCheck, UserX, AlertCircle, CheckCircle, Search,
  LogIn, LogOut as LogOutIcon, Calendar, MapPin, ChevronRight, ArrowRight, RefreshCw,
  TrendingUp, PieChart as PieChartIcon, CalendarDays, X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';

// ========================================
// SHARED COMPONENTS
// ========================================
// eslint-disable-next-line no-unused-vars
const TopBadge = ({ icon: Icon, value, title, subtitle, colorClass }) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 flex flex-col justify-between h-full hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-2">
      <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10`}>
        <Icon size={18} className={colorClass} strokeWidth={2.5} />
      </div>
      <span className="text-xl font-black text-slate-800 leading-none">{value}</span>
    </div>
    <div>
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{title}</h4>
      <p className="text-[9px] text-slate-400 leading-tight">{subtitle}</p>
    </div>
  </div>
);

const ListItem = ({ avatar, name, role, time, status, detail, hideBorder }) => (
  <div className={`flex items-center justify-between py-2 ${!hideBorder && 'border-b border-slate-50'} hover:bg-slate-50/50 transition-colors`}>
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
        <img src={avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`} alt={name} className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1.5">
          {name}
          {role && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 py-0.5 rounded font-black uppercase tracking-wider">{role}</span>}
        </span>
        <span className="text-[10px] text-slate-500 leading-tight mt-0.5">{time}</span>
      </div>
    </div>
    <div className="flex flex-col items-end">
      <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-0.5 ${status === 'Present' || status === 'Approved' || status === 'Hadir' ? 'bg-green-100 text-green-700' :
        status === 'Pending' ? 'bg-amber-100 text-amber-700' :
          status === 'Late' || status === 'Terlambat' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
        }`}>
        {status}
      </span>
      <span className="text-[9px] text-slate-400 font-medium">{detail}</span>
    </div>
  </div>
);

// ========================================
// ADMIN HR DASHBOARD
// ========================================
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0, attendanceRate: 0, leaveRequests: 0,
    divisionStats: [], todayStatus: [], weeklyAttendance: [], notesList: []
  });
  const [advStats, setAdvStats] = useState({ trend: [], heatmap: [], division: [] });
  const [timeframe, setTimeframe] = useState(6);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");


  const fetchStats = async () => {
    try {
      const res = await api.get('/hris/dashboard-stats');
      setStats(res.data);
      const [trendRes, heatRes, divRes] = await Promise.all([
        api.get(`/hris/analytics/trend?months=${timeframe}`),
        api.get('/hris/analytics/heatmap'),
        api.get('/hris/analytics/division-stats')
      ]);
      setAdvStats({ trend: trendRes.data, heatmap: heatRes.data, division: divRes.data });
    } catch (err) { console.error("Failed to fetch dashboard stats", err); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchStats(); }, [timeframe]);

  const submitNewNote = async () => {
    if (!newNoteText.trim()) return;
    try {
      await api.post('/hris/dashboard/system-notes', { note_text: newNoteText });
      setNewNoteText("");
      setIsAddingNote(false);
      fetchStats();
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan catatan.");
    }
  };

  const handleDeleteNote = async (id) => {
    if (!window.confirm("Hapus catatan ini?")) return;
    try {
      await api.delete(`/hris/dashboard/system-notes/${id}`);
      fetchStats();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus catatan.");
    }
  };

  const pieColors = ['#10B981', '#F59E0B', '#EF4444'];

  return (
    <div className="flex flex-col w-full h-full pb-2 bg-slate-50">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 px-1">
        <div>
          <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">Ringkasan HR</h1>
          <div className="flex items-center text-xs text-slate-500 font-bold mt-1 gap-2">
            <Clock size={12} />
            <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full mx-1 hidden sm:block"></span>
            <span className="hidden sm:block">{new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-3">
          <button onClick={() => {
            const btn = document.getElementById('sync-btn-icon');
            if (btn) btn.classList.add('animate-spin');
            fetchStats().finally(() => {
              if (btn) btn.classList.remove('animate-spin');
            });
          }} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors text-left">
            <RefreshCw id="sync-btn-icon" size={16} className="text-blue-500" />
            <div className="flex flex-col">
              <span className="text-xs font-black text-slate-700 leading-none">Sinkronisasi Data</span>
              <span className="text-[10px] font-medium text-slate-500 leading-none">Refresh Dashboard</span>
            </div>
          </button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 lg:gap-4">

        {/* KPIs — responsive grid */}
        <div className="col-span-full grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 lg:gap-3">
          <TopBadge icon={Users} value={stats.totalEmployees || 0} title="Total Karyawan" subtitle="Terdaftar di HRIS" colorClass="text-blue-600" />
          <TopBadge icon={UserCheck} value={`${stats.attendanceRate || 0}%`} title="Tingkat Hadir" subtitle="Rata-rata hari ini" colorClass="text-green-600" />
          <TopBadge icon={CalendarRange} value={stats.leaveRequests || 0} title="Cuti Tertunda" subtitle="Menunggu HR" colorClass="text-amber-500" />
          <TopBadge icon={UserX} value={stats.todayStatus?.[2]?.value || 0} title="Absen" subtitle="Tanpa keterangan" colorClass="text-red-500" />
          <TopBadge icon={Briefcase} value={stats.divisionStats?.length || 0} title="Divisi Aktif" subtitle="Struktur Organisasi" colorClass="text-indigo-500" />
          <TopBadge icon={Activity} value={stats.pendingTasks?.length || 0} title="Tugas HR" subtitle="Tugas tertunda" colorClass="text-purple-500" />
          <TopBadge icon={FileText} value="0" title="Dokumen" subtitle="Pembaruan kebijakan" colorClass="text-teal-500" />
          <TopBadge icon={AlertCircle} value={stats.notesList?.length || 0} title="Catatan" subtitle="Isu sistem" colorClass="text-orange-500" />
        </div>

        {/* Row 2 */}
        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-64 flex flex-col">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800">Kehadiran Hari Ini ({stats.todayArrivals?.length || 0})</h3>
            <span onClick={() => navigate('/attendance-hub')} className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline">Lihat semua &rarr;</span>
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {stats.todayArrivals?.length > 0 ? (
              stats.todayArrivals.map((arr, i) => (
                <ListItem key={i} name={arr.name} role={arr.role} time={arr.time} status={arr.status} detail={arr.detail} hideBorder={i === stats.todayArrivals.length - 1} />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-400">Belum ada absensi hari ini</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-64 flex flex-col">
            <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black text-slate-800">Cuti & Izin ({stats.activeLeavesList?.length || 0})</h3>
              <span onClick={() => navigate('/attendance-hub', { state: { tab: 'permissions' } })} className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline">Lihat semua &rarr;</span>
            </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {stats.activeLeavesList?.length > 0 ? (
              stats.activeLeavesList.map((lv, i) => (
                <ListItem key={i} name={lv.name} role={lv.role} time={lv.time} status={lv.status} detail={lv.detail} hideBorder={i === stats.activeLeavesList.length - 1} />
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-400">Tidak ada cuti aktif</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-64 flex flex-col relative">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800">Pengingat HR</h3>
            {(user?.role === 'admin' || user?.role === 'hr') && (
              <button onClick={() => setIsAddingNote(!isAddingNote)} className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors">{isAddingNote ? 'Batal' : '+ Tambah'}</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2.5">
            {isAddingNote && (
              <div className="flex flex-col gap-1.5 mb-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                <input 
                  type="text" 
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="Ketik catatan di sini..."
                  className="text-xs p-1.5 rounded border border-blue-200 outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && submitNewNote()}
                />
                <div className="flex justify-end">
                  <button onClick={submitNewNote} className="text-[9px] font-bold bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700">Simpan</button>
                </div>
              </div>
            )}
            {stats.notesList?.length > 0 ? (
              stats.notesList.map((rem, i) => (
                <div key={i} className="flex gap-2.5 items-start group">
                  <div className={`w-2.5 h-2.5 rounded-full border-2 mt-0.5 shrink-0 border-blue-400`}></div>
                  <div className="flex flex-col flex-1 leading-tight relative">
                    <span className="text-xs text-slate-700 font-medium pr-4">{rem.text}</span>
                    {(user?.role === 'admin' || user?.role === 'hr') && (
                      <button onClick={() => handleDeleteNote(rem.id)} className="absolute right-0 top-0 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-400">Tidak ada pengingat</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-64 flex flex-col relative">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800">Jalan Pintas</h3>
          </div>
          <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
            <button onClick={() => navigate('/organization')} className="w-full text-left bg-slate-50 hover:bg-blue-50 border border-slate-100 text-slate-700 hover:text-blue-700 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-2">
              <Users size={14} className="text-blue-500" /> Data Organisasi
            </button>
            <button onClick={() => navigate('/attendance-hub')} className="w-full text-left bg-slate-50 hover:bg-green-50 border border-slate-100 text-slate-700 hover:text-green-700 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-2">
              <UserCheck size={14} className="text-green-500" /> Kehadiran Hub
            </button>
            <button onClick={() => navigate('/calendar')} className="w-full text-left bg-slate-50 hover:bg-amber-50 border border-slate-100 text-slate-700 hover:text-amber-700 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-2">
              <CalendarRange size={14} className="text-amber-500" /> Agenda Perusahaan
            </button>
            <button onClick={() => navigate('/leave-timeline')} className="w-full text-left bg-slate-50 hover:bg-purple-50 border border-slate-100 text-slate-700 hover:text-purple-700 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors flex items-center gap-2">
              <CalendarDays size={14} className="text-purple-500" /> Timeline Cuti
            </button>
          </div>
        </div>

        {/* Row 3 */}
        <div className="md:col-span-2 lg:col-span-3 xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-52 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-black text-slate-800">Status Divisi</h3>
            <span onClick={() => navigate('/organization')} className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline">Lihat detail &rarr;</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
            {stats.divisionStats?.slice(0, 8).map((dept, i) => {
              const colors = ['bg-green-50 text-green-700', 'bg-blue-50 text-blue-700', 'bg-amber-50 text-amber-700', 'bg-slate-50 text-slate-600'];
              const c = colors[i % colors.length];
              return (
                <div key={i} className={`${c} rounded border border-black/5 flex flex-col items-center justify-center p-1 text-center transition-transform hover:scale-105 cursor-pointer`}>
                  <span className="text-[11px] font-black leading-tight line-clamp-1 w-full px-1">{dept.name}</span>
                  <span className="text-[9px] font-bold opacity-80 mt-0.5">{dept.count} Karyawan</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-3 xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-52 flex flex-col">
          <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800">Tren Kehadiran (7 Hari)</h3>
            <span onClick={() => navigate('/timesheet')} className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline">Lihat analitik &rarr;</span>
          </div>
          <div className="flex-1 w-full pt-2">
            {stats.weeklyAttendance && stats.weeklyAttendance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.weeklyAttendance} margin={{ top: 5, right: 5, left: -25, bottom: -5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 'bold' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 'bold' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E2E8F0', padding: '4px 8px', fontSize: '10px', fontWeight: 'bold' }} />
                  <Line type="monotone" dataKey="present" stroke="#0F172A" strokeWidth={3} dot={{ r: 3, fill: '#0F172A' }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">Tidak ada data</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-2 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-52 flex flex-col">
          <div className="flex justify-between items-center mb-1 pb-1 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800">Komposisi Hari Ini</h3>
          </div>
          <div className="flex-1 flex items-center justify-center relative pt-2">
            {stats.todayStatus && stats.todayStatus.some(s => s.value > 0) ? (
              <>
                <div className="w-24 h-24">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={stats.todayStatus} cx="50%" cy="50%" innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                        {stats.todayStatus.map((entry, index) => <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', padding: '4px 8px', fontWeight: 'bold', border: 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="text-[10px] font-bold text-slate-400">Tidak ada data</div>
            )}
          </div>
          <div className="flex flex-col gap-1 mt-1">
            {stats.todayStatus?.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-[9px] font-bold px-2 py-0.5 rounded bg-slate-50">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: pieColors[i] }}></span>
                  <span className="text-slate-600 uppercase tracking-wider">{item.name === 'Present' ? 'Hadir' : item.name === 'On Leave' ? 'Cuti' : item.name === 'Absent' ? 'Absen' : item.name}</span>
                </div>
                <span className="text-slate-800">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 4: 3 Visualization Containers */}
        <div className="col-span-full lg:col-span-12 xl:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Container 1: Timeline & Agenda */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-56 flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
              <h3 className="text-xs font-black text-slate-800">Timeline & Agenda</h3>
              <span onClick={() => navigate('/calendar')} className="text-[9px] font-bold text-blue-600 cursor-pointer hover:underline">Lihat &rarr;</span>
            </div>
            <div className="relative pl-3 border-l-2 border-slate-100 flex-1 flex flex-col gap-3 pt-1 overflow-y-auto pr-1 custom-scrollbar">
              {stats.timeline && stats.timeline.length > 0 ? stats.timeline.slice(0, 4).map((evt, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[17px] top-1 w-2.5 h-2.5 rounded-full ring-4 ring-white ${evt.color || 'bg-blue-500'}`}></div>
                  <div className="flex items-start gap-3">
                    <span className="text-[9px] font-black text-slate-500 w-12 pt-0.5">{evt.time}</span>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">{evt.text}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="flex items-center justify-center h-full text-[10px] font-bold text-slate-400">Tidak ada agenda mendatang</div>
              )}
            </div>
          </div>

          {/* Container 2: Status Kontrak */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-56 flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-black text-slate-800">Status Kontrak</h3>
            </div>
            <div className="flex-1 w-full flex items-center justify-center -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.contractStats || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2}>
                    {(stats.contractStats || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                  <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Container 3: Rata-rata Jam Kerja */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-56 flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-xs font-black text-slate-800">Rata-Rata Jam Kerja (7 Hari)</h3>
            </div>
            <div className="flex-1 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.avgWorkHours || []} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                  <Area type="monotone" dataKey="hours" name="Jam Kerja" stroke="#7c3aed" strokeWidth={2} fillOpacity={1} fill="url(#colorHours)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>



        {/* ADVANCED ANALYTICS SECTION */}
        <div className="col-span-full mt-4 flex justify-start items-center mb-2">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2"><Activity size={20} className="text-red-900" /> Analytics Lanjutan</h2>
        </div>

        <div className="col-span-full lg:col-span-4 xl:col-span-5 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-72 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1"><TrendingUp size={14} className="text-red-900" /> Tren Kehadiran Jangka Panjang</h3>
            <select value={timeframe} onChange={(e) => setTimeframe(Number(e.target.value))} className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-red-900/20">
              <option value={3}>3 Bulan</option>
              <option value={6}>6 Bulan</option>
              <option value={12}>1 Tahun</option>
            </select>
          </div>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={advStats.trend} margin={{ top: 5, right: 10, left: -25, bottom: -5 }}>
                <defs>
                  <linearGradient id="colorHadir" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTelat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                <Area type="monotone" dataKey="hadir" name="Tepat Waktu" stroke="#16a34a" strokeWidth={2} fillOpacity={1} fill="url(#colorHadir)" />
                <Area type="monotone" dataKey="terlambat" name="Terlambat" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorTelat)" />
                <Area type="monotone" dataKey="sakit" name="Sakit/Izin" stroke="#3b82f6" strokeWidth={2} fillOpacity={0.1} fill="#3b82f6" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md:col-span-2 lg:col-span-2 xl:col-span-3 bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-72 flex flex-col">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1 mb-2"><PieChartIcon size={14} className="text-red-900" /> Disiplin Divisi (Bulan Ini)</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="65%" data={advStats.division}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 9, fontWeight: 'bold' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar name="Kehadiran" dataKey="Kehadiran" stroke="#16a34a" fill="#16a34a" fillOpacity={0.4} />
                <Radar name="Kedisiplinan" dataKey="Kedisiplinan" stroke="#7f1d1d" fill="#7f1d1d" fillOpacity={0.4} />
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-full bg-white rounded-xl shadow-sm border border-slate-100 p-3 h-64 flex flex-col mb-4">
          <h3 className="text-xs font-black text-slate-800 flex items-center gap-1 mb-2"><CalendarDays size={14} className="text-red-900" /> Heatmap Absensi Harian (30 Hari Terakhir)</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={advStats.heatmap} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickFormatter={(val) => new Date(val).getDate()} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} dy={5} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                <Tooltip labelFormatter={(l) => new Date(l).toLocaleDateString('id-ID')} contentStyle={{ borderRadius: '8px', fontSize: '10px', fontWeight: 'bold' }} />
                <Bar dataKey="count" name="Hadir" stackId="a" fill="#16a34a" radius={[0, 0, 2, 2]} />
                <Bar dataKey="late" name="Terlambat" stackId="a" fill="#f59e0b" />
                <Bar dataKey="absent" name="Tidak Hadir" stackId="a" fill="#ef4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

// ========================================
// EMPLOYEE PERSONAL DASHBOARD
// ========================================
const EmployeeDashboard = () => {
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-5">
          {/* Logo + Prisma Orbit Ring */}
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Prisma Orbiting Ring */}
            <svg className="absolute inset-0 w-full h-full animate-spin" style={{ animationDuration: '2.5s' }} viewBox="0 0 120 120">
              <defs>
                <linearGradient id="prismaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#7f1d1d" stopOpacity="1" />
                  <stop offset="25%" stopColor="#dc2626" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="75%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#7f1d1d" stopOpacity="1" />
                </linearGradient>
              </defs>
              <circle cx="60" cy="60" r="54" fill="none" stroke="url(#prismaGrad)" strokeWidth="4" strokeLinecap="round" strokeDasharray="100 240" />
            </svg>
            {/* Subtle glow pulse behind logo */}
            <div className="absolute w-16 h-16 bg-red-900/10 rounded-full animate-pulse blur-xl"></div>
            {/* Company Logo */}
            <img src="/dea.png" alt="Logo" className="w-14 h-14 object-contain relative z-10 drop-shadow-lg" onError={(e) => { e.target.style.display = 'none' }} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-sm font-black text-slate-700 tracking-tight">Memuat Dashboard</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HR Information System</span>
          </div>
        </div>
      </div>
    );
  }

  const profile = data?.profile || {};
  const todayStatus = data?.todayStatus || {};
  const weeklyHistory = data?.weeklyHistory || [];
  const leaveSummary = data?.leaveSummary || {};

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  return (
    <div className="flex flex-col w-full h-full pb-4 bg-slate-50">
      {/* Greeting Header */}
      <div className="mb-4 px-1">
        <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight">{greeting()}, {profile.full_name?.split(' ')[0] || 'Karyawan'}! </h1>
        <div className="flex items-center text-xs text-slate-500 font-bold mt-1 gap-2">
          <Clock size={12} />
          <span>{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">

        {/* Card 1: Profile & Status Hari Ini */}
        <div className="md:col-span-2 lg:col-span-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col">
          <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden shrink-0 border-2 border-red-900/20">
              {profile.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl font-black text-red-900 bg-red-50">
                  {profile.full_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-black text-slate-900 truncate">{profile.full_name || 'Karyawan'}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{profile.job_title || profile.role || 'Karyawan'}</span>
              <span className="text-[10px] font-bold text-slate-400">{profile.division || '-'}</span>
            </div>
          </div>

          {/* Status Absensi Hari Ini */}
          <div className={`rounded-xl p-4 flex items-center gap-4 ${todayStatus.hasCheckedIn ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${todayStatus.hasCheckedIn ? 'bg-green-500' : 'bg-amber-500'}`}>
              {todayStatus.hasCheckedIn ? <CheckCircle size={24} className="text-white" /> : <LogIn size={24} className="text-white" />}
            </div>
            <div className="flex flex-col min-w-0">
              <span className={`text-sm font-black ${todayStatus.hasCheckedIn ? 'text-green-800' : 'text-amber-800'}`}>
                {todayStatus.hasCheckedIn ? 'Sudah Check In ✓' : 'Belum Check In'}
              </span>
              {todayStatus.hasCheckedIn && todayStatus.checkInTime && (
                <span className="text-xs font-bold text-green-600">
                  Masuk: {new Date(todayStatus.checkInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                  {todayStatus.hasCheckedOut && todayStatus.checkOutTime && (
                    <> • Pulang: {new Date(todayStatus.checkOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</>
                  )}
                </span>
              )}
              {!todayStatus.hasCheckedIn && (
                <span className="text-xs font-bold text-amber-600">Anda belum melakukan presensi hari ini</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 2: Ringkasan Cuti & Kehadiran Bulan Ini */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 lg:p-5 flex flex-col">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-3">Ringkasan Bulan Ini</h3>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-green-50 rounded-xl p-3 text-center border border-green-100">
              <span className="text-2xl font-black text-green-700">{data?.monthlyPresent || 0}</span>
              <p className="text-[9px] font-bold text-green-600 uppercase tracking-wider mt-1">Hari Hadir</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-100">
              <span className="text-2xl font-black text-slate-700">{data?.totalWorkDaysThisMonth || 0}</span>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Hari Kerja</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center bg-blue-50 rounded-lg px-3 py-2 border border-blue-100">
              <div className="flex items-center gap-2">
                <CalendarRange size={14} className="text-blue-600" />
                <span className="text-[11px] font-bold text-blue-800">Cuti Terpakai</span>
              </div>
              <span className="text-sm font-black text-blue-700">{leaveSummary.taken || 0}</span>
            </div>
            <div className="flex justify-between items-center bg-amber-50 rounded-lg px-3 py-2 border border-amber-100">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-amber-600" />
                <span className="text-[11px] font-bold text-amber-800">Menunggu Persetujuan</span>
              </div>
              <span className="text-sm font-black text-amber-700">{(leaveSummary.pending || 0) + (leaveSummary.pendingPermissions || 0)}</span>
            </div>
            <div className="flex justify-between items-center bg-purple-50 rounded-lg px-3 py-2 border border-purple-100">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-purple-600" />
                <span className="text-[11px] font-bold text-purple-800">Izin Terpakai</span>
              </div>
              <span className="text-sm font-black text-purple-700">{leaveSummary.permissionsTaken || 0}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Aksi Cepat */}
        <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 p-4 lg:p-5 text-white flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-900 opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
          <h3 className="text-xs font-black text-white uppercase tracking-wider mb-4 z-10">Aksi Cepat</h3>
          <div className="flex flex-col gap-2.5 z-10 flex-1">
            {!todayStatus.hasCheckedIn ? (
              <button onClick={() => navigate('/attendance-hub')} className="bg-green-600 hover:bg-green-500 text-left px-4 py-3 rounded-xl text-xs font-black transition-colors flex items-center gap-3 shadow-lg shadow-green-900/20">
                <LogIn size={18} /> Check In Sekarang
                <ArrowRight size={14} className="ml-auto" />
              </button>
            ) : !todayStatus.hasCheckedOut ? (
              <button onClick={() => navigate('/attendance-hub')} className="bg-amber-600 hover:bg-amber-500 text-left px-4 py-3 rounded-xl text-xs font-black transition-colors flex items-center gap-3 shadow-lg shadow-amber-900/20">
                <LogOutIcon size={18} /> Check Out Sekarang
                <ArrowRight size={14} className="ml-auto" />
              </button>
            ) : (
              <div className="bg-slate-800 text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-3 border border-slate-700/50">
                <CheckCircle size={18} className="text-green-400" /> Presensi hari ini selesai ✓
              </div>
            )}

            <button onClick={() => navigate('/attendance-hub')} className="bg-slate-800 hover:bg-slate-700 text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-3 border border-slate-700/50">
              <Calendar size={16} className="text-purple-400" /> Lihat Kalender Tim
              <ChevronRight size={14} className="ml-auto opacity-50" />
            </button>
            <button onClick={() => navigate('/settings')} className="bg-slate-800 hover:bg-slate-700 text-left px-4 py-3 rounded-xl text-xs font-bold transition-colors flex items-center gap-3 border border-slate-700/50">
              <MapPin size={16} className="text-teal-400" /> Pengaturan Profil
              <ChevronRight size={14} className="ml-auto opacity-50" />
            </button>
          </div>
        </div>

        {/* Card 4: Riwayat Kehadiran 7 Hari */}
        <div className="md:col-span-2 lg:col-span-3 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 lg:p-5">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Riwayat Kehadiran 7 Hari Terakhir</h3>
            <span onClick={() => navigate('/calendar')} className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline">Lihat Kalender &rarr;</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Hari</th>
                  <th className="text-left py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Tanggal</th>
                  <th className="text-center py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Masuk</th>
                  <th className="text-center py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Foto Masuk</th>
                  <th className="text-center py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Pulang</th>
                  <th className="text-center py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Foto Pulang</th>
                  <th className="text-center py-2 px-2 font-black text-slate-400 uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {weeklyHistory.map((row, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-2 font-bold text-slate-700">{row.day}</td>
                    <td className="py-2.5 px-2 font-medium text-slate-500">{row.date}</td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-700">{row.checkIn || '-'}</td>
                    <td className="py-2.5 px-2 text-center">
                      {row.checkInPhoto ? (
                        <img src={row.checkInPhoto} alt="Check In" className="w-8 h-8 rounded-lg object-cover mx-auto border border-slate-200" />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-slate-700">{row.checkOut || '-'}</td>
                    <td className="py-2.5 px-2 text-center">
                      {row.checkOutPhoto ? (
                        <img src={row.checkOutPhoto} alt="Check Out" className="w-8 h-8 rounded-lg object-cover mx-auto border border-slate-200" />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${row.status === 'Hadir' ? 'bg-green-100 text-green-700' :
                        row.status === 'Tidak Hadir' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================================
// MAIN DASHBOARD — ROLE SWITCHER
// ========================================
const Dashboard = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');

  return isAdmin ? <AdminDashboard /> : <EmployeeDashboard />;
};

export default Dashboard;
