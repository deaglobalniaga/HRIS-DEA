import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Users, Filter, ChevronDown, Printer, FileSpreadsheet, TrendingUp, Clock, User, X } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Reports = () => {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');

  const [activeTab, setActiveTab] = useState('recap'); // 'recap' or 'photo_log'
  const [reportData, setReportData] = useState(null);
  const [logData, setLogData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  
  // Recap States
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  // Log States
  const [logRange, setLogRange] = useState('month'); // default to 'month' per user request

  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  const fetchReport = async () => {
    if (activeTab !== 'recap') return;
    setLoading(true);
    try {
      const res = await api.get(`/hris/reports/attendance-monthly?month=${month}&year=${year}`);
      setReportData(res.data);
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    if (activeTab !== 'photo_log') return;
    setLoading(true);
    try {
      const res = await api.get(`/hris/reports/attendance-log?range=${logRange}`);
      setLogData(res.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { 
    if (activeTab === 'recap') fetchReport(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year, activeTab]);

  useEffect(() => { 
    if (activeTab === 'photo_log') fetchLogs(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logRange, activeTab]);

  // Export to CSV/Excel
  const exportToExcel = () => {
    if (!reportData || !reportData.report) return;
    const headers = ['No', 'Nama', 'NIK', 'Divisi', 'Hadir', 'Cuti', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Persentase (%)'];
    const rows = reportData.report.map((r, i) => [
      i + 1, r.full_name, r.nik_internal || '-', r.division, r.hadir, r.cuti, r.sakit, r.izin, r.alpa, r.terlambat, r.persentase
    ]);

    let csv = '\uFEFF'; // BOM for Excel UTF-8
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_Kehadiran_${monthNames[month - 1]}_${year}.csv`;
    link.click();
  };

  // Export to printable PDF (via browser print)
  const exportToPDF = () => {
    const printContent = document.getElementById('report-table-print');
    if (!printContent) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Rekap Kehadiran ${monthNames[month - 1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 13px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 10px; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .summary { display: flex; gap: 20px; margin-bottom: 16px; }
        .summary-item { padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
      </style></head><body>
      <h1>Laporan Rekap Kehadiran Karyawan</h1>
      <h2>${monthNames[month - 1]} ${year} — Total Hari Kerja: ${reportData?.totalWorkDays || 0}</h2>
      ${printContent.outerHTML}
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col w-full h-full pb-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText size={48} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-black text-slate-700">Akses Terbatas</h3>
            <p className="text-sm text-slate-500">Halaman laporan hanya dapat diakses oleh Admin/HR</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full pb-4 bg-slate-50">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 px-1">
        <div>
        </div>
        <div className="mt-3 md:mt-0 flex items-center gap-2 flex-wrap">
          {activeTab === 'recap' ? (
            <>
              {/* Month Selector */}
              <div className="relative">
                <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
                  className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/10">
                  {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select value={year} onChange={e => setYear(parseInt(e.target.value))}
                  className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/10">
                  {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </>
          ) : (
            <div className="relative">
              <select value={logRange} onChange={e => setLogRange(e.target.value)}
                className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/10">
                <option value="month">Bulan Ini</option>
                <option value="day">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="6months">6 Bulan Terakhir</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          )}

          <button onClick={exportToExcel} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors">
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-2 bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors">
            <Printer size={14} /> Export PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-4 px-1">
        <button
          onClick={() => setActiveTab('recap')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'recap' ? 'border-red-900 text-red-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Rekap Bulanan
        </button>
        <button
          onClick={() => setActiveTab('photo_log')}
          className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'photo_log' ? 'border-red-900 text-red-900' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Log Foto Kehadiran
        </button>
      </div>

      {/* Content based on Active Tab */}
      {activeTab === 'recap' ? (
        <>
          {/* Summary Cards */}
          {reportData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-blue-50 rounded-lg"><Users size={16} className="text-blue-600" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Karyawan</span>
                </div>
                <span className="text-2xl font-black text-slate-800">{reportData.totalEmployees}</span>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-green-50 rounded-lg"><Calendar size={16} className="text-green-600" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Hari Kerja</span>
                </div>
                <span className="text-2xl font-black text-slate-800">{reportData.totalWorkDays}</span>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-emerald-50 rounded-lg"><TrendingUp size={16} className="text-emerald-600" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rata-rata Kehadiran</span>
                </div>
                <span className="text-2xl font-black text-slate-800">
                  {reportData.report.length > 0 ? Math.round(reportData.report.reduce((s, r) => s + r.persentase, 0) / reportData.report.length) : 0}%
                </span>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 flex flex-col">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 bg-amber-50 rounded-lg"><Clock size={16} className="text-amber-600" /></div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Terlambat</span>
                </div>
                <span className="text-2xl font-black text-slate-800">
                  {reportData.report.reduce((s, r) => s + r.terlambat, 0)}
                </span>
              </div>
            </div>
          )}

          {/* Report Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-red-900 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm font-bold text-slate-500">Memuat laporan...</span>
                  </div>
                </div>
              ) : (
                <table id="report-table-print" className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-500">
                      <th className="p-4 font-black">No</th>
                      <th className="p-4 font-black">Nama Karyawan</th>
                      <th className="p-4 font-black">NIK</th>
                      <th className="p-4 font-black">Divisi</th>
                      <th className="p-4 font-black text-center">Hadir</th>
                      <th className="p-4 font-black text-center">Cuti</th>
                      <th className="p-4 font-black text-center">Sakit</th>
                      <th className="p-4 font-black text-center">Izin</th>
                      <th className="p-4 font-black text-center">Alpa</th>
                      <th className="p-4 font-black text-center">Terlambat</th>
                      <th className="p-4 font-black text-center">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {reportData?.report?.map((r, i) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-xs font-bold text-slate-400">{i + 1}</td>
                        <td className="p-4 text-sm font-bold text-slate-800">{r.full_name}</td>
                        <td className="p-4 text-xs font-bold text-slate-600">{r.nik_internal || '-'}</td>
                        <td className="p-4">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{r.division}</span>
                        </td>
                        <td className="p-4 text-center text-sm font-black text-green-700">{r.hadir}</td>
                        <td className="p-4 text-center text-sm font-bold text-blue-600">{r.cuti}</td>
                        <td className="p-4 text-center text-sm font-bold text-red-600">{r.sakit}</td>
                        <td className="p-4 text-center text-sm font-bold text-amber-600">{r.izin}</td>
                        <td className="p-4 text-center text-sm font-black text-red-700">{r.alpa}</td>
                        <td className="p-4 text-center text-sm font-bold text-amber-700">{r.terlambat}</td>
                        <td className="p-4 text-center">
                          <span className={`text-xs font-black px-2 py-1 rounded-full ${
                            r.persentase >= 90 ? 'bg-green-100 text-green-700' :
                            r.persentase >= 70 ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>{r.persentase}%</span>
                        </td>
                      </tr>
                    ))}
                    {(!reportData?.report || reportData.report.length === 0) && (
                      <tr><td colSpan="11" className="p-8 text-center text-sm font-bold text-slate-400">Tidak ada data untuk periode ini</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white flex-1 rounded-2xl shadow-sm border border-slate-100 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-red-900 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-500">Memuat log kehadiran...</span>
              </div>
            </div>
          ) : logData.length === 0 ? (
             <div className="flex items-center justify-center h-48 text-sm font-bold text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
               Tidak ada rekaman absensi untuk rentang waktu ini.
             </div>
          ) : (
             <div className="flex flex-col gap-8">
               {/* Grouping Log Data per Employee */}
               {Object.entries(
                 logData.reduce((acc, log) => {
                   const userName = log.users?.full_name || 'Karyawan Tidak Diketahui';
                   if (!acc[userName]) acc[userName] = { checkIn: [], checkOut: [], division: log.users?.division };
                   if (log.type === 'Check In') acc[userName].checkIn.push(log);
                   else if (log.type === 'Check Out') acc[userName].checkOut.push(log);
                   return acc;
                 }, {})
               ).map(([userName, data]) => (
                 <div key={userName} className="bg-slate-50 rounded-2xl border border-slate-200 p-5">
                   <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-200/60">
                     <div>
                       <h3 className="text-lg font-black text-slate-800">{userName}</h3>
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{data.division || '-'}</span>
                     </div>
                     <div className="text-xs font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                       Total Foto: {data.checkIn.length + data.checkOut.length}
                     </div>
                   </div>
                   
                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     {/* Check In Section */}
                     <div className="bg-white p-4 rounded-xl border border-green-100 shadow-sm">
                        <h4 className="text-sm font-bold text-green-700 mb-4 flex items-center gap-2 pb-2 border-b border-green-50">
                           <div className="p-1 bg-green-100 rounded text-green-600"><Clock size={14} /></div>
                           Data Foto Check In ({data.checkIn.length})
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                           {data.checkIn.map((log) => (
                             <div key={log.id} className="group relative bg-slate-900 rounded-lg overflow-hidden aspect-[3/4] border border-slate-200 shadow-sm cursor-pointer" onClick={() => log.photo_url && setSelectedPhoto(log.photo_url)}>
                               {log.photo_url ? (
                                 <img src={log.photo_url} alt="Check In" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                               ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                   <User size={24} className="mb-1 opacity-50" />
                                   <span className="text-[9px] font-bold">Tanpa Foto</span>
                                 </div>
                               )}
                               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                                  <p className="text-[10px] text-white font-bold">{new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                                  <p className="text-xs text-green-400 font-black">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                             </div>
                           ))}
                           {data.checkIn.length === 0 && <div className="col-span-full text-xs font-bold text-slate-400 py-4 text-center">Belum ada data check in</div>}
                        </div>
                     </div>

                     {/* Check Out Section */}
                     <div className="bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                        <h4 className="text-sm font-bold text-amber-700 mb-4 flex items-center gap-2 pb-2 border-b border-amber-50">
                           <div className="p-1 bg-amber-100 rounded text-amber-600"><Clock size={14} /></div>
                           Data Foto Check Out ({data.checkOut.length})
                        </h4>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2">
                           {data.checkOut.map((log) => (
                             <div key={log.id} className="group relative bg-slate-900 rounded-lg overflow-hidden aspect-[3/4] border border-slate-200 shadow-sm cursor-pointer" onClick={() => log.photo_url && setSelectedPhoto(log.photo_url)}>
                               {log.photo_url ? (
                                 <img src={log.photo_url} alt="Check Out" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" />
                               ) : (
                                 <div className="flex flex-col items-center justify-center h-full text-slate-600">
                                   <User size={24} className="mb-1 opacity-50" />
                                   <span className="text-[9px] font-bold">Tanpa Foto</span>
                                 </div>
                               )}
                               <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                                  <p className="text-[10px] text-white font-bold">{new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                                  <p className="text-xs text-amber-400 font-black">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                               </div>
                             </div>
                           ))}
                           {data.checkOut.length === 0 && <div className="col-span-full text-xs font-bold text-slate-400 py-4 text-center">Belum ada data check out</div>}
                        </div>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          )}
        </div>
      )}

      {/* Photo Zoom Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
          <button className="absolute top-6 right-6 text-white hover:text-red-500 bg-slate-800/50 hover:bg-slate-800 p-2 rounded-full transition" onClick={() => setSelectedPhoto(null)}>
            <X size={24} />
          </button>
          <img src={selectedPhoto} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default Reports;
