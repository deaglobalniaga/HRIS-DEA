import React, { useState, useEffect } from 'react';
import {
  Users, Clock, CheckCircle2, AlertCircle, Calendar,
  Search, RefreshCw, Filter, ShieldCheck, ArrowUpRight
} from 'lucide-react';
import api from '../../api/api';

const DailyAttendanceMonitorTab = ({ initialSubTab = 'sudah' }) => {
  const [dailyStatus, setDailyStatus] = useState({
    date: new Date().toISOString().split('T')[0],
    summary: { total_karyawan: 0, sudah_absen: 0, belum_absen: 0, tidak_hadir: 0 },
    sudah_absen: [],
    belum_absen: [],
    tidak_hadir: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialSubTab || 'sudah'); // 'sudah' | 'belum' | 'tidak_hadir'

  useEffect(() => {
    if (initialSubTab) {
      setActiveTab(initialSubTab);
    }
  }, [initialSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  const fetchDailyStatus = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/attendance/daily-status');
      if (res.data) {
        setDailyStatus(res.data);
      }
    } catch (err) {
      console.error('Fetch daily status error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyStatus();
  }, []);

  // Filter items based on search and department
  const filterList = (list) => {
    return (list || []).filter(item => {
      const term = searchTerm.toLowerCase();
      const matchSearch =
        (item.nama && item.nama.toLowerCase().includes(term)) ||
        (item.nip && item.nip.toLowerCase().includes(term)) ||
        (item.jabatan && item.jabatan.toLowerCase().includes(term));

      const matchDept = selectedDept === 'ALL' || (item.departemen || '').toLowerCase().includes(selectedDept.toLowerCase());
      return matchSearch && matchDept;
    });
  };

  const currentList =
    activeTab === 'sudah'
      ? filterList(dailyStatus.sudah_absen)
      : activeTab === 'belum'
      ? filterList(dailyStatus.belum_absen)
      : filterList(dailyStatus.tidak_hadir);

  return (
    <div className="w-full flex flex-col gap-4 font-sans animate-in fade-in">
      {/* KPI Cards Header (3 Status Cards: Sudah Absen, Belum Absen, Tidak Hadir) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">

        <div
          onClick={() => setActiveTab('sudah')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition shadow-sm flex items-center justify-between ${
            activeTab === 'sudah' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block mb-1">Sudah Absen</span>
            <span className="text-2xl font-black text-emerald-700">{dailyStatus.summary.sudah_absen}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <CheckCircle2 size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('belum')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition shadow-sm flex items-center justify-between ${
            activeTab === 'belum' ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider block mb-1">Belum Absen</span>
            <span className="text-2xl font-black text-amber-700">{dailyStatus.summary.belum_absen}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
            <Clock size={20} />
          </div>
        </div>

        <div
          onClick={() => setActiveTab('tidak_hadir')}
          className={`cursor-pointer bg-white rounded-2xl p-4 border transition shadow-sm flex items-center justify-between ${
            activeTab === 'tidak_hadir' ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div>
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider block mb-1">Tidak Hadir / Cuti</span>
            <span className="text-2xl font-black text-rose-700">{dailyStatus.summary.tidak_hadir}</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <AlertCircle size={20} />
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Subtabs */}
        <div className="flex p-1 bg-slate-100 rounded-2xl gap-1 w-full md:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('sudah')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'sudah' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sudah Absen ({dailyStatus.summary.sudah_absen})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('belum')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'belum' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Belum Absen ({dailyStatus.summary.belum_absen})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tidak_hadir')}
            className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 ${
              activeTab === 'tidak_hadir' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tidak Hadir ({dailyStatus.summary.tidak_hadir})
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Cari nama, NIP, jabatan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:ring-2 focus:ring-red-900/20"
            />
          </div>

          <select
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
          >
            <option value="ALL">Semua Divisi</option>
            <option value="Project">Project</option>
            <option value="Maintenance">Maintenance</option>
            <option value="HRGA">HRGA</option>
            <option value="Pengelola KO">Pengelola KO</option>
            <option value="Pengelola K3">Pengelola K3</option>
          </select>

          <button
            onClick={fetchDailyStatus}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition"
            title="Refresh status kehadiran"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Nama Karyawan</th>
                  <th className="p-3.5">NIP / ID</th>
                  <th className="p-3.5">Departemen</th>
                  <th className="p-3.5">Jabatan</th>
                  {activeTab === 'sudah' && (
                    <>
                      <th className="p-3.5 text-center">Jam Masuk</th>
                      <th className="p-3.5 text-center">Jam Pulang</th>
                      <th className="p-3.5 text-center">Status</th>
                      <th className="p-3.5">Lokasi</th>
                    </>
                  )}
                  {activeTab === 'belum' && (
                    <>
                      <th className="p-3.5 text-center">Penempatan</th>
                      <th className="p-3.5 text-center">Status Presensi</th>
                    </>
                  )}
                  {activeTab === 'tidak_hadir' && (
                    <>
                      <th className="p-3.5 text-center">Kategori</th>
                      <th className="p-3.5">Keterangan / Alasan</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {currentList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-400">{idx + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0">
                        {(item.nama || 'U').charAt(0)}
                      </div>
                      <span>{item.nama}</span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-600">{item.nip || '-'}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                        {item.departemen}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-bold">{item.jabatan || 'Staff'}</td>

                    {/* SUDAH ABSEN COLUMNS */}
                    {activeTab === 'sudah' && (
                      <>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-900">{item.check_in || '-'}</td>
                        <td className="p-3.5 text-center font-mono font-bold text-slate-600">{item.check_out || '-'}</td>
                        <td className="p-3.5 text-center">
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                            item.status === 'Terlambat'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-500 text-[11px] font-medium">{item.location}</td>
                      </>
                    )}

                    {/* BELUM ABSEN COLUMNS */}
                    {activeTab === 'belum' && (
                      <>
                        <td className="p-3.5 text-center font-bold text-slate-700">{item.penempatan || 'Site BIB'}</td>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200">
                            Belum Clock In
                          </span>
                        </td>
                      </>
                    )}

                    {/* TIDAK HADIR COLUMNS */}
                    {activeTab === 'tidak_hadir' && (
                      <>
                        <td className="p-3.5 text-center">
                          <span className="text-[10px] font-black bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-200">
                            {item.kategori || 'Cuti Roster'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 font-medium">{item.alasan || 'Sesuai Jadwal'}</td>
                      </>
                    )}
                  </tr>
                ))}

                {currentList.length === 0 && (
                  <tr>
                    <td colSpan="8" className="p-8 text-center text-sm font-bold text-slate-400">
                      Tidak ada karyawan dalam kategori ini
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default DailyAttendanceMonitorTab;
