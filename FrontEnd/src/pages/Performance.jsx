import React, { useState, useEffect } from 'react';
import { Target, Search, Plus, X, AlertCircle, CalendarDays, CheckCircle, RefreshCw, Activity, User, ShieldAlert, BadgeCheck } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Performance = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // For Roster Offset editing
    const [editingRosterUser, setEditingRosterUser] = useState(null);
    const [newCycleDay, setNewCycleDay] = useState("");

    useEffect(() => {
        fetchRosterStats();
    }, []);

    const fetchRosterStats = async () => {
        setLoading(true);
        try {
            const res = await api.get('/hris/performance/roster-stats');
            setStats(res.data);
        } catch (err) {
            console.error("Failed to fetch roster stats", err);
        } finally {
            setLoading(false);
        }
    };

    const filteredStats = stats.filter(stat =>
        stat.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.division.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stat.role.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const totalPages = Math.ceil(filteredStats.length / itemsPerPage);
    const currentStats = filteredStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleUpdateRoster = async (userId, newRoster) => {
        try {
            await api.put(`/hris/performance/roster/${userId}`, { contract_type: newRoster });
            // Update local state instead of full refetch for better UX
            setStats(prevStats => prevStats.map(s => {
                if (s.user_id === userId) {
                    // Update string representation for UI
                    const rosterStr = newRoster === '6/2' ? '6/2 (PJO/Khusus)' : '8/2 (Staff)';
                    return { ...s, roster_type: rosterStr };
                }
                return s;
            }));
            fetchRosterStats(); // Re-fetch in background to update calculations
        } catch (err) {
            console.error("Failed to update roster", err);
            alert("Gagal memperbarui roster.");
        }
    };

    const submitRosterOffset = async () => {
        if (!editingRosterUser || !newCycleDay) return;
        const targetDay = parseInt(newCycleDay) - 1; // UI uses 1-index (Hari ke-1)
        if (isNaN(targetDay)) return;
        
        const userStat = stats.find(s => s.user_id === editingRosterUser);
        if (!userStat) return;

        const diff = targetDay - userStat.current_cycle_day;
        const newOffset = userStat.offset + diff;

        try {
            await api.put(`/hris/performance/roster/${editingRosterUser}`, { initial_work_days: newOffset });
            setEditingRosterUser(null);
            fetchRosterStats();
        } catch (err) {
            alert("Gagal menyetel siklus roster.");
        }
    };

    const getStatusColor = (status) => {
        if (status === 'Cuti Roster') return 'bg-amber-100 text-amber-700 border-amber-200';
        return 'bg-green-100 text-green-700 border-green-200';
    };

    const get13_1Color = (cycleStr) => {
        if (cycleStr.includes('Sedang Cuti')) return 'text-slate-400';
        if (cycleStr.includes('Off 13/1')) return 'text-amber-600 font-black';
        return 'text-blue-600 font-bold';
    };

    return (
        <div className="w-full flex flex-col gap-6 relative">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchRosterStats} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl shadow-sm hover:bg-slate-50 transition">
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><User size={12} /> Total Staff Aktif</span>
                    <span className="text-2xl font-black text-slate-800">{stats.length}</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" /> Di Masa Kerja</span>
                    <span className="text-2xl font-black text-slate-800">{stats.filter(s => s.roster_status === 'Masa Kerja').length}</span>
                </div>
                <div className="bg-white p-4 rounded-[1.5rem] border border-slate-200 shadow-sm flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1.5"><CalendarDays size={12} className="text-amber-500" /> Cuti Roster</span>
                    <span className="text-2xl font-black text-slate-800">{stats.filter(s => s.roster_status === 'Cuti Roster').length}</span>
                </div>
                <div className="bg-slate-900 text-white p-4 rounded-[1.5rem] border border-slate-800 shadow-md flex flex-col relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10"><ShieldAlert size={80} /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 z-10">Off (13/1)</span>
                    <span className="text-2xl font-black text-white z-10">{stats.filter(s => s.cycle_13_1.includes('Off')).length} <span className="text-xs font-medium text-slate-400">orang besok</span></span>
                </div>
            </div>

            <div className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari karyawan, jabatan, divisi..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-slate-500"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                                <th className="p-3 font-black">Profil Karyawan</th>
                                <th className="p-3 font-black text-center">Tipe Roster</th>
                                <th className="p-3 font-black text-center">Kehadiran (Bulan Ini)</th>
                                <th className="p-3 font-black text-center">Status Saat Ini</th>
                                <th className="p-3 font-black text-center">Siklus Wajib Off (13/1)</th>
                                <th className="p-3 font-black text-right">Countdown Fase</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold flex flex-col items-center justify-center">
                                        <RefreshCw className="animate-spin mb-2" size={24} /> Memuat kalkulasi roster kompleks...
                                    </td>
                                </tr>
                            ) : filteredStats.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Tidak ada data roster ditemukan.</td>
                                </tr>
                            ) : (
                                currentStats.map((item) => (
                                    <tr key={item.user_id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                                                    <img src={item.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=random`} alt={item.name} />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-bold text-gray-900">{item.name}</h4>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide">{item.division} • {item.role}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            {(user?.role === 'admin' || user?.role === 'hr') ? (
                                                <select 
                                                    value={item.roster_type.includes('6/2') ? '6/2' : '8/2'}
                                                    onChange={(e) => handleUpdateRoster(item.user_id, e.target.value)}
                                                    className="bg-slate-50 border border-slate-200 text-slate-700 text-[10px] font-black rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-red-900 transition-shadow appearance-none cursor-pointer"
                                                    title="Ubah Roster Karyawan"
                                                >
                                                    <option value="8/2">8/2 (Staff)</option>
                                                    <option value="6/2">6/2 (Khusus)</option>
                                                </select>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded text-[10px] font-black text-slate-600 border border-slate-200">
                                                    <BadgeCheck size={10} /> {item.roster_type}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center justify-center gap-2 text-[10px] font-bold">
                                                <div className="flex flex-col items-center"><span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{item.month_present}</span><span className="text-slate-400 mt-0.5">Masuk</span></div>
                                                <div className="flex flex-col items-center"><span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">{item.month_leave}</span><span className="text-slate-400 mt-0.5">Izin</span></div>
                                                <div className="flex flex-col items-center"><span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{item.month_sick}</span><span className="text-slate-400 mt-0.5">Sakit</span></div>
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black border ${getStatusColor(item.roster_status)}`}>
                                                    {item.roster_status}
                                                </span>
                                                {(user?.role === 'admin' || user?.role === 'hr') && (
                                                    <span onClick={() => { setEditingRosterUser(item.user_id); setNewCycleDay((item.current_cycle_day + 1).toString()); }} className="text-[9px] font-bold text-blue-500 cursor-pointer hover:underline cursor-pointer">
                                                        (Hari ke-{item.current_cycle_day + 1}) ✎
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3 text-center">
                                            <span className={`text-[10px] ${get13_1Color(item.cycle_13_1)}`}>
                                                {item.cycle_13_1}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-black text-slate-800">{item.days_to_change} Hari Lagi</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">Menuju {item.roster_status === 'Masa Kerja' ? 'Cuti' : 'Kerja'}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!loading && filteredStats.length > itemsPerPage && (
                    <div className="p-3 border-t border-slate-100 bg-white flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredStats.length)} dari {filteredStats.length} Data
                        </span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Prev
                            </button>
                            <span className="px-3 py-1.5 text-xs font-bold text-slate-800">
                                {currentPage} / {totalPages}
                            </span>
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded hover:bg-slate-50 disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Edit Roster Cycle Modal */}
            {editingRosterUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-black text-slate-800 text-sm">Setel Ulang Siklus Karyawan</h3>
                            <button onClick={() => setEditingRosterUser(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-4">
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Saat ini berada di siklus HARI KE:</label>
                            <input 
                                type="number" 
                                min="1"
                                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-red-900/20"
                                value={newCycleDay}
                                onChange={(e) => setNewCycleDay(e.target.value)}
                                placeholder="Contoh: 1, 42, 56..."
                            />
                            <p className="text-[10px] text-slate-500 font-medium mt-2 leading-relaxed">
                                <strong>Panduan:</strong><br/>
                                Jika <strong>8/2</strong>: Hari 1-56 (Masa Kerja), Hari 57-70 (Cuti).<br/>
                                Jika <strong>6/2</strong>: Hari 1-42 (Masa Kerja), Hari 43-56 (Cuti).
                            </p>
                            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-50">
                                <button onClick={() => setEditingRosterUser(null)} className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition-colors">Batal</button>
                                <button onClick={submitRosterOffset} className="px-4 py-2 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-colors shadow-sm shadow-blue-200">Terapkan Siklus</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Performance;
