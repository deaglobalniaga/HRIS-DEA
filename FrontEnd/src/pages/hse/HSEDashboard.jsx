import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  Clock, ShieldCheck, AlertTriangle, Award,
  Shield, FileCheck, Search, Eye, Filter,
  CheckCircle2, XCircle, UserCheck, History, Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import PdfViewerModal from '../../components/PdfViewerModal';

const HSEDashboard = () => {
  const navigate = useNavigate();
  const [serverTime, setServerTime] = useState(new Date());
  const [recentLimit, setRecentLimit] = useState(10); // 10, 20, 30, or all
  const [searchRecent, setSearchRecent] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('all'); // 'all' | 'Approved' | 'Rejected'
  const [searchVerification, setSearchVerification] = useState('');
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [hseData, setHseData] = useState({
    totalEmployees: 0,
    activeCertsCount: 0,
    expiringCertsCount: 0,
    expiredCertsCount: 0,
    pendingCertsCount: 0,
    certDistribution: [],
    verificationLogs: [],
    criticalCertAlerts: []
  });

  useEffect(() => {
    const fetchHSEData = async () => {
      try {
        const [certRes, empRes] = await Promise.all([
          api.get('/hris/certifications').catch(() => ({ data: [] })),
          api.get('/hris/employees').catch(() => ({ data: [] }))
        ]);

        const certs = Array.isArray(certRes.data) ? certRes.data : [];
        const employees = Array.isArray(empRes.data) ? empRes.data : [];

        // Cert type distribution
        const certCounts = {};
        certs.forEach(c => {
          const type = c.name || c.type || c.nama_sertifikat || 'Sertifikasi K3';
          certCounts[type] = (certCounts[type] || 0) + 1;
        });

        const colors = ['#2563eb', '#84cc16', '#dc2626', '#f97316', '#fb923c', '#f59e0b', '#10b981'];
        const certDistribution = Object.keys(certCounts).map((key, idx) => ({
          name: key,
          count: certCounts[key],
          fill: colors[idx % colors.length],
          standard: 'ESDM / Kemenaker RI'
        }));

        const criticalCertAlerts = certs.map(c => ({
          id: c.id,
          name: c.karyawan?.nama_lengkap || c.karyawan?.nama || c.employee_name || c.holder_name || 'Karyawan',
          nomor_pegawai: c.karyawan?.nomor_pegawai || '-',
          cert: c.nama_sertifikat || c.name || c.type || 'Sertifikasi K3',
          cert_number: c.nomor_sertifikat || c.certificate_number || '-',
          dept: c.karyawan?.departemen || c.department || 'Operasional',
          jabatan: c.karyawan?.jabatan || '-',
          expiry: c.is_lifetime ? 'Seumur Hidup' : (c.tanggal_kadaluarsa || c.valid_until || c.expiry_date || 'Aktif'),
          is_lifetime: c.is_lifetime,
          status: (c.status === 'Pending' || c.is_approved === false) ? 'Menunggu Verifikasi' : (c.status || 'Aman'),
          file_url: c.file_url || c.file_path,
          created_at: c.created_at || c.tanggal_diterbitkan
        }));

        const activeCerts = certs.filter(c => c.status === 'Approved' || (!c.status && c.is_approved !== false));
        const pending = certs.filter(c => c.status === 'Pending');
        const expiring = certs.filter(c => c.status === 'Expiring Soon' || (c.status_text && c.status_text.includes('Segera'))).length;
        const expired = certs.filter(c => c.status === 'Expired' || (c.status_text && c.status_text.includes('Kadaluarsa'))).length;

        // HSE Verification History Logs (Approved or Rejected by HSE Admin)
        const verificationLogs = certs
          .filter(c => c.status === 'Approved' || c.status === 'Rejected' || c.verified_by || c.is_approved)
          .map(c => ({
            id: c.id,
            employee_name: c.karyawan?.nama_lengkap || c.karyawan?.nama || 'Karyawan',
            nomor_pegawai: c.karyawan?.nomor_pegawai || '-',
            dept: c.karyawan?.departemen || 'Operasional',
            jabatan: c.karyawan?.jabatan || 'Staff',
            cert_name: c.nama_sertifikat || c.certificate_name || 'Sertifikat Kompetensi',
            cert_number: c.nomor_sertifikat || c.certificate_number || '-',
            status: c.status || (c.is_approved ? 'Approved' : 'Pending'),
            verified_by: c.verified_by || 'HSE Officer Admin',
            verified_at: c.verified_at || c.created_at,
            rejection_reason: c.rejection_reason || null,
            file_url: c.file_url || c.file_path,
            created_at: c.created_at
          }))
          .sort((a, b) => new Date(b.verified_at || b.created_at) - new Date(a.verified_at || a.created_at));

        setHseData({
          totalEmployees: employees.length,
          activeCertsCount: activeCerts.length,
          pendingCertsCount: pending.length,
          expiringCertsCount: expiring,
          expiredCertsCount: expired,
          certDistribution: certDistribution,
          verificationLogs: verificationLogs,
          criticalCertAlerts: criticalCertAlerts
        });
      } catch (e) {
        console.error('Fetch HSE data error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchHSEData();
  }, []);

  // Handler: delete a verification log entry (cert) including storage file
  const handleDeleteLog = async (certId) => {
    setDeletingId(certId);
    try {
      await api.delete(`/hris/certifications/${certId}`);
      setHseData(prev => ({
        ...prev,
        verificationLogs: prev.verificationLogs.filter(l => l.id !== certId),
        criticalCertAlerts: prev.criticalCertAlerts.filter(a => a.id !== certId)
      }));
      setDeleteConfirmId(null);
    } catch (err) {
      alert(`Gagal menghapus: ${err?.response?.data?.error || err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Custom informative tooltip for bar chart
  const CustomCertTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 text-xs space-y-1 z-50">
          <p className="font-black text-emerald-400 text-sm">{data.name}</p>
          <div className="flex items-center justify-between gap-4 text-slate-200">
            <span>Jumlah Pemegang:</span>
            <span className="font-black text-white">{data.count} Karyawan</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-slate-300 text-[10px]">
            <span>Standar Acuan:</span>
            <span className="font-semibold text-slate-100">{data.standard || 'Kemenaker / ESDM'}</span>
          </div>
          <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-700 mt-1">
            Klik Matriks K3 untuk melihat daftar nama karyawan
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative w-full min-h-screen pb-12 font-sans animate-in fade-in space-y-6">
      {/* Main Foreground Content */}
      <div className="relative z-10 space-y-6">
        {/* Floating Top Bar */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 shadow-md shadow-slate-200/50">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
            </span>
            <span className="text-base sm:text-xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-800 drop-shadow-sm">
              {serverTime.toTimeString().split(' ')[0]}
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-100/90 text-emerald-800 border border-emerald-200 tracking-wider">
              WITA
            </span>
          </div>

          <div className="flex items-center gap-2">
            {hseData.pendingCertsCount > 0 && (
              <button
                onClick={() => navigate('/organization?tab=certifications&subtab=pending')}
                className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-xs rounded-2xl shadow-md animate-pulse transition-all cursor-pointer"
              >
                <ShieldCheck size={15} />
                <span>{hseData.pendingCertsCount} Permohonan User</span>
              </button>
            )}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 text-slate-800 text-[10px] font-black uppercase tracking-wider shadow-sm">
              <ShieldCheck size={13} className="text-emerald-700" /> 
              <span>HSE Command Center</span>
            </div>
            <button
              onClick={() => navigate('/organization?tab=certifications')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
            >
              <Award size={14} /> Kelola Sertifikasi K3
            </button>
          </div>
        </div>

        {/* Focused HSE Safety & Certification KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 pointer-events-auto">
          <TopBadge
            icon={ShieldCheck}
            value={hseData.totalEmployees}
            title="Total Karyawan"
            subtitle="Karyawan terdaftar di sistem"
            colorClass="text-emerald-600"
            onClick={() => navigate('/organization?tab=employees')}
          />
          <TopBadge
            icon={Award}
            value={hseData.activeCertsCount}
            title="Sertifikat K3 Aktif"
            subtitle="Lisensi kompetensi valid"
            colorClass="text-blue-600"
            onClick={() => navigate('/organization?tab=certifications')}
          />
          <TopBadge
            icon={ShieldCheck}
            value={hseData.pendingCertsCount}
            title="Permohonan User"
            subtitle="Menunggu verifikasi HSE"
            colorClass={hseData.pendingCertsCount > 0 ? "text-purple-600 font-black" : "text-slate-400"}
            onClick={() => navigate('/organization?tab=certifications&subtab=pending')}
          />
          <TopBadge
            icon={AlertTriangle}
            value={hseData.expiringCertsCount}
            title="Segera Kedaluwarsa"
            subtitle="Masa berlaku < 60 hari"
            colorClass={hseData.expiringCertsCount > 0 ? "text-amber-500" : "text-slate-400"}
            onClick={() => navigate('/organization?tab=certifications')}
          />
          <TopBadge
            icon={FileCheck}
            value={hseData.expiredCertsCount}
            title="Kedaluwarsa"
            subtitle="Perlu perpanjangan/renewal"
            colorClass={hseData.expiredCertsCount > 0 ? "text-red-600" : "text-emerald-600"}
            onClick={() => navigate('/organization?tab=certifications')}
          />
        </div>

        {/* HSE Visual Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pointer-events-auto">
          {/* K3 Certification Distribution Bar Chart (7 Cols) */}
          <div className="lg:col-span-7 bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Award size={16} className="text-emerald-700" /> Matriks Kepemilikan Sertifikat K3 Karyawan
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">Jumlah karyawan bersertifikasi resmi pengawas operasional & teknis</p>
              </div>
              <span className="text-xs font-black bg-emerald-50 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl">
                {hseData.certDistribution.length} Kategori
              </span>
            </div>

            <div className="w-full h-64 my-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hseData.certDistribution} margin={{ top: 15, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#475569', fontWeight: 'bold' }} interval={0} angle={-15} textAnchor="end" />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip content={<CustomCertTooltip />} />
                  <Bar dataKey="count" name="Jumlah Karyawan" radius={[6, 6, 0, 0]}>
                    {hseData.certDistribution.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 text-[11px] text-slate-500 font-medium">
              <span>💡 <strong>Penjelasan:</strong> Menampilkan sebaran pemegang lisensi K3 resmi (POP, POM, AK3U, WAH) sesuai regulasi ESDM & Kemenaker RI.</span>
              <button
                onClick={() => navigate('/organization?tab=certifications')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                Detail Sertifikat &rarr;
              </button>
            </div>
          </div>

          {/* Riwayat Verifikasi Sertifikat oleh Admin HSE (5 Cols) */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
            {/* Widget Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shadow-xs">
                  <UserCheck size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    Riwayat Verifikasi Sertifikat oleh Admin HSE
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    Log audit persetujuan sertifikat yang diunggah karyawan
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                {(hseData.verificationLogs || []).length} Log
              </span>
            </div>

            {/* Filter Tabs & Quick Search */}
            <div className="flex items-center justify-between gap-2 pt-3 pb-2">
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setVerificationFilter('all')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    verificationFilter === 'all' ? 'bg-white text-emerald-900 shadow-xs font-black' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Semua ({(hseData.verificationLogs || []).length})
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationFilter('Approved')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    verificationFilter === 'Approved' ? 'bg-emerald-700 text-white shadow-xs font-black' : 'text-slate-500 hover:text-emerald-700'
                  }`}
                >
                  Disetujui ({((hseData.verificationLogs || []).filter(l => l.status === 'Approved')).length})
                </button>
                <button
                  type="button"
                  onClick={() => setVerificationFilter('Rejected')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    verificationFilter === 'Rejected' ? 'bg-rose-700 text-white shadow-xs font-black' : 'text-slate-500 hover:text-rose-700'
                  }`}
                >
                  Ditolak ({((hseData.verificationLogs || []).filter(l => l.status === 'Rejected')).length})
                </button>
              </div>

              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchVerification}
                  onChange={e => setSearchVerification(e.target.value)}
                  className="pl-7 pr-2 py-1 bg-slate-50 border border-slate-200 rounded-xl text-[11px] font-medium outline-none focus:ring-1 focus:ring-emerald-600 w-28 sm:w-36"
                />
              </div>
            </div>

            {/* Scrollable Verification Log Items List */}
            <div className="w-full h-64 overflow-y-auto space-y-2.5 my-1 pr-1">
              {(() => {
                const filteredVerifications = (hseData.verificationLogs || []).filter(item => {
                  const matchesFilter = verificationFilter === 'all' || item.status === verificationFilter;
                  const query = searchVerification.toLowerCase().trim();
                  const matchesSearch = !query || 
                    item.employee_name.toLowerCase().includes(query) ||
                    item.cert_name.toLowerCase().includes(query) ||
                    item.cert_number.toLowerCase().includes(query) ||
                    (item.verified_by || '').toLowerCase().includes(query);
                  return matchesFilter && matchesSearch;
                });

                if (filteredVerifications.length === 0) {
                  return (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                      <FileCheck size={28} className="mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold text-slate-600">Tidak ada riwayat verifikasi</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pengajuan yang telah diverifikasi akan tampil di sini.</p>
                    </div>
                  );
                }

                return filteredVerifications.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="p-3 rounded-2xl bg-slate-50/90 hover:bg-emerald-50/40 border border-slate-200/80 transition-all space-y-1.5"
                  >
                    {/* Top Row: Employee info & Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                          {item.employee_name.charAt(0)}
                        </span>
                        <span className="text-xs font-black text-slate-900 truncate">
                          {item.employee_name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate hidden sm:inline">
                          ({item.dept} • {item.jabatan})
                        </span>
                      </div>

                      {item.status === 'Approved' ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 shrink-0">
                          <CheckCircle2 size={10} /> Disetujui
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1 shrink-0">
                          <XCircle size={10} /> Ditolak
                        </span>
                      )}
                    </div>

                    {/* Middle Row: Certificate Name & Number */}
                    <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between gap-2">
                      <span className="truncate">{item.cert_name}</span>
                      <span className="text-[10px] font-mono text-slate-500 shrink-0 font-normal">
                        {item.cert_number}
                      </span>
                    </div>

                    {/* If rejected, display reason */}
                    {item.rejection_reason && (
                      <div className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200/60 p-1.5 rounded-xl font-medium">
                        Alasan: {item.rejection_reason}
                      </div>
                    )}

                    {/* Bottom Row: Verifier Name & Timestamp & Preview Button */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10px]">
                      <div className="flex items-center gap-1 text-slate-600 font-medium truncate">
                        <UserCheck size={11} className="text-emerald-700 shrink-0" />
                        <span className="truncate">Diverifikasi oleh: <strong className="text-slate-800 font-black">{item.verified_by}</strong></span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-slate-400 font-medium flex items-center gap-0.5">
                          <Clock size={10} />
                          {new Date(item.verified_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {item.file_url && (
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({
                              url: item.file_url,
                              name: `${item.cert_name} - ${item.employee_name}`,
                              id: item.id
                            })}
                            className="px-2 py-0.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 rounded-lg font-bold border border-slate-200 transition flex items-center gap-1 shadow-xs cursor-pointer"
                            title="Lihat Pratinjau Dokumen Sertifikat"
                          >
                            <Eye size={10} /> Pratinjau
                          </button>
                        )}

                        {/* Delete / Confirm Delete */}
                        {deleteConfirmId === item.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === item.id}
                              onClick={() => handleDeleteLog(item.id)}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-black transition flex items-center gap-1 cursor-pointer disabled:opacity-60"
                            >
                              {deletingId === item.id ? 'Menghapus...' : 'Ya, Hapus'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(null)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[9px] font-bold transition cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition border border-transparent hover:border-rose-200 cursor-pointer"
                            title="Hapus riwayat verifikasi ini"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Footer Note & Link */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>🛡️ Seluruh verifikasi dicatat secara permanen di audit log HRIS.</span>
              <button
                type="button"
                onClick={() => navigate('/organization?tab=certifications')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                Kelola Matriks &rarr;
              </button>
            </div>
          </div>
        </div>

        {/* Monitoring & Status Masa Berlaku Sertifikasi K3 Table */}
        <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-slate-200/90 shadow-sm pointer-events-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 mb-4 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-emerald-700" />
                <h3 className="text-sm font-black text-slate-900">
                  Monitoring & Status Masa Berlaku Sertifikasi K3
                </h3>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[10px] font-black">
                  {hseData.criticalCertAlerts.length} Total
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Riwayat sertifikasi dan lisensi terbaru yang baru ditambahkan ke sistem
              </p>
            </div>

            <div className="flex items-center flex-wrap gap-2.5">
              {/* Limit Selector: 10, 20, 30, Semua */}
              <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
                <span className="text-[10px] text-slate-400 font-bold px-2 uppercase tracking-wider">Tampilkan:</span>
                {[10, 20, 30].map(num => (
                  <button
                    key={num}
                    onClick={() => setRecentLimit(num)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                      recentLimit === num
                        ? 'bg-emerald-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                    }`}
                  >
                    {num} Baru
                  </button>
                ))}
                <button
                  onClick={() => setRecentLimit(9999)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                    recentLimit === 9999
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  Semua
                </button>
              </div>

              {/* Search Filter */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari karyawan / sertifikat..."
                  value={searchRecent}
                  onChange={e => setSearchRecent(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-700/20 font-medium w-44 md:w-56"
                />
              </div>

              <button
                onClick={() => navigate('/organization?tab=certifications')}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-auto md:ml-0"
              >
                Buka Semua Sertifikat &rarr;
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] uppercase font-black text-slate-500">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3">Nama Pejabat / Karyawan</th>
                  <th className="p-3">Departemen</th>
                  <th className="p-3">Sertifikasi Dimiliki</th>
                  <th className="p-3 text-center">Status Masa Berlaku</th>
                  <th className="p-3 text-center">Aksi HSE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {(() => {
                  const filtered = hseData.criticalCertAlerts.filter(item => {
                    if (!searchRecent.trim()) return true;
                    const q = searchRecent.toLowerCase();
                    return (
                      (item.name || '').toLowerCase().includes(q) ||
                      (item.cert || '').toLowerCase().includes(q) ||
                      (item.dept || '').toLowerCase().includes(q) ||
                      (item.cert_number || '').toLowerCase().includes(q) ||
                      (item.nomor_pegawai || '').toLowerCase().includes(q)
                    );
                  });

                  const displayed = filtered.slice(0, recentLimit);

                  if (displayed.length === 0) {
                    return (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 font-medium italic">
                          Tidak ada data sertifikasi yang cocok.
                        </td>
                      </tr>
                    );
                  }

                  return displayed.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/70 transition">
                      <td className="p-3 text-center font-bold text-slate-400 text-[11px]">
                        {idx + 1}
                      </td>
                      <td className="p-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] flex items-center justify-center shrink-0">
                            {item.name ? item.name.charAt(0).toUpperCase() : 'K'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{item.name}</div>
                            {item.nomor_pegawai && item.nomor_pegawai !== '-' && (
                              <div className="text-[10px] font-mono text-slate-400">NIP: {item.nomor_pegawai}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-slate-600">
                        <div className="font-semibold text-slate-700">{item.dept}</div>
                        {item.jabatan && item.jabatan !== '-' && (
                          <div className="text-[10px] text-slate-400">{item.jabatan}</div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 text-xs">
                            {item.cert}
                          </span>
                          {item.cert_number && item.cert_number !== '-' && (
                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              No: {item.cert_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`font-bold px-2.5 py-0.5 rounded-full border text-xs ${
                          item.is_lifetime || item.expiry?.includes('Seumur Hidup')
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : item.status === 'Menunggu Verifikasi'
                            ? 'text-amber-700 bg-amber-50 border-amber-200'
                            : 'text-slate-700 bg-slate-50 border-slate-200'
                        }`}>
                          {item.expiry}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.file_url ? (
                          <button
                            type="button"
                            onClick={() => {
                              const userCerts = hseData.criticalCertAlerts.filter(c => c.name === item.name || c.id === item.id);
                              setPreviewDoc({ 
                                id: item.id,
                                url: item.file_url, 
                                name: `${item.name} - ${item.cert}`,
                                userCerts: userCerts,
                                karyawan: { nama_lengkap: item.name, nomor_pegawai: item.nomor_pegawai, departemen: item.dept, jabatan: item.jabatan },
                                nama_sertifikat: item.cert,
                                nomor_sertifikat: item.cert_number,
                                is_lifetime: item.is_lifetime,
                                tanggal_kadaluarsa: item.expiry
                              });
                            }}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition border border-emerald-200 flex items-center gap-1 mx-auto cursor-pointer"
                            title="Pratinjau Dokumen Sertifikat"
                          >
                            <Eye size={13} /> Lihat File
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => navigate('/organization?tab=certifications')}
                            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-medium transition border border-slate-200 mx-auto cursor-pointer"
                          >
                            Detail
                          </button>
                        )}
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FULL-PAGE IN-WEB PREVIEW MODAL */}
      {previewDoc && (
        <PdfViewerModal
          url={previewDoc?.url || previewDoc}
          fileName={previewDoc?.name || "Sertifikat K3 / Lisensi Karyawan"}
          allCertificates={previewDoc?.userCerts || (previewDoc ? [previewDoc] : [])}
          activeId={previewDoc?.id}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
};

export default HSEDashboard;
