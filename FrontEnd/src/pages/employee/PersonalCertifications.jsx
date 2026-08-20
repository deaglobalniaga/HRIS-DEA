import React, { useState, useEffect, useRef } from 'react';
import { Award, Plus, Upload, Trash2, ExternalLink, FileText, CheckCircle2, ShieldCheck, Calendar, Building, X, AlertCircle, Clock, Shield, UserCheck, Search, Filter, HelpCircle, ChevronRight, Download } from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const PersonalCertifications = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'verified' | 'pending' | 'expiring'
  const [searchQuery, setSearchQuery] = useState('');

  // LinkedIn Style Form Fields
  const [formData, setFormData] = useState({
    nama_sertifikat: '',
    organisasi_penerbit: '',
    issue_date: '',
    expired_date: '',
    is_lifetime: false,
    certificate_number: '',
    credential_url: '',
    notes: '',
    file: null
  });

  const fileInputRef = useRef(null);

  const fetchMyCerts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/hris/certifications/my-certifications');
      setCerts(res.data || []);
    } catch (err) {
      console.error('Fetch my certs error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyCerts();
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, file: e.target.files[0] }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nama_sertifikat.trim() || !formData.organisasi_penerbit.trim()) {
      addToast('Nama Sertifikasi dan Lembaga Penerbit wajib diisi.', 'error');
      return;
    }
    if (!formData.issue_date) {
      addToast('Tanggal penerbitan sertifikat wajib diisi.', 'error');
      return;
    }
    if (!formData.is_lifetime && !formData.expired_date) {
      addToast('Tanggal kedaluwarsa sertifikat wajib diisi.', 'error');
      return;
    }
    if (!formData.certificate_number.trim()) {
      addToast('Nomor Registrasi / ID Kredensial sertifikat wajib diisi.', 'error');
      return;
    }
    if (!formData.file) {
      addToast('Dokumen fisik sertifikat (PDF / Gambar) wajib diunggah.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('nama_sertifikat', formData.nama_sertifikat);
      data.append('organisasi_penerbit', formData.organisasi_penerbit);
      data.append('certificate_number', formData.certificate_number);
      data.append('credential_url', formData.credential_url);
      data.append('is_lifetime', formData.is_lifetime);
      if (formData.issue_date) data.append('issue_date', formData.issue_date);
      if (!formData.is_lifetime && formData.expired_date) data.append('expired_date', formData.expired_date);
      if (formData.notes) data.append('notes', formData.notes);
      if (formData.file) data.append('file', formData.file);

      await api.post('/hris/certifications/my-certifications', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      addToast('Lisensi & Sertifikasi berhasil diajukan untuk verifikasi HSE!', 'success');
      setShowModal(false);
      setFormData({
        nama_sertifikat: '',
        organisasi_penerbit: '',
        issue_date: '',
        expired_date: '',
        is_lifetime: false,
        certificate_number: '',
        credential_url: '',
        notes: '',
        file: null
      });
      fetchMyCerts();
    } catch (err) {
      console.error('Submit cert error:', err);
      addToast(err.response?.data?.error || 'Gagal menyimpan sertifikasi.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus data sertifikat ini?')) return;
    try {
      await api.delete(`/hris/certifications/${id}`);
      addToast('Sertifikasi berhasil dihapus.', 'info');
      fetchMyCerts();
    } catch (err) {
      addToast('Gagal menghapus sertifikasi.', 'error');
    }
  };

  // Helper stats calculation
  const totalCerts = certs.length;
  const verifiedCerts = certs.filter(c => c.is_approved !== false && c.status !== 'Rejected' && (!c.expired_date || new Date(c.expired_date) >= new Date())).length;
  const pendingCerts = certs.filter(c => c.status === 'Pending' || c.is_approved === false).length;
  const expiringCerts = certs.filter(c => {
    if (c.is_lifetime || !c.expired_date) return false;
    const diffDays = (new Date(c.expired_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diffDays <= 60 && diffDays >= 0;
  }).length;

  // Filtered List
  const filteredCerts = certs.filter(c => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (c.nama_sertifikat || c.certificate_name || '').toLowerCase().includes(term) ||
                          (c.organisasi_penerbit || c.institusi_penerbit || '').toLowerCase().includes(term) ||
                          (c.certificate_number || '').toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (filterTab === 'verified') {
      return c.is_approved !== false && c.status !== 'Rejected' && (!c.expired_date || new Date(c.expired_date) >= new Date());
    }
    if (filterTab === 'pending') {
      return c.status === 'Pending' || c.is_approved === false;
    }
    if (filterTab === 'expiring') {
      if (c.is_lifetime || !c.expired_date) return false;
      const diffDays = (new Date(c.expired_date) - new Date()) / (1000 * 60 * 60 * 24);
      return diffDays <= 60 && diffDays >= 0;
    }
    return true;
  });

  return (
    <div className="w-full flex flex-col gap-6 font-sans pb-32 lg:pb-16">
      
      {/* 1. Header & Quick Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 min-w-[56px] rounded-2xl bg-gradient-to-tr from-red-900 to-rose-700 text-white flex items-center justify-center shadow-md shadow-red-900/20 shrink-0 aspect-square">
            <Award size={30} />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Sertifikasi & Kualifikasi Saya
              </h1>
              <span className="px-3 py-1 bg-red-50 text-red-900 border border-red-200 text-xs font-black rounded-full uppercase">
                Portofolio Kompetensi
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Kelola berkas lisensi K3, sertifikasi kompetensi, dan izin operasional resmi Anda di PT DEA GLOBAL NIAGA.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-900 hover:to-rose-800 text-white text-xs font-black rounded-2xl shadow-md shadow-red-900/25 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          <Plus size={18} /> Tambah Sertifikat Baru
        </button>
      </div>

      {/* 2. Employee Profile Context Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex items-center gap-4.5 z-10 w-full md:w-auto">
          <div className="w-14 h-14 min-w-[56px] rounded-full bg-white/10 border-2 border-white/20 text-white font-black text-lg flex items-center justify-center shrink-0 aspect-square shadow-inner">
            {(user?.nama || user?.nama_lengkap || user?.username || 'US').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-white">{user?.nama || user?.nama_lengkap || user?.username}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {user?.status_karyawan || 'Aktif'}
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              {user?.jabatan || 'Staff Operasional'} • <span className="text-rose-300">{user?.department || user?.division || 'Operasional Site'}</span>
            </p>
            <p className="text-[11px] text-slate-400 font-mono mt-1">
              Nomor Pegawai: <strong className="text-white">{user?.nomor_pegawai || 'EMP-DGN'}</strong> • NIK: {user?.nik || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-end">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-300 font-bold">Roster Kerja</span>
            <span className="text-sm font-black text-white">{user?.roster_type || '8/2 (Site BIB)'}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-300 font-bold">Penempatan</span>
            <span className="text-sm font-black text-rose-300">{user?.penempatan || 'Site BIB'}</span>
          </div>
        </div>
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Certs */}
        <div 
          onClick={() => setFilterTab('all')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${filterTab === 'all' ? 'bg-white border-red-900 shadow-md ring-2 ring-red-900/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Total Sertifikat</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <Award size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCerts}</div>
          <span className="text-[10px] font-bold text-slate-400 mt-1 block">Tercatat dalam profil</span>
        </div>

        {/* Verified & Active */}
        <div 
          onClick={() => setFilterTab('verified')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${filterTab === 'verified' ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-600/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Terverifikasi Aktif</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-700">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">{verifiedCerts}</div>
          <span className="text-[10px] font-bold text-emerald-600 mt-1 block">Disetujui Tim HSE</span>
        </div>

        {/* Expiring Soon */}
        <div 
          onClick={() => setFilterTab('expiring')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${filterTab === 'expiring' ? 'bg-white border-amber-500 shadow-md ring-2 ring-amber-500/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Mendekati Kedaluwarsa</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-700">
              <Clock size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">{expiringCerts}</div>
          <span className="text-[10px] font-bold text-amber-600 mt-1 block">&lt; 60 hari tersisa</span>
        </div>

        {/* Pending Verification */}
        <div 
          onClick={() => setFilterTab('pending')}
          className={`p-5 rounded-3xl border transition-all cursor-pointer ${filterTab === 'pending' ? 'bg-white border-blue-600 shadow-md ring-2 ring-blue-600/10' : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'}`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-500">Menunggu Verifikasi</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700">
              <Shield size={18} />
            </div>
          </div>
          <div className="text-2xl font-black text-blue-700">{pendingCerts}</div>
          <span className="text-[10px] font-bold text-blue-600 mt-1 block">Dalam proses review</span>
        </div>
      </div>

      {/* 4. HSE Compliance Info Box */}
      <div className="bg-gradient-to-r from-red-50 to-orange-50/50 border border-red-200/80 rounded-3xl p-5 flex items-start gap-4 shadow-2xs">
        <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-900 flex items-center justify-center shrink-0 mt-0.5">
          <HelpCircle size={22} />
        </div>
        <div className="flex-1 text-xs">
          <h3 className="font-black text-red-950 text-sm">Ketentuan Verifikasi & Standar Lisensi K3</h3>
          <p className="text-red-900/80 font-medium mt-1 leading-relaxed">
            Seluruh berkas sertifikat yang Anda unggah otomatis terhubung ke <strong>Matriks Sertifikasi HSE</strong> untuk diperiksa keasliannya oleh HSE Compliance Officer sebelum diverifikasi sebagai syarat operasional di site pertambangan.
          </p>
        </div>
      </div>

      {/* 5. Filters & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterTab === 'all' ? 'bg-red-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Semua ({totalCerts})
          </button>
          <button
            onClick={() => setFilterTab('verified')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterTab === 'verified' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Terverifikasi ({verifiedCerts})
          </button>
          <button
            onClick={() => setFilterTab('expiring')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterTab === 'expiring' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Mendekati Kedaluwarsa ({expiringCerts})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${filterTab === 'pending' ? 'bg-blue-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Menunggu Verifikasi ({pendingCerts})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama sertifikat / penerbit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all"
          />
        </div>
      </div>

      {/* 6. List of Certifications */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs">
            <div className="w-10 h-10 border-4 border-red-900 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-xs font-bold text-slate-500">Memuat portofolio sertifikasi Anda...</p>
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="p-16 text-center bg-white rounded-3xl border border-slate-200 shadow-2xs space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <Award size={32} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-800">Tidak Ada Sertifikat yang Sesuai</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                {searchQuery ? 'Tidak ada sertifikat yang cocok dengan kata kunci pencarian Anda.' : 'Belum ada sertifikat tercatat. Silakan tambahkan sertifikat keahlian K3, lisensi profesi, atau sertifikasi kompetensi Anda.'}
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-900 hover:bg-red-950 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus size={16} /> Tambah Sertifikat Sekarang
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCerts.map((cert) => {
              const certName = cert.nama_sertifikat || cert.certificate_name || 'Sertifikat Kompetensi';
              const issuer = cert.institusi_penerbit || cert.organisasi_penerbit || 'Lembaga Resmi';
              const isLifetime = cert.is_lifetime;
              const issueDateStr = cert.issue_date ? new Date(cert.issue_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
              const expDateStr = cert.expired_date ? new Date(cert.expired_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : null;
              const credId = cert.certificate_number || '-';
              const isPending = cert.status === 'Pending' || cert.is_approved === false;
              const isRejected = cert.status === 'Rejected';

              // Expiry calculation
              let isExpiringSoon = false;
              let isExpired = false;
              let daysLeft = null;
              if (!isLifetime && cert.expired_date) {
                daysLeft = Math.ceil((new Date(cert.expired_date) - new Date()) / (1000 * 60 * 60 * 24));
                if (daysLeft < 0) isExpired = true;
                else if (daysLeft <= 60) isExpiringSoon = true;
              }

              return (
                <div
                  key={cert.id}
                  className="p-5 bg-white rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-4 group relative"
                >
                  <div>
                    {/* Top Row: Verification & Expiry Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      {isPending ? (
                        <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 shadow-2xs">
                          <Clock size={12} className="text-amber-600" /> Menunggu Verifikasi HSE
                        </span>
                      ) : isRejected ? (
                        <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-300 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 shadow-2xs">
                          <X size={12} className="text-rose-600" /> Ditolak HSE
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 shadow-2xs">
                          <CheckCircle2 size={12} className="text-emerald-600" /> Terverifikasi & Aktif
                        </span>
                      )}

                      {isExpired ? (
                        <span className="px-2.5 py-0.5 bg-red-100 text-red-800 text-[10px] font-black rounded-lg">
                          Kedaluwarsa
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-black rounded-lg animate-pulse">
                          Sisa {daysLeft} Hari
                        </span>
                      ) : isLifetime ? (
                        <span className="px-2.5 py-0.5 bg-teal-50 text-teal-700 border border-teal-200 text-[10px] font-black rounded-lg">
                          Seumur Hidup
                        </span>
                      ) : null}
                    </div>

                    {/* Certificate Name & Issuer */}
                    <h3 className="text-sm font-black text-slate-900 leading-snug group-hover:text-red-900 transition-colors">
                      {certName}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600 mt-1">
                      <Building size={13} className="text-slate-400" />
                      <span>{issuer}</span>
                    </div>

                    {/* Meta Details */}
                    <div className="bg-slate-50/80 rounded-2xl p-3 border border-slate-100 mt-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium">ID Kredensial / No. Reg:</span>
                        <strong className="font-mono text-slate-800 text-[11px]">{credId}</strong>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium">Diterbitkan:</span>
                        <span className="font-bold text-slate-700 text-[11px]">{issueDateStr || '-'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="text-[11px] font-medium">Masa Berlaku:</span>
                        <span className={`font-bold text-[11px] ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-700' : 'text-slate-700'}`}>
                          {isLifetime ? 'Seumur Hidup' : (expDateStr || '-')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <div className="flex items-center gap-2">
                      {cert.file_url ? (
                        <a
                          href={cert.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold rounded-xl transition-colors border border-red-200"
                        >
                          <FileText size={14} /> Lihat Berkas Sertifikat
                        </a>
                      ) : (
                        <span className="text-[11px] font-medium text-slate-400">Tidak ada berkas</span>
                      )}

                      {cert.credential_url && (
                        <a
                          href={cert.credential_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Buka Verifikasi Online"
                        >
                          <ExternalLink size={15} />
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(cert.id)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title="Hapus Sertifikat"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. LinkedIn-Style Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-900 flex items-center justify-center">
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Tambah Lisensi & Sertifikasi</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Unggah berkas untuk diverifikasi oleh tim HSE</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Nama Sertifikasi / Lisensi <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Working at Height (WAH) Level 2 / POP Pertambangan"
                  value={formData.nama_sertifikat}
                  onChange={(e) => setFormData(prev => ({ ...prev, nama_sertifikat: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Organisasi / Lembaga Penerbit <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BNSP / Kemnaker RI / ESDM"
                  value={formData.organisasi_penerbit}
                  onChange={(e) => setFormData(prev => ({ ...prev, organisasi_penerbit: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-bold"
                />
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <input
                  type="checkbox"
                  id="is_lifetime"
                  checked={formData.is_lifetime}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_lifetime: e.target.checked }))}
                  className="w-4 h-4 text-red-900 rounded focus:ring-red-900"
                />
                <label htmlFor="is_lifetime" className="text-xs font-bold text-slate-700 cursor-pointer">
                  Lisensi ini berlaku Seumur Hidup (Tanpa tanggal kedaluwarsa)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Tanggal Penerbitan <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-bold"
                  />
                </div>
                {!formData.is_lifetime && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">
                      Tanggal Kedaluwarsa <span className="text-red-600">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.expired_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expired_date: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-bold"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  ID Kredensial / No. Registrasi <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: K3-WAH-2026-00912"
                  value={formData.certificate_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, certificate_number: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">URL Kredensial (Verifikasi Online jika ada)</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.credential_url}
                  onChange={(e) => setFormData(prev => ({ ...prev, credential_url: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Unggah Dokumen Sertifikat (PDF / Gambar) <span className="text-red-600">*</span>
                </label>
                <input
                  type="file"
                  required
                  ref={fileInputRef}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-900 hover:file:bg-red-100 border border-slate-200 rounded-2xl p-1.5 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-bold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-800 to-rose-700 hover:from-red-900 hover:to-rose-800 disabled:opacity-50 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  {submitting ? 'Menyimpan...' : 'Simpan & Ajukan Sertifikat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalCertifications;
