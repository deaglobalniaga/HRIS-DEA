import React, { useState, useEffect } from 'react';
import { Target, Search, Plus, X, AlertCircle, CalendarDays, CheckCircle, RefreshCw, Activity, User, ShieldAlert, BadgeCheck, Filter } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Performance = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // For Roster Offset editing
    const [editingRosterUser, setEditingRosterUser] = useState(null);
    const [newCycleDay, setNewCycleDay] = useState("");

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
        return name.includes(term) || div.includes(term) || role.includes(term);
    });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.max(1, Math.ceil(filteredStats.length / itemsPerPage));
    const currentStats = filteredStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleUpdateRoster = async (userId, newRoster) => {
        try {
            await api.put(`/hris/performance/roster/${userId}`, { contract_type: newRoster });
            setStats(prevStats => (prevStats || []).map(s => {
                if (s.user_id === userId) {
                    const rosterStr = newRoster === '6/2' ? '6/2 (PJO/Khusus)' : '8/2 (Staff)';
                    return { ...s, roster_type: rosterStr };
                }
                return s;
            }));
            addToast(`Tipe roster berhasil diubah ke ${newRoster}`, 'success');
            fetchRosterStats();
        } catch (err) {
            console.error("Failed to update roster", err);
            addToast("Gagal memperbarui roster.", "error");
        }
    };

    const submitRosterOffset = async () => {
        if (!editingRosterUser || !newCycleDay) return;
        const targetDay = parseInt(newCycleDay) - 1;
        if (isNaN(targetDay)) return;
        
        const userStat = (stats || []).find(s => s.user_id === editingRosterUser);
        if (!userStat) return;

        const diff = targetDay - (userStat.current_cycle_day || 1);
        const newOffset = (userStat.offset || 0) + diff;

        try {
            await api.put(`/hris/performance/roster/${editingRosterUser}`, { initial_work_days: newOffset });
            addToast("Siklus roster berhasil disetel.", "success");
            setEditingRosterUser(null);
            fetchRosterStats();
        } catch (err) {
            addToast("Gagal menyetel siklus roster.", "error");
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Cuti Roster') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const get13_1Color = (cycleStr) => {
        const str = String(cycleStr || '');
        if (str.includes('Sedang Cuti')) return 'text-slate-400';
        if (str.includes('Off')) return 'text-amber-600 font-black';
        return 'text-blue-600 font-bold';
    };

    const totalStaff = stats.length;
    const workingCount = stats.filter(s => (s?.roster_status || '') === 'Masa Kerja').length;
    const cutiCount = stats.filter(s => (s?.roster_status || '') === 'Cuti Roster').length;
    const offCount = stats.filter(s => (s?.cycle_13_1 || '').includes('Off')).length;

    return (
        <div className="w-full flex flex-col gap-6 relative font-sans">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Activity className="text-red-700" size={24} /> Agenda Kerja & Manajemen Roster Site
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                        Siklus kerja rotasi 8/2 dan 6/2 serta monitoring wajib off (13/1) personel operasional PT DEA GLOBAL NIAGA.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={fetchRosterStats} 
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-xl shadow-sm hover:bg-slate-50 transition"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md hover:scale-[1.01] transition-all">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><User size={12} /> Total Personel</span>
                    <span className="text-2xl font-black text-slate-800">{totalStaff}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md hover:scale-[1.01] transition-all">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> Di Masa Kerja</span>
                    <span className="text-2xl font-black text-slate-800">{workingCount}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col hover:shadow-md hover:scale-[1.01] transition-all">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CalendarDays size={12} className="text-amber-500" /> Cuti Roster</span>
                    <span className="text-2xl font-black text-slate-800">{cutiCount}</span>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-md flex flex-col relative overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all">
                    <div className="absolute right-0 top-0 opacity-10"><ShieldAlert size={80} /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 z-10">Off (13/1)</span>
                    <span className="text-2xl font-black text-white z-10">{offCount} <span className="text-xs font-medium text-slate-400">orang hari ini</span></span>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                            <input
                                type="text"
                                placeholder="Cari nama karyawan, jabatan, divisi..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-900/20"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                                <th className="p-3 font-black">Profil Karyawan</th>
                                <th className="p-3 font-black text-center">Tipe Roster</th>
                                <th className="p-3 font-black text-center">Kehadiran Bulan Ini</th>
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
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Tidak ada data roster ditemukan.</td>
                                </tr>
                            ) : (
                                currentStats.map((item) => (
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
                                        <td className="p-3 text-center font-mono font-bold text-slate-700">
                                            {item.work_days_this_month || 18} Hari
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${getStatusColor(item.roster_status)}`}>
                                                {item.roster_status || 'Masa Kerja'}
                                            </span>
                                        </td>
                                        <td className={`p-3 text-center font-bold text-[11px] ${get13_1Color(item.cycle_13_1)}`}>
                                            {item.cycle_13_1 || 'Normal'}
                                        </td>
                                        <td className="p-3 text-right font-medium text-slate-600">
                                            {item.countdown || 'Sesuai Jadwal'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Halaman {currentPage} dari {totalPages}</span>
                    <div className="flex gap-1.5">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-100 transition"
                        >
                            Sebelumnya
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-100 transition"
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

