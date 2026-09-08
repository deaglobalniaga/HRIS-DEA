import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CalendarDays, CheckCircle, RefreshCw, User, ShieldAlert, Filter, X } from 'lucide-react';
import api from '../../api/api';

const Performance = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'onsite' | 'cuti' | 'off'
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Realtime calendar calculation for current month
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const currentDaysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const currentMonthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    const fetchRosterStats = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hris/performance/roster-stats');
            setStats(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Failed to fetch roster stats", err);
            setStats([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRosterStats();
    }, []);

    const filteredStats = (stats || []).filter(stat => {
        const term = (searchTerm || '').toLowerCase();
        const name = (stat?.name || '').toLowerCase();
        const div = (stat?.division || '').toLowerCase();
        const role = (stat?.role || '').toLowerCase();
        const nip = (stat?.nomor_pegawai || '').toLowerCase();
        const matchesSearch = !term || name.includes(term) || div.includes(term) || role.includes(term) || nip.includes(term);

        if (!matchesSearch) return false;

        const rosterStatus = (stat?.roster_status || '').toLowerCase();
        const cycle13_1 = (stat?.cycle_13_1 || '').toLowerCase();

        if (activeFilter === 'onsite') {
            return (stat?.roster_status === 'On Site' || rosterStatus === 'masa kerja') && !cycle13_1.includes('off') && !rosterStatus.includes('off');
        }
        if (activeFilter === 'cuti') {
            return rosterStatus.includes('cuti');
        }
        if (activeFilter === 'off') {
            return rosterStatus.includes('off') || cycle13_1.includes('off');
        }
        return true;
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, activeFilter]);

    const totalPages = Math.max(1, Math.ceil(filteredStats.length / itemsPerPage));
    const currentStats = filteredStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const getStatusColor = (status) => {
        if ((status || '').includes('Cuti')) return 'bg-amber-100 text-amber-700 border-amber-200';
        if ((status || '').includes('Off')) return 'bg-rose-100 text-rose-700 border-rose-200';
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    };

    const get13_1Color = (cycleStr) => {
        const str = String(cycleStr || '');
        if (str.includes('Cuti')) return 'text-amber-600 font-bold';
        if (str.includes('Off')) return 'text-rose-600 font-black';
        return 'text-blue-600 font-bold';
    };

    const totalStaff = stats.length;
    const cutiCount = stats.filter(s => (s?.roster_status || '').includes('Cuti')).length;
    const offCount = stats.filter(s => (s?.roster_status || '').includes('Off') || (s?.cycle_13_1 || '').includes('Off')).length;
    const workingCount = stats.filter(s => (s?.roster_status || '') === 'On Site' && !(s?.cycle_13_1 || '').includes('Off')).length;

    return (
        <div className="w-full flex flex-col gap-5 relative font-sans">
            {/* 1. Interactive KPI Filter Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Karyawan Card */}
                <div 
                    onClick={() => setActiveFilter('all')}
                    title="Klik untuk memfilter: Tampilkan Semua Karyawan"
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col ${
                        activeFilter === 'all'
                            ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-600/20'
                            : 'bg-white border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <User size={12} /> Total Karyawan
                        </span>
                        {activeFilter === 'all' && (
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        )}
                    </div>
                    <span className="text-2xl font-black text-slate-800">{totalStaff}</span>
                    <span className={`text-[10px] font-bold mt-0.5 transition-colors ${
                        activeFilter === 'all' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}>
                        {activeFilter === 'all' ? '● Sedang menampilkan semua' : 'Klik untuk filter semua'}
                    </span>
                </div>

                {/* On Site Card */}
                <div 
                    onClick={() => setActiveFilter(activeFilter === 'onsite' ? 'all' : 'onsite')}
                    title="Klik untuk memfilter: Hanya Karyawan On Site"
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col ${
                        activeFilter === 'onsite'
                            ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/20'
                            : 'bg-white border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CheckCircle size={12} className="text-emerald-500" /> On Site
                        </span>
                        {activeFilter === 'onsite' && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                        )}
                    </div>
                    <span className="text-2xl font-black text-slate-800">{workingCount}</span>
                    <span className={`text-[10px] font-bold mt-0.5 transition-colors ${
                        activeFilter === 'onsite' ? 'text-emerald-700' : 'text-slate-400 group-hover:text-emerald-600'
                    }`}>
                        {activeFilter === 'onsite' ? '● Filter On Site Aktif' : 'Klik untuk filter On Site'}
                    </span>
                </div>

                {/* Cuti Roster Card */}
                <div 
                    onClick={() => setActiveFilter(activeFilter === 'cuti' ? 'all' : 'cuti')}
                    title="Klik untuk memfilter: Hanya Karyawan Cuti Roster"
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col ${
                        activeFilter === 'cuti'
                            ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/20'
                            : 'bg-white border-slate-200 shadow-xs hover:border-amber-300 hover:shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <CalendarDays size={12} className="text-amber-500" /> Cuti Roster
                        </span>
                        {activeFilter === 'cuti' && (
                            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        )}
                    </div>
                    <span className="text-2xl font-black text-slate-800">{cutiCount}</span>
                    <span className={`text-[10px] font-bold mt-0.5 transition-colors ${
                        activeFilter === 'cuti' ? 'text-amber-700' : 'text-slate-400 group-hover:text-amber-600'
                    }`}>
                        {activeFilter === 'cuti' ? '● Filter Cuti Roster Aktif' : 'Klik untuk filter Cuti Roster'}
                    </span>
                </div>

                {/* Off (13/1) Card */}
                <div 
                    onClick={() => setActiveFilter(activeFilter === 'off' ? 'all' : 'off')}
                    title="Klik untuk memfilter: Hanya Karyawan Off (13/1)"
                    className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col relative overflow-hidden ${
                        activeFilter === 'off'
                            ? 'bg-slate-900 text-white border-rose-500 shadow-lg ring-2 ring-rose-500/30'
                            : 'bg-slate-900 text-white border-slate-800 shadow-xs hover:border-rose-400 hover:shadow-md'
                    }`}
                >
                    <div className="absolute right-0 top-0 opacity-10 pointer-events-none"><ShieldAlert size={80} /></div>
                    <div className="flex items-center justify-between mb-1 z-10">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Off (13/1)</span>
                        {activeFilter === 'off' && (
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        )}
                    </div>
                    <span className="text-2xl font-black text-white z-10">
                        {offCount} <span className="text-xs font-medium text-slate-400">orang hari ini</span>
                    </span>
                    <span className={`text-[10px] font-bold mt-0.5 z-10 transition-colors ${
                        activeFilter === 'off' ? 'text-rose-400' : 'text-slate-400 group-hover:text-rose-300'
                    }`}>
                        {activeFilter === 'off' ? '● Filter Off 13/1 Aktif' : 'Klik untuk filter Off (13/1)'}
                    </span>
                </div>
            </div>

            {/* 2. Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50">
                    <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                        <div className="relative w-full sm:w-80 md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Cari nama karyawan, jabatan, divisi..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-900/20"
                            />
                        </div>

                        {/* Active Filter Pill with Reset */}
                        {activeFilter !== 'all' && (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 text-red-900 border border-red-200 text-xs font-bold shadow-2xs">
                                <Filter size={12} className="text-red-700" />
                                <span>Filter: <strong>{activeFilter === 'onsite' ? 'On Site' : activeFilter === 'cuti' ? 'Cuti Roster' : 'Off 13/1'}</strong> ({filteredStats.length} Karyawan)</span>
                                <button 
                                    onClick={() => setActiveFilter('all')} 
                                    className="p-0.5 hover:bg-red-100 rounded-md text-red-700 hover:text-red-950 transition cursor-pointer ml-1"
                                    title="Reset filter"
                                >
                                    <X size={13} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="text-[11px] font-bold text-slate-500 self-end md:self-center">
                        Menampilkan {filteredStats.length} dari {totalStaff} Karyawan
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                                <th className="p-3 font-black">Profil Karyawan</th>
                                <th className="p-3 font-black text-center">Tipe Roster</th>
                                <th className="p-3 font-black text-center">Hari Operasional Site</th>
                                <th className="p-3 font-black text-center">Status Saat Ini</th>
                                <th className="p-3 font-black text-center">Siklus Wajib Off (13/1)</th>
                                <th className="p-3 font-black text-right">Countdown Fase</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                        <RefreshCw className="animate-spin mb-2 mx-auto" size={24} /> Memuat agenda roster...
                                    </td>
                                </tr>
                            ) : filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                        Tidak ada data karyawan yang sesuai dengan filter.
                                    </td>
                                </tr>
                            ) : (
                                currentStats.map((item) => {
                                    const totalDays = item.total_site_days || item.days_in_month || currentDaysInMonth;
                                    return (
                                        <tr key={item.id || item.user_id} className="hover:bg-slate-50/60 transition-colors">
                                            <td className="p-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-900 to-red-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                                        {(item.name || 'US').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-bold text-gray-900">{item.name}</h4>
                                                        <p className="text-[10px] text-slate-400">{item.role} • {item.division}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="font-bold text-[10px] bg-slate-100 px-2 py-0.5 rounded-md text-slate-700">
                                                    {item.roster_type || '8/2 (Staff)'}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className="font-mono font-black text-slate-800 bg-slate-100/90 border border-slate-200 px-2.5 py-0.5 rounded-lg text-xs inline-block">
                                                    {totalDays} Hari
                                                </span>
                                                <span className="block text-[9px] text-slate-400 font-medium mt-0.5">
                                                    {currentMonthLabel} (Realtime)
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getStatusColor(item.roster_status)}`}>
                                                    {(item.roster_status === 'Masa Kerja' || !item.roster_status) ? 'On Site' : item.roster_status}
                                                </span>
                                            </td>
                                            <td className={`p-3 text-center font-bold text-[11px] ${get13_1Color(item.cycle_13_1)}`}>
                                                {item.cycle_13_1 || 'Normal'}
                                            </td>
                                            <td className="p-3 text-right font-medium text-slate-600">
                                                {item.countdown || 'Sesuai Jadwal'}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Explanatory Calculation & Operational Notes */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-start justify-between text-[11px] text-slate-600">
                    <div className="space-y-1.5 flex-1">
                        <h4 className="font-black text-slate-800 flex items-center gap-1.5 uppercase tracking-wider text-[10px]">
                            <ShieldAlert size={14} className="text-red-700" />
                            Keterangan Penjelasan Perhitungan & Regulasi Roster Site:
                        </h4>
                        <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                            <li><strong>Hari Operasional Site:</strong> Mengikuti kalender riil bulan berjalan (misal {currentDaysInMonth} Hari penuh di {currentMonthLabel}) tanpa libur mingguan statis.</li>
                            <li><strong>Siklus Roster 8/2 (Staff):</strong> 8 minggu masa kerja on-site di project site diikuti 2 minggu (14 hari) hak cuti roster.</li>
                            <li><strong>Siklus Roster 6/2 (PJO / Khusus):</strong> 6 minggu masa tugas on-site diikuti 2 minggu cuti roster.</li>
                            <li><strong>Siklus Wajib Off 13/1:</strong> Sesuai Kepmen ESDM No. 1827 K/30/MEM/2018 dan SOP K3/Fatigue Management, personel site yang telah bekerja 13 hari berturut-turut wajib diberikan 1 hari off penuh untuk pemulihan fisik.</li>
                            <li><strong>Kalkulasi Man-Power:</strong> Status "On Site" mencerminkan kesiapan regu harian setelah dikurangi personel Cuti Roster dan Off 13/1.</li>
                        </ul>
                    </div>
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Halaman {currentPage} dari {totalPages} ({filteredStats.length} Total Karyawan Terfilter)</span>
                    <div className="flex gap-1.5">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                        >
                            Sebelumnya
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-100 transition cursor-pointer"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Performance;
