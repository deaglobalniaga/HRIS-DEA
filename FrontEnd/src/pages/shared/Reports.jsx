import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Users, ChevronDown, Printer, FileSpreadsheet, TrendingUp, Clock, AlertCircle, Trash2, X } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Reports = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  
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
    } catch (err) {
      console.error('Failed to fetch report', err);
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

  // Export to CSV/Excel
  const exportToExcel = () => {
    if (!reportData || !reportData.report) return;
    const headers = ['No', 'Nama', 'NIK', 'Divisi', 'Jabatan', 'Hadir', 'Cuti', 'Sakit', 'Izin', 'Alpa', 'Terlambat', 'Persentase (%)'];
    const rows = reportData.report.map((r, i) => [
      i + 1, r.full_name, r.nik_internal || '-', r.division, r.jabatan || '-', r.hadir, r.cuti, r.sakit, r.izin, r.alpa, r.terlambat, r.persentase
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
        .kop-surat { display: flex; align-items: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
        .logo-container { display: flex; align-items: center; padding-right: 20px; border-right: 2px solid #000; margin-right: 20px; }
        .logo-text { display: flex; flex-direction: column; }
        .logo-pt { margin: 0; font-size: 16px; color: #cc0000; font-weight: 900; letter-spacing: 1px; font-family: 'Arial Black', sans-serif; }
        .logo-gn { margin: 0; font-size: 14px; color: #000; font-weight: 900; letter-spacing: 1px; font-family: 'Arial Black', sans-serif; }
        .kop-text h1 { margin: 0; font-size: 14px; color: #000; font-weight: bold; }
        .kop-text p { margin: 4px 0 0 0; color: #000; font-size: 12px; }
        .report-title { text-align: center; font-size: 14px; margin-bottom: 20px; color: #000; font-weight: bold; }
      </style></head><body>
        <div class="kop-surat">
            <div class="logo-container">
                <img src="${window.location.origin}/dea.png" alt="PT DEA Global Niaga" style="height: 65px; margin-right: 15px; object-fit: contain;" />
                <div class="logo-text">
                    <h2 class="logo-pt">PT DEA</h2>
                    <h2 class="logo-gn">GLOBAL NIAGA</h2>
                </div>
            </div>
            <div class="kop-text">
                <h1>PT DEA GLOBAL NIAGA</h1>
                <p>Human Resources Information System<br/>Laporan Resmi Rekapitulasi Presensi</p>
            </div>
        </div>
      <div class="report-title">LAPORAN REKAP KEHADIRAN KARYAWAN<br/><br/>Periode: ${monthNames[month - 1]} ${year} &nbsp; | &nbsp; Total Hari Kerja: ${reportData?.totalWorkDays || 0}</div>
      ${printContent.outerHTML}
      <div style="margin-top: 50px; width: 100%; display: flex; justify-content: flex-end;">
          <div style="text-align: center; font-size: 12px;">
              <p style="margin-bottom: 60px;">Kalimantan Selatan, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p><strong>HR Department</strong></p>
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
    <div className="flex flex-col w-full h-full pb-4 bg-slate-50 font-sans">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 px-1 gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="text-red-700" size={22} /> Rekapitulasi Presensi & Kehadiran
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Laporan bulanan absensi seluruh karyawan PT DEA GLOBAL NIAGA terintegrasi sistem biometrik AI.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/10"
            >
              {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-8 text-xs font-bold text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-red-900/10"
            >
              {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button onClick={exportToExcel} className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition">
            <FileSpreadsheet size={14} /> Export CSV
          </button>
          <button onClick={exportToPDF} className="flex items-center gap-1.5 bg-red-700 hover:bg-red-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition">
            <Printer size={14} /> Cetak PDF
          </button>
          <button onClick={() => setShowClearModal(true)} className="flex items-center gap-1.5 bg-slate-800 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-sm transition">
            <Trash2 size={14} /> Bersihkan Data
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-blue-50 text-blue-700 rounded-lg"><Users size={16} /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Karyawan</span>
            </div>
            <span className="text-2xl font-black text-slate-800">{reportData.totalEmployees}</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-green-50 text-green-700 rounded-lg"><Calendar size={16} /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Hari Kerja</span>
            </div>
            <span className="text-2xl font-black text-slate-800">{reportData.totalWorkDays} Hari</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg"><TrendingUp size={16} /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Rata-rata Kehadiran</span>
            </div>
            <span className="text-2xl font-black text-slate-800">
              {reportData.report && reportData.report.length > 0 ? Math.round(reportData.report.reduce((s, r) => s + r.persentase, 0) / reportData.report.length) : 0}%
            </span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <div className="p-1.5 bg-amber-50 text-amber-700 rounded-lg"><Clock size={16} /></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Terlambat</span>
            </div>
            <span className="text-2xl font-black text-slate-800">
              {reportData.report ? reportData.report.reduce((s, r) => s + r.terlambat, 0) : 0}
            </span>
          </div>
        </div>
      )}

      {/* Report Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-red-700 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-bold text-slate-500">Memuat rekapitulasi kehadiran...</span>
              </div>
            </div>
          ) : (
            <table id="report-table-print" className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-black">
                  <th className="p-3.5">No</th>
                  <th className="p-3.5">Nama Karyawan</th>
                  <th className="p-3.5">No Pegawai / NIK</th>
                  <th className="p-3.5">Departemen</th>
                  <th className="p-3.5">Jabatan</th>
                  <th className="p-3.5 text-center">Hadir</th>
                  <th className="p-3.5 text-center">Cuti</th>
                  <th className="p-3.5 text-center">Sakit</th>
                  <th className="p-3.5 text-center">Izin</th>
                  <th className="p-3.5 text-center">Alpa</th>
                  <th className="p-3.5 text-center">Terlambat</th>
                  <th className="p-3.5 text-center">% Hadir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {reportData?.report?.map((r, i) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5 font-bold text-slate-400">{i + 1}</td>
                    <td className="p-3.5 font-bold text-slate-900">{r.full_name}</td>
                    <td className="p-3.5 font-bold text-slate-600">{r.nik_internal || '-'}</td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full border border-blue-200">{r.division}</span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-bold">{r.jabatan || '-'}</td>
                    <td className="p-3.5 text-center font-black text-emerald-700">{r.hadir}</td>
                    <td className="p-3.5 text-center font-bold text-blue-600">{r.cuti}</td>
                    <td className="p-3.5 text-center font-bold text-rose-600">{r.sakit}</td>
                    <td className="p-3.5 text-center font-bold text-amber-600">{r.izin}</td>
                    <td className="p-3.5 text-center font-black text-red-700">{r.alpa}</td>
                    <td className="p-3.5 text-center font-bold text-amber-700">{r.terlambat}</td>
                    <td className="p-3.5 text-center">
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                        r.persentase >= 90 ? 'bg-emerald-100 text-emerald-800' :
                        r.persentase >= 70 ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>{r.persentase}%</span>
                    </td>
                  </tr>
                ))}
                {(!reportData?.report || reportData.report.length === 0) && (
                  <tr>
                    <td colSpan="12" className="p-8 text-center text-sm font-bold text-slate-400">
                      Tidak ada data kehadiran untuk periode ini
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
              <button onClick={() => setShowClearModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-200 text-slate-500 hover:bg-red-100 hover:text-red-900 transition">
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
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
                  disabled={isClearing}
                >
                  Batal
                </button>
                <button 
                  onClick={handleClearOldData}
                  className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-red-700 hover:bg-red-800 transition flex items-center justify-center gap-2"
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

