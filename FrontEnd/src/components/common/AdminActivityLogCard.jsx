import React, { useState, useEffect, useMemo } from 'react';
import { 
  Activity, Shield, RefreshCw, Search, Calendar, User, 
  Clock, ShieldAlert, CheckCircle2, AlertTriangle, FileText, 
  Filter, Layers, ArrowUpRight, ChevronRight, Globe
} from 'lucide-react';
import api from '../../api/api';

const AdminActivityLogCard = ({ defaultCategory = 'all', title = "Log Aktivitas Admin", subtitle = "Mencatat setiap riwayat perubahan yang dilakukan oleh seluruh admin secara real-time" }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(defaultCategory);
  const [limit, setLimit] = useState(25);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(new Date());

  const fetchLogs = async () => {
    try {
      setIsRefreshing(true);
      const res = await api.get(`/hris/admin-activity-logs?category=${selectedCategory}&limit=${limit}&search=${encodeURIComponent(search)}`);
      setLogs(Array.isArray(res.data) ? res.data : []);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch admin activity logs:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, limit]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Relative time helper
  const getRelativeTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const now = new Date();
      const past = new Date(dateStr);
      const diffMs = now - past;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Baru saja';
      if (diffMins < 60) return `${diffMins} menit lalu`;
      if (diffHours < 24) return `${diffHours} jam lalu`;
      if (diffDays === 1) return 'Kemarin';
      if (diffDays < 7) return `${diffDays} hari lalu`;
      return past.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Format absolute time with WITA (UTC+8)
  const formatFullDateWita = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('id-ID', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      });
      const timePart = d.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
      return `${datePart}, ${timePart} WITA`;
    } catch {
      return dateStr;
    }
  };

  const categories = [
    { id: 'all', label: 'Semua Perubahan' },
    { id: 'calendar', label: 'Kalender & Agenda' },
    { id: 'employee', label: 'Data Karyawan' },
    { id: 'leave', label: 'Cuti & Absensi' },
    { id: 'hse', label: 'K3 & HSE' },
    { id: 'settings', label: 'Pengaturan' },
    { id: 'auth', label: 'Riwayat Login' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-5 flex flex-col gap-4">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200/80 text-red-700 flex items-center justify-center shadow-2xs">
            <Activity size={20} className="text-red-700" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] font-bold text-slate-400 hidden md:inline">
            Sinkron: {lastRefreshed.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            type="button"
            onClick={fetchLogs}
            disabled={isRefreshing}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5 text-xs font-bold"
            title="Muat ulang log aktivitas"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-red-700' : ''} />
            <span className="hidden sm:inline">Perbarui</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {categories.map(c => {
            const isActive = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                  isActive 
                    ? 'bg-red-700 text-white border-red-700 shadow-sm shadow-red-700/20' 
                    : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-red-50 hover:text-red-800 hover:border-red-200'
                }`}
              >
                {c.label}
              </button>
            );
          })}
        </div>

        {/* Search Input & Limit selector */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari aksi atau nama admin..."
              className="w-full bg-slate-50 border border-slate-200/90 text-slate-800 text-xs font-bold rounded-xl pl-8 pr-3 py-1.5 outline-none focus:border-slate-800 transition"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
            title="Jumlah baris ditampilkan"
          >
            <option value={15}>15 baris</option>
            <option value={25}>25 baris</option>
            <option value={50}>50 baris</option>
          </select>
        </div>
      </div>

      {/* Activity Logs Table / List */}
      <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/40">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <RefreshCw size={22} className="animate-spin text-red-700" />
            <p className="text-xs font-bold text-slate-400">Memuat log aktivitas admin...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
              <Activity size={18} />
            </div>
            <p className="text-xs font-bold text-slate-600">Tidak ada log aktivitas yang ditemukan.</p>
            <p className="text-[11px] text-slate-400 font-medium">
              {search ? 'Coba ganti kata kunci pencarian Anda.' : 'Aktivitas perubahan oleh admin akan dicatat secara otomatis di sini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-[440px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
            {logs.map((item, idx) => {
              const initials = (item.admin_name || 'AD')
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              const roleLabel = (item.role || '').toLowerCase();
              let roleTag = 'Admin';
              let roleBg = 'bg-blue-50 text-blue-800 border-blue-200';
              if (roleLabel.includes('super')) {
                roleTag = 'Super Admin';
                roleBg = 'bg-rose-50 text-rose-800 border-rose-200';
              } else if (roleLabel.includes('hse')) {
                roleTag = 'Admin HSE';
                roleBg = 'bg-purple-50 text-purple-800 border-purple-200';
              } else if (roleLabel.includes('hr')) {
                roleTag = 'Admin HRGA';
                roleBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              }

              return (
                <div 
                  key={item.id || idx} 
                  className="p-3.5 sm:p-4 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  {/* Left: Admin Details & Action */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Admin Avatar Circle */}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-black text-xs shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                      {initials}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {/* Admin Name */}
                        <span className="text-xs font-black text-slate-900 truncate">
                          {item.admin_name}
                        </span>

                        {/* Admin Role Tag */}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${roleBg}`}>
                          {roleTag}
                        </span>

                        {/* Category Badge */}
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md border ${item.category_color}`}>
                          {item.category_badge}
                        </span>

                        {item.is_mine && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                            Anda
                          </span>
                        )}
                      </div>

                      {/* Action Title */}
                      <h4 className="text-xs font-bold text-slate-800 leading-snug">
                        {item.action}
                      </h4>

                      {/* Action Details */}
                      {item.details && (
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5 break-words line-clamp-2">
                          {item.details}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Timestamp & Meta */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 text-right pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                      <Clock size={11} className="text-slate-400" />
                      {getRelativeTime(item.created_at)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold mt-0.5 hidden sm:inline" title={item.created_at}>
                      {formatFullDateWita(item.created_at)}
                    </span>
                    {item.ip_address && (
                      <span className="text-[9px] font-mono font-bold text-slate-400 mt-0.5 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.ip_address}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 font-medium px-1">
        <span>Menampilkan {logs.length} catatan aktivitas perubahan admin terbaru.</span>
        <span className="flex items-center gap-1 text-slate-500">
          <CheckCircle2 size={12} className="text-emerald-600" />
          Sistem pencatatan aktif & tersimpan di database Cloud
        </span>
      </div>
    </div>
  );
};

export default AdminActivityLogCard;
