import React, { useState, useEffect } from 'react';
import { 
  FileText, Calendar, Users, ChevronDown, Printer, FileSpreadsheet, 
  TrendingUp, Clock, AlertCircle, Trash2, X, Search, CheckCircle2, 
  Eye, RefreshCw, Smartphone, ShieldCheck, MapPin
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Reports = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(new Date());
  
  // Clear Old Data Modal State
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearYearCutoff, setClearYearCutoff] = useState(new Date().getFullYear() - 2);
  const [isClearing, setIsClearing] = useState(false);
  
  // Month / Year Selector
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/hris/reports/attendance-monthly?month=${month}&year=${year}`);
      setReportData(res.data);
      setLastFetchTime(new Date());
    } catch (err) {
      console.error('Failed to fetch report', err);
      addToast(`Gagal memuat rekapitulasi: ${err?.response?.data?.message || err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearOldData = async () => {
    if (!window.confirm(`PERINGATAN: Anda akan menghapus SEMUA data kehadiran dan riwayat izin sebelum tahun ${clearYearCutoff}. Data yang dihapus TIDAK DAPAT dikembalikan. Lanjutkan?`)) return;
    
    setIsClearing(true);
    try {
      await api.delete(`/hris/reports/cleanup?year=${clearYearCutoff}`);
      addToast(`Berhasil menghapus data sebelum tahun ${clearYearCutoff}.`, 'success');
      setShowClearModal(false);
      fetchReport();
    } catch (err) {
      console.error('Failed to clear old data', err);
      addToast('Gagal menghapus data lama.', 'error');
    } finally {
      setIsClearing(false);
    }
  };

  useEffect(() => { 
    fetchReport(); 
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  // Robust extraction of report list array
  const reportList = Array.isArray(reportData?.report)
    ? reportData.report
    : Array.isArray(reportData?.data)
    ? reportData.data
    : Array.isArray(reportData)
    ? reportData
    : [];

  // Filter report rows based on search term
  const filteredReport = reportList.filter(r => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.full_name || r.name || '').toLowerCase().includes(q) ||
      (r.nik_internal || r.nip || '').toLowerCase().includes(q) ||
      (r.division || r.departemen || '').toLowerCase().includes(q) ||
      (r.jabatan || '').toLowerCase().includes(q)
    );
  });

  // Calculate high-level summary metrics
  const totalEmployees = reportData?.totalEmployees ?? reportList.length;
  const totalWorkDays = reportData?.totalWorkDays ?? 26;
  const avgAttendance = reportList.length > 0 
    ? Math.round(reportList.reduce((s, r) => s + (Number(r.persentase) || 0), 0) / reportList.length)
    : 0;
  const totalLate = reportList.reduce((s, r) => s + (Number(r.terlambat) || 0), 0);

  // Export to CSV/Excel with timestamps
  const exportToExcel = () => {
    if (reportList.length === 0) {
      addToast('Tidak ada data untuk diekspor.', 'error');
      return;
    }
    const headers = [
      'No', 'Nama Karyawan', 'NIK / No Pegawai', 'Departemen', 'Jabatan', 
      'Hadir (Hari)', 'Cuti', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Persentase (%)', 
      'Timestamp Presensi Terakhir'
    ];
    const rows = filteredReport.map((r, i) => {
      const lastTimestampStr = r.last_log 
        ? `${r.last_log.date} ${r.last_log.check_in_time || ''} - ${r.last_log.check_out_time || ''}`.trim()
        : '-';
      return [
        i + 1, r.full_name || r.name, r.nik_internal || r.nip || '-', r.division || '-', r.jabatan || '-', 
        r.hadir ?? 0, r.cuti ?? 0, r.sakit ?? 0, r.izin ?? 0, r.alpa ?? 0, r.terlambat ?? 0, `${r.persentase ?? 0}%`,
        lastTimestampStr
      ];
    });

    let csv = '\uFEFF'; // BOM for Excel UTF-8
    csv += `REKAPITULASI KEHADIRAN KARYAWAN PT DEA GLOBAL NIAGA\n`;
    csv += `Periode: ${monthNames[month - 1]} ${year} | Diekspor pada: ${new Date().toLocaleString('id-ID')}\n\n`;
    csv += headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(v => `"${v}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Rekap_Kehadiran_Timestamp_${monthNames[month - 1]}_${year}.csv`;
    link.click();
    addToast('Laporan Rekap Kehadiran (.csv) berhasil diunduh.', 'success');
  };

  // Export to printable PDF (via browser print)
  const exportToPDF = () => {
    const printContent = document.getElementById('report-table-print');
    if (!printContent) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Rekap Kehadiran ${monthNames[month - 1]} ${year}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #1e293b; }
        h1 { font-size: 18px; margin-bottom: 4px; }
        h2 { font-size: 13px; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
        th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
        th { background: #f1f5f9; font-weight: bold; text-transform: uppercase; font-size: 9px; }
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .kop-surat { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .logo-container { display: flex; align-items: center; padding-right: 20px; border-right: 2px solid #000; margin-right: 20px; }
        .logo-text { display: flex; flex-direction: column; }
        .logo-pt { margin: 0; font-size: 16px; color: #cc0000; font-weight: 900; letter-spacing: 1px; font-family: 'Arial Black', sans-serif; }
        .logo-gn { margin: 0; font-size: 14px; color: #000; font-weight: 900; letter-spacing: 1px; font-family: 'Arial Black', sans-serif; }
        .kop-text h1 { margin: 0; font-size: 14px; color: #000; font-weight: bold; }
        .kop-text p { margin: 4px 0 0 0; color: #000; font-size: 11px; }
        .report-title { text-align: center; font-size: 13px; margin-bottom: 15px; color: #000; font-weight: bold; }
        .timestamp-info { font-size: 10px; color: #64748b; margin-top: 5px; text-align: right; }
      </style></head><body>
        <div class="kop-surat">
            <div class="logo-container">
                <img src="${window.location.origin}/dea.png" alt="PT DEA Global Niaga" style="height: 60px; margin-right: 15px; object-fit: contain;" />
                <div class="logo-text">
                    <h2 class="logo-pt">PT DEA</h2>
                    <h2 class="logo-gn">GLOBAL NIAGA</h2>
                </div>
            </div>
            <div class="kop-text">
                <h1>PT DEA GLOBAL NIAGA</h1>
                <p>Human Resources Information System<br/>Laporan Resmi Rekapitulasi Presensi & Timestamp Biometrik</p>
            </div>
        </div>
      <div class="report-title">LAPORAN REKAPITULASI KEHADIRAN KARYAWAN<br/>Periode: ${monthNames[month - 1]} ${year} &nbsp;|&nbsp; Total Hari Kerja: ${totalWorkDays} Hari</div>
      <div class="timestamp-info">Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} pukul ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA</div>
      ${printContent.outerHTML}
      <div style="margin-top: 40px; width: 100%; display: flex; justify-content: flex-end;">
          <div style="text-align: center; font-size: 11px;">
              <p style="margin-bottom: 50px;">Kalimantan Selatan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>HR & GA Department</strong><br/>PT DEA GLOBAL NIAGA</p>
          </div>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col w-full h-full pb-4 font-sans">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <FileText size={48} className="text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-black text-slate-700">Akses Terbatas</h3>
            <p className="text-sm text-slate-500">Halaman laporan hanya dapat diakses oleh Admin / HR</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full pb-6 bg-slate-50 font-sans space-y-4">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-1">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-red-700" size={22} /> Rekapitulasi Presensi & Kehadiran
          </h1>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium mt-1">
            <span>Laporan bulanan absensi seluruh karyawan PT DEA GLOBAL NIAGA.</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-slate-400 font-mono flex items-center gap-1">
              <Clock size={11} /> Update: {lastFetchTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WITA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-900/10 cursor-pointer"
            >
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-xs focus:outline-none focus:ring-2 focus:ring-red-900/10 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button 
            onClick={fetchReport} 
            className="p-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition shadow-xs cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin text-blue-600' : ''} />
          </button>

          <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer">
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer">
            <Printer size={14} /> Cetak PDF
          </button>
          <button onClick={() => setShowClearModal(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer">
            <Trash2 size={14} /> Bersihkan Data
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl"><Users size={16} /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Karyawan</span>
          </div>
          <span className="text-2xl font-black text-slate-800">{totalEmployees}</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl"><Calendar size={16} /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hari Kerja Efektif</span>
          </div>
          <span className="text-2xl font-black text-slate-800">{totalWorkDays} Hari</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-xl"><TrendingUp size={16} /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Rata-rata Kehadiran</span>
          </div>
          <span className="text-2xl font-black text-slate-800">{avgAttendance}%</span>
        </div>

        <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-4 flex flex-col justify-between">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl"><Clock size={16} /></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Terlambat</span>
          </div>
          <span className="text-2xl font-black text-slate-800">{totalLate} Kali</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Cari nama karyawan, NIP, atau departemen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-red-900/10"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 w-full sm:w-auto justify-end">
          <span>Menampilkan {filteredReport.length} dari {reportList.length} Karyawan</span>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-slate-500">Memuat data rekapitulasi & timestamp presensi...</span>
              </div>
            </div>
          ) : (
            <table id="report-table-print" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Nama Karyawan</th>
                  <th className="p-3.5">NIP / ID</th>
                  <th className="p-3.5">Departemen</th>
                  <th className="p-3.5">Jabatan</th>
                  <th className="p-3.5 text-center">Hadir</th>
                  <th className="p-3.5 text-center">Cuti</th>
                  <th className="p-3.5 text-center">Sakit</th>
                  <th className="p-3.5 text-center">Izin</th>
                  <th className="p-3.5 text-center">Alpa</th>
                  <th className="p-3.5 text-center">Terlambat</th>
                  <th className="p-3.5 text-center">% Hadir</th>
                  <th className="p-3.5">Presensi Terakhir (Timestamp)</th>
                  <th className="p-3.5 text-center print:hidden">Detail Log</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredReport.map((r, i) => (
                  <React.Fragment key={r.id || i}>
                    <tr className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 font-bold text-slate-400">{i + 1}</td>
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-black text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                            {(r.full_name || r.name || 'U').charAt(0)}
                          </span>
                          <span className="truncate">{r.full_name || r.name}</span>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-600 font-bold">{r.nik_internal || r.nip || '-'}</td>
                      <td className="p-3.5">
                        <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                          {r.division || r.departemen || 'General'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 font-bold">{r.jabatan || '-'}</td>
                      <td className="p-3.5 text-center font-black text-emerald-700">{r.hadir ?? 0}</td>
                      <td className="p-3.5 text-center font-bold text-blue-600">{r.cuti ?? 0}</td>
                      <td className="p-3.5 text-center font-bold text-rose-600">{r.sakit ?? 0}</td>
                      <td className="p-3.5 text-center font-bold text-amber-600">{r.izin ?? 0}</td>
                      <td className="p-3.5 text-center font-black text-red-700">{r.alpa ?? 0}</td>
                      <td className="p-3.5 text-center font-bold text-amber-700">{r.terlambat ?? 0}</td>
                      <td className="p-3.5 text-center">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                          (r.persentase || 0) >= 90 ? 'bg-emerald-100 text-emerald-800' :
                          (r.persentase || 0) >= 70 ? 'bg-amber-100 text-amber-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>{r.persentase ?? 0}%</span>
                      </td>

                      {/* Timestamp Presensi Terakhir Column */}
                      <td className="p-3.5">
                        {r.last_log ? (
                          <div className="flex flex-col text-[11px]">
                            <span className="font-bold text-slate-800 flex items-center gap-1">
                              <Calendar size={11} className="text-slate-400" />
                              {new Date(r.last_log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono mt-0.5">
                              {r.last_log.check_in_time && (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                  In: {r.last_log.check_in_time}
                                </span>
                              )}
                              {r.last_log.check_out_time && (
                                <span className="text-blue-700 font-bold bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                  Out: {r.last_log.check_out_time}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium italic">Belum ada log</span>
                        )}
                      </td>

                      {/* Action Button: Detail Log */}
                      <td className="p-3.5 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedUser(expandedUser === (r.id || i) ? null : (r.id || i))}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-black transition flex items-center gap-1 mx-auto cursor-pointer border ${
                            expandedUser === (r.id || i) 
                              ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Clock size={11} /> {expandedUser === (r.id || i) ? 'Tutup' : 'Log Waktu'}
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Daily Timestamps Row */}
                    {expandedUser === (r.id || i) && (
                      <tr className="bg-slate-50/90 border-b-2 border-slate-200 animate-in fade-in">
                        <td colSpan="14" className="p-4">
                          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <Clock size={16} className="text-red-700" />
                                <h4 className="text-xs font-black text-slate-900">
                                  Rincian Log Presensi & Timestamp Harian: {r.full_name || r.name} ({r.division || r.departemen})
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                                Total: {r.logs?.length || 0} Log Hari Terdata
                              </span>
                            </div>

                            {r.logs && r.logs.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto pr-1">
                                {r.logs.map((log, idx) => (
                                  <div 
                                    key={log.id || idx}
                                    className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col justify-between gap-2 hover:bg-blue-50/30 transition-all"
                                  >
                                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                                      <span className="text-[11px] font-black text-slate-800">
                                        {new Date(log.date).toLocaleDateString('id-ID', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                      </span>
                                      <span className={`text-[9px] font-black px-1.5 py-0.2 rounded ${
                                        log.status === 'Terlambat' 
                                          ? 'bg-amber-100 text-amber-800' 
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}>
                                        {log.status}
                                      </span>
                                    </div>

                                    {/* Timestamps */}
                                    <div className="space-y-1 text-xs">
                                      <div className="flex items-center justify-between text-slate-600">
                                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                          <Clock size={10} className="text-emerald-600" /> Jam Masuk:
                                        </span>
                                        <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
                                          {log.check_in_time || '-'}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-slate-600">
                                        <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                          <Clock size={10} className="text-blue-600" /> Jam Pulang:
                                        </span>
                                        <span className="font-mono font-bold text-blue-800 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                                          {log.check_out_time || '-'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Bottom: Total Hours & Device */}
                                    <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                                      <span className="text-slate-400 font-medium truncate max-w-[140px]" title={log.device_info}>
                                        {log.device_info || 'Biometrik AI'}
                                      </span>
                                      <span className="font-black text-slate-800">
                                        {log.hours} Jam
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-6 text-slate-400 text-xs font-bold">
                                Belum ada log presensi terekam untuk karyawan ini pada bulan ini.
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {filteredReport.length === 0 && (
                  <tr>
                    <td colSpan="14" className="p-8 text-center text-sm font-bold text-slate-400">
                      Tidak ada data kehadiran yang sesuai dengan pencarian
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Clear Old Data Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                  <AlertCircle size={18} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Bersihkan Database</h2>
                  <p className="text-[11px] font-medium text-slate-400">Hapus arsip kehadiran lama</p>
                </div>
              </div>
              <button onClick={() => setShowClearModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition cursor-pointer">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-medium p-3.5 rounded-xl mb-5 leading-relaxed">
                Peringatan: Tindakan ini akan menghapus semua riwayat kehadiran dan pengajuan izin yang dibuat sebelum tahun batas secara permanen.
              </div>
              
              <label className="block text-xs font-bold text-slate-700 mb-2">Hapus data sebelum tahun:</label>
              <select 
                value={clearYearCutoff} 
                onChange={(e) => setClearYearCutoff(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-red-900/10 mb-6 text-sm"
              >
                {[2024, 2025, 2026, 2027, 2028, 2029].map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowClearModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
                  disabled={isClearing}
                >
                  Batal
                </button>
                <button 
                  onClick={handleClearOldData}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition flex items-center justify-center gap-2 cursor-pointer"
                  disabled={isClearing}
                >
                  {isClearing ? 'Menghapus...' : 'Konfirmasi Hapus'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
