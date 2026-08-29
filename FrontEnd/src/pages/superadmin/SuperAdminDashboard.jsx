import React, { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Legend,
  Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Users, MapPin, Activity,
  Server, Shield, Smartphone,
  Database, Zap, Trash2, ShieldCheck, CheckCircle2,
  Building2, AlertTriangle, RefreshCw, Check, Clock,
  Lock, KeyRound, Globe, ChevronRight, Sliders, Laptop
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/api';

const TopBadge = ({ icon: Icon, value, title, subtitle, colorClass, onClick }) => (
  <div 
    onClick={onClick}
    className={`bg-white/92 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/90 p-4 flex flex-col justify-between h-full hover:shadow-md hover:border-slate-300 transition-all ${
      onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98] group' : ''
    }`}
  >
    <div className="flex justify-between items-start mb-2">
      <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 group-hover:scale-110 transition-transform`}>
        <Icon size={20} className={colorClass} strokeWidth={2.5} />
      </div>
      <span className="text-2xl font-black text-slate-800 leading-none tracking-tight group-hover:text-red-700 transition-colors">{value}</span>
    </div>
    <div>
      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-0.5 group-hover:text-slate-800 transition-colors">{title}</h4>
      <p className="text-[10px] text-slate-400 font-medium leading-tight">{subtitle}</p>
    </div>
  </div>
);

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [serverTime, setServerTime] = useState(new Date());

  const [systemStats, setSystemStats] = useState({
    totalUsers: 47,
    rolesDistribution: [
      { name: 'Super Admin', value: 2, color: '#dc2626' },
      { name: 'HRGA Admin', value: 2, color: '#ea580c' },
      { name: 'HSE Admin', value: 2, color: '#16a34a' },
      { name: 'Operasional Site', value: 41, color: '#2563eb' }
    ],
    mfaStatus: '100% Aktif & Terlindungi',
    trustedDevicesCount: 25,
    geofenceCount: 1,
    geofenceLocations: [
      { name: 'DEA Site Angsana' }
    ],
    jwtExpiryHours: 5,
    dbLatency: '12ms',
    securityLogs: []
  });

  const [clearingLogs, setClearingLogs] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [pingingDb, setPingingDb] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setServerTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSuperAdminData = async () => {
    try {
      const [healthRes, logsRes, settingsRes] = await Promise.all([
        api.get('/settings/system-health').catch(() => null),
        api.get('/settings/audit-logs').catch(() => null),
        api.get('/settings').catch(() => null)
      ]);

      if (healthRes && healthRes.data) {
        setSystemStats(prev => ({
          ...prev,
          ...healthRes.data
        }));
      }

      if (settingsRes && settingsRes.data) {
        setSystemStats(prev => ({
          ...prev,
          jwtExpiryHours: settingsRes.data.jwt_expiry_hours || 5
        }));
      }

      if (logsRes && logsRes.data && Array.isArray(logsRes.data)) {
        const formattedLogs = logsRes.data.map(l => ({
          time: new Date(l.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WITA',
          event: l.action,
          ip: `${l.ip_address || '127.0.0.1'} • ${l.details || ''}`,
          status: l.status || 'Success'
        }));
        setSystemStats(prev => ({
          ...prev,
          securityLogs: formattedLogs.length > 0 ? formattedLogs : prev.securityLogs
        }));
      }
    } catch (e) {
      console.error('Fetch superadmin live stats error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  // Action: Live Ping Database
  const handlePingDb = async () => {
    setPingingDb(true);
    const t0 = Date.now();
    try {
      await api.get('/settings/system-health');
      const latency = Date.now() - t0;
      setSystemStats(prev => ({
        ...prev,
        dbLatency: `${latency}ms`
      }));
      addToast(`Ping Supabase Berhasil: Latensi ${latency}ms (Status: Healthy)`, 'success');
    } catch (err) {
      addToast('Gagal menghubungi database / respons lambat', 'error');
    } finally {
      setPingingDb(false);
    }
  };

  const confirmClearLogs = async () => {
    setClearingLogs(true);
    try {
      await api.delete('/settings/audit-logs');
      setSystemStats(prev => ({
        ...prev,
        securityLogs: []
      }));
      setShowClearConfirm(false);
      addToast('Seluruh rekaman audit log keamanan berhasil dihapus dari database.', 'success');
    } catch (err) {
      console.error('Clear logs error:', err);
      addToast('Gagal membersihkan log keamanan dari database.', 'error');
    } finally {
      setClearingLogs(false);
    }
  };

  const geofenceNames = (systemStats.geofenceLocations || []).map(l => l.name?.replace('Head Office ', 'HO ').replace('Project Site ', 'Site ')).join(', ') || 'DEA Site Angsana';

  return (
    <div className="relative w-full min-h-screen p-3 sm:p-4 pb-12 font-sans animate-in fade-in space-y-6">
      {/* Main Foreground Content */}
      <div className="relative z-10 space-y-6">
        
        {/* Floating Top Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/92 backdrop-blur-xl border border-slate-200/90 shadow-md shadow-slate-200/50">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="text-base sm:text-xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 drop-shadow-sm">
                {serverTime.toTimeString().split(' ')[0]}
              </span>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-100/90 text-red-700 border border-red-200 tracking-wider">
                WITA
              </span>
            </div>

            <button
              onClick={handlePingDb}
              disabled={pingingDb}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/92 hover:bg-slate-50 backdrop-blur-md border border-slate-200/90 text-slate-800 text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
              title="Kirim ping live ke Supabase PostgreSQL"
            >
              <RefreshCw size={13} className={`text-emerald-600 ${pingingDb ? 'animate-spin' : ''}`} />
              <span>Ping DB: <strong className="text-emerald-700">{systemStats.dbLatency}</strong></span>
            </button>
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/92 backdrop-blur-md border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
            <ShieldCheck size={13} className="text-red-700" /> 
            <span>Super Admin Command</span>
          </div>
        </div>

        {/* Top Region: KPI Metrics (Left) + Pusat Kontrol Cepat Super Admin (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pointer-events-auto">
          
          {/* 2 KPI Metrics Cards (4 Cols) */}
          <div className="lg:col-span-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <TopBadge
              icon={Shield}
              value={`Aktif (${systemStats.jwtExpiryHours || 5} Jam)`}
              title="Keamanan Autentikasi"
              subtitle={`Enkripsi JWT (${systemStats.jwtExpiryHours || 5} Jam TTL) & MFA`}
              colorClass="text-blue-600"
              onClick={() => navigate('/settings')}
            />
            <TopBadge
              icon={MapPin}
              value={`${systemStats.geofenceCount || 1} Lokasi`}
              title="Cakupan Geofencing"
              subtitle={geofenceNames}
              colorClass="text-red-600"
              onClick={() => navigate('/organization?tab=company')}
            />
          </div>

          {/* Quick Launch Hub (8 Cols) */}
          <div className="lg:col-span-8 bg-white/92 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Zap size={16} className="text-red-700" /> Pusat Kontrol Cepat Super Admin
                </h3>
                <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                  Akses Cepat Tata Kelola
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div
                  onClick={() => navigate('/organization?tab=company')}
                  className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-red-50 hover:border-red-200 border border-slate-200 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold mb-2">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-red-700 transition">Peta Geofence GPS</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Atur titik koordinat site</p>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/organization?tab=biometrics')}
                  className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-blue-50 hover:border-blue-200 border border-slate-200 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold mb-2">
                    <Smartphone size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-700 transition">Whitelist Device</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Otorisasi perangkat keras</p>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/organization?tab=access')}
                  className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-purple-50 hover:border-purple-200 border border-slate-200 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold mb-2">
                    <Shield size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-purple-700 transition">Hak Akses & Role</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Kelola tingkat privilese</p>
                  </div>
                </div>

                <div
                  onClick={() => navigate('/organization?tab=company')}
                  className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-emerald-50 hover:border-emerald-200 border border-slate-200 cursor-pointer transition flex flex-col justify-between group"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold mb-2">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 group-hover:text-emerald-700 transition">Profil Perusahaan</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Identitas & Legalitas NIB</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2.5 bg-red-50/80 border border-red-200 rounded-2xl text-[11px] text-red-900 flex items-center gap-2">
              <ShieldCheck size={15} className="text-red-700 shrink-0" />
              <span>Hak kelola departemen & absensi didelegasikan penuh ke Admin HRGA.</span>
            </div>
          </div>
        </div>

        {/* Analytical Region: RBAC Donut Chart (Left) + Log Aktivitas Keamanan Sistem (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pointer-events-auto">
          
          {/* Left: Role Distribution Donut Chart (5 Cols) - Original RBAC Visualisation */}
          <div className="lg:col-span-5 bg-white/92 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users size={16} className="text-red-700" /> Distribusi Hak Akses & Role (RBAC)
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Komposisi akun dan perizinan akses sistem</p>
              </div>
              <span className="text-xs font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl">
                {systemStats.totalUsers} Total
              </span>
            </div>

            <div className="w-full h-56 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={systemStats.rolesDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {systemStats.rolesDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 'bold' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-medium">Model Keamanan: Role-Based Isolation</span>
              <button
                onClick={() => navigate('/organization')}
                className="text-xs font-bold text-red-700 hover:text-red-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                Atur Hak Akses &rarr;
              </button>
            </div>
          </div>

          {/* Right: Security Audit Stream (7 Cols) */}
          <div className="lg:col-span-7 bg-white/92 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Activity size={16} className="text-red-700" /> Log Aktivitas Keamanan Sistem
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Audit jejak keamanan real-time (otomatis dibatasi 100 log terbaru)</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden sm:inline-block text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Live Stream
                  </span>
                  <span className="hidden sm:inline-block text-[9px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    Auto-Pruned (Max 100)
                  </span>
                  <button
                    onClick={() => setShowClearConfirm(!showClearConfirm)}
                    disabled={clearingLogs || systemStats.securityLogs.length === 0}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-sm border cursor-pointer ${
                      showClearConfirm
                        ? "bg-red-700 text-white border-red-700"
                        : "bg-red-50 hover:bg-red-100 text-red-700 hover:text-red-800 border-red-200"
                    }`}
                    title="Hapus seluruh log aktivitas keamanan dari database"
                  >
                    <Trash2 size={13} className={clearingLogs ? "animate-spin" : ""} />
                    <span>{clearingLogs ? "Membersihkan..." : showClearConfirm ? "Batal" : "Clear Log"}</span>
                  </button>
                </div>
              </div>

              {/* Confirmation Alert */}
              {showClearConfirm && (
                <div className="mb-3 p-3.5 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border border-red-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-red-950">
                    <AlertTriangle size={17} className="text-red-600 shrink-0 animate-pulse" />
                    <span>Hapus permanen seluruh rekaman log keamanan dari database? Tindakan ini tidak dapat dipulihkan.</span>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition border border-slate-200 shadow-sm cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmClearLogs}
                      disabled={clearingLogs}
                      className="px-3.5 py-1.5 text-xs font-black text-white bg-red-700 hover:bg-red-800 rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 size={13} />
                      <span>{clearingLogs ? "Menghapus..." : "Ya, Hapus Log"}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Scrollable Log Container */}
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                {systemStats.securityLogs.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 font-medium">
                    Belum ada rekaman audit log.
                  </div>
                ) : (
                  systemStats.securityLogs.map((log, idx) => (
                    <div key={idx} className="p-2.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-all flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-500/50" />
                        <div>
                          <span className="font-bold text-slate-800">{log.event}</span>
                          <span className="block text-[10px] text-slate-400 font-mono">{log.ip}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-bold text-slate-500 font-mono">{log.time}</span>
                        <span className="block text-[9px] font-black text-emerald-600 uppercase">{log.status}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Explanatory Calculation & Operational Security Notes Footer */}
        <div className="p-4 bg-white/92 backdrop-blur-md border border-slate-200/90 rounded-3xl flex flex-col md:flex-row gap-4 items-start justify-between text-[11px] text-slate-600 shadow-sm">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
              <ShieldCheck size={14} className="text-red-700" />
              Keterangan Penjelasan Arsitektur & Otorisasi Super Admin:
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium leading-relaxed">
              <li><strong>Distribusi Hak Akses (RBAC):</strong> Sistem mengisolasi hierarki pengguna (Super Admin: kontrol konfigurasi root, Admin HRGA: operasional/presensi, Admin HSE: lisensi K3, Karyawan: self-service).</li>
              <li><strong>Keamanan Autentikasi:</strong> Token sesi terenkripsi HMAC SHA-256 JWT dengan masa berlaku aktif 5 jam dan penegakan MFA untuk perlindungan akun administratif.</li>
              <li><strong>Audit Log Keamanan:</strong> Seluruh mutasi data penting dan upaya login dicatat secara kronologis beserta alamat IP dan dibatasi 100 entri terbaru demi performa kueri yang optimal.</li>
            </ul>
          </div>
          <div className="shrink-0 text-right self-end md:self-auto text-[10px] text-slate-400 font-mono">
            <span>Standar Keamanan: ISO/IEC 27001 & RBAC Supabase Cloud</span>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SuperAdminDashboard;
