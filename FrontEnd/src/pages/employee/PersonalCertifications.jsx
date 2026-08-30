import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Award, Plus, Upload, Trash2, ExternalLink, FileText, CheckCircle2, ShieldCheck, Calendar, Building, X, AlertCircle, Clock, Shield, UserCheck, Search, Filter, HelpCircle, ChevronRight, Download, Eye, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PdfViewerModal from '../../components/PdfViewerModal';

const PersonalCertifications = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [certs, setCerts] = useState([]);
  const [certTypes, setCertTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAddTypeModal, setShowAddTypeModal] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeCategory, setNewTypeCategory] = useState('K3/HSE');
  const [customCategory, setCustomCategory] = useState('');
  const [savingType, setSavingType] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'verified' | 'pending' | 'expiring'
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingHSECount, setPendingHSECount] = useState(0);
  const [certToDelete, setCertToDelete] = useState(null);
  const [deletingCert, setDeletingCert] = useState(false);

  const role = (user?.role || '').toLowerCase();
  const dept = (user?.department || user?.department_name || user?.departments?.name || '').toLowerCase();
  const jabatan = (user?.jabatan || '').toLowerCase();
  const username = (user?.username || '').toLowerCase();

  const isSuperAdmin = ['superadmin', 'super_admin', 'super admin'].includes(role);
  const isAdmin = ['admin', 'hrga_admin', 'hr', 'hse_admin'].includes(role) || (role.includes('admin') && !isSuperAdmin);
  const isHSEAdmin = role === 'hse_admin' || (
    isAdmin && (
      dept.includes('hse') || dept.includes('k3') || dept.includes('safety') || dept.includes('pengelola k3') ||
      jabatan.includes('hse') || jabatan.includes('k3') || jabatan.includes('safety') ||
      username.includes('hse')
    )
  );

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

  const handleCreateNewType = async (e) => {
    e.preventDefault();
    if (!newTypeName.trim()) {
      addToast('Nama jenis sertifikasi wajib diisi!', 'error');
      return;
    }
    const finalCategory = newTypeCategory === 'Lainnya' && customCategory.trim()
      ? customCategory.trim()
      : (newTypeCategory || 'K3/HSE');

    setSavingType(true);
    try {
      const res = await api.post('/hris/certificate-types', {
        name: newTypeName.trim(),
        category: finalCategory
      });
      const created = res.data;
      addToast(`Jenis sertifikasi "${created.name}" berhasil didaftarkan!`, 'success');
      setCertTypes(prev => [...prev.filter(t => t.id !== created.id), created]);
      setFormData(prev => ({ ...prev, nama_sertifikat: created.name }));
      setShowAddTypeModal(false);
      setNewTypeName('');
      setCustomCategory('');
      setNewTypeCategory('K3/HSE');
    } catch (err) {
      console.error('Create cert type error:', err);
      addToast(err.response?.data?.error || 'Gagal mendaftarkan jenis sertifikasi baru', 'error');
    } finally {
      setSavingType(false);
    }
  };

  const fetchMyCerts = async () => {
    setLoading(true);
    try {
      const [res, typesRes] = await Promise.all([
        api.get('/hris/certifications/my-certifications'),
        api.get('/hris/certificate-types').catch(() => ({ data: [] }))
      ]);
      setCerts(res.data || []);
      setCertTypes(typesRes.data || []);

      if (isHSEAdmin || isAdmin) {
        try {
          const allCertsRes = await api.get('/hris/certifications');
          const allC = allCertsRes.data || [];
          const pendingCount = allC.filter(c => (c.status === 'Pending' || c.notes?.includes('[STATUS:PENDING]')) && c.status !== 'Rejected').length;
          setPendingHSECount(pendingCount);
        } catch (e) {
          // ignore
        }
      }
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
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 15 * 1024 * 1024) {
        addToast('Ukuran file terlalu besar! Maksimal 15MB.', 'error');
        e.target.value = '';
        return;
      }
      setFormData(prev => ({ ...prev, file: selectedFile }));
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

  const confirmDeleteCert = async () => {
    if (!certToDelete) return;
    setDeletingCert(true);
    try {
      await api.delete(`/hris/certifications/${certToDelete.id}`);
      addToast(`Sertifikat "${certToDelete.nama_sertifikat || certToDelete.certificate_name || certToDelete.name}" berhasil dihapus.`, 'info');
      setCertToDelete(null);
      if (previewFile && previewFile.id === certToDelete.id) {
        setPreviewFile(null);
      }
      fetchMyCerts();
    } catch (err) {
      addToast('Gagal menghapus sertifikasi.', 'error');
    } finally {
      setDeletingCert(false);
    }
  };

  // Helper stats calculation
  const totalCerts = certs.length;
  const verifiedCerts = certs.filter(c => (c.status === 'Approved' || c.is_approved === true) && c.status !== 'Rejected' && c.status !== 'Pending' && (!c.expired_date || new Date(c.expired_date) >= new Date())).length;
  const pendingCerts = certs.filter(c => (c.status === 'Pending' || c.notes?.includes('[STATUS:PENDING]')) && c.status !== 'Rejected').length;
  const rejectedCerts = certs.filter(c => c.status === 'Rejected' || c.notes?.includes('[STATUS:REJECTED]')).length;
  const expiringCerts = certs.filter(c => {
    if (c.is_lifetime || !c.expired_date || c.status === 'Rejected' || c.status === 'Pending') return false;
    const diffDays = (new Date(c.expired_date) - new Date()) / (1000 * 60 * 60 * 24);
    return diffDays <= 60 && diffDays >= 0;
  }).length;

  const handleReUpload = (cert) => {
    setFormData({
      nama_sertifikat: cert.nama_sertifikat || cert.certificate_name || '',
      organisasi_penerbit: cert.institusi_penerbit || cert.organisasi_penerbit || '',
      issue_date: cert.issue_date || cert.tanggal_diterbitkan || '',
      expired_date: cert.expired_date || cert.tanggal_kadaluarsa || '',
      is_lifetime: Boolean(cert.is_lifetime),
      certificate_number: cert.certificate_number || cert.nomor_sertifikat || '',
      credential_url: cert.credential_url || '',
      notes: '',
      file: null
    });
    setShowModal(true);
  };

  // Filtered List
  const filteredCerts = certs.filter(c => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (c.nama_sertifikat || c.certificate_name || '').toLowerCase().includes(term) ||
                          (c.organisasi_penerbit || c.institusi_penerbit || '').toLowerCase().includes(term) ||
                          (c.certificate_number || '').toLowerCase().includes(term);
    if (!matchesSearch) return false;

    if (filterTab === 'verified') {
      return (c.status === 'Approved' || c.is_approved === true) && c.status !== 'Rejected' && c.status !== 'Pending' && (!c.expired_date || new Date(c.expired_date) >= new Date());
    }
    if (filterTab === 'pending') {
      return (c.status === 'Pending' || c.notes?.includes('[STATUS:PENDING]')) && c.status !== 'Rejected';
    }
    if (filterTab === 'rejected') {
      return c.status === 'Rejected' || c.notes?.includes('[STATUS:REJECTED]');
    }
    if (filterTab === 'expiring') {
      if (c.is_lifetime || !c.expired_date || c.status === 'Rejected' || c.status === 'Pending') return false;
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

      {/* 1.5 HSE Admin Banner - Direct Access to Pending Employee Verifications */}
      {(isHSEAdmin || isAdmin) && (
        <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 text-white rounded-3xl p-5 shadow-lg border border-red-800/40 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Panel Verifikasi K3 (Admin HSE)</h3>
                {pendingHSECount > 0 ? (
                  <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full animate-pulse">
                    {pendingHSECount} Menunggu Verifikasi
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-black rounded-full">
                    Semua Terverifikasi
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Halaman ini menampilkan <strong>portofolio sertifikasi pribadi Anda</strong>. Untuk memverifikasi berkas sertifikat yang diajukan oleh karyawan lain, buka tab <strong>Permohonan Sertifikat User</strong> di Matriks HSE.
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/organization?tab=certifications')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black rounded-xl shadow-md transition-all shrink-0 cursor-pointer"
          >
            Buka Matriks & Permohonan HSE <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* 2. Employee Profile Context Card - WHITE WITH SOFT ROSE GRADIENT */}
      <div className="bg-gradient-to-r from-white via-rose-50/70 to-red-50/60 rounded-3xl p-6 text-slate-900 shadow-sm border border-rose-200/80 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-red-600/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        
        <div className="flex items-center gap-4.5 z-10 w-full md:w-auto">
          <div className="w-14 h-14 min-w-[56px] rounded-full bg-gradient-to-tr from-red-800 to-rose-600 border-2 border-white text-white font-black text-lg flex items-center justify-center shrink-0 aspect-square shadow-md shadow-red-900/20">
            {(user?.nama || user?.nama_lengkap || user?.username || 'US').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900">{user?.nama || user?.nama_lengkap || user?.username}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-200 shadow-2xs">
                {user?.status_karyawan || 'Aktif'}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              {user?.jabatan || 'Staff Operasional'} • <span className="text-red-700 font-bold">{user?.department || user?.division || 'Operasional Site'}</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono mt-1">
              Nomor Pegawai: <strong className="text-slate-800 font-bold">{user?.nomor_pegawai || 'EMP-DGN'}</strong> • NIK: {user?.nik || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 w-full md:w-auto justify-end">
          <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-rose-100/90 shadow-2xs text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Roster Kerja</span>
            <span className="text-sm font-black text-slate-900">{user?.roster_type || '8/2 (Site BIB)'}</span>
          </div>
          <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-rose-100/90 shadow-2xs text-center">
            <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Penempatan</span>
            <span className="text-sm font-black text-red-700">{user?.penempatan || 'Site BIB'}</span>
          </div>
        </div>
      </div>

      {/* 3. Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filterTab === 'all' ? 'bg-red-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Semua ({totalCerts})
          </button>
          <button
            onClick={() => setFilterTab('verified')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filterTab === 'verified' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Terverifikasi ({verifiedCerts})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filterTab === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Menunggu Verifikasi ({pendingCerts})
          </button>
          <button
            onClick={() => setFilterTab('rejected')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filterTab === 'rejected' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Ditolak ({rejectedCerts})
          </button>
          <button
            onClick={() => setFilterTab('expiring')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${filterTab === 'expiring' ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Mendekati Kedaluwarsa ({expiringCerts})
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
              const isRejected = cert.status === 'Rejected' || cert.notes?.includes('[STATUS:REJECTED]');
              const isPending = (cert.status === 'Pending' || cert.notes?.includes('[STATUS:PENDING]')) && !isRejected;

              // Expiry calculation
              let isExpiringSoon = false;
              let isExpired = false;
              let daysLeft = null;
              if (!isLifetime && cert.expired_date && !isRejected && !isPending) {
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
                      {isRejected ? (
                        <span className="px-3 py-1 bg-rose-50 text-rose-800 border border-rose-300 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 shadow-2xs">
                          <X size={12} className="text-rose-600" /> Ditolak. Silahkan unggah kembali
                        </span>
                      ) : isPending ? (
                        <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-full text-[10px] font-black inline-flex items-center gap-1.5 shadow-2xs">
                          <Clock size={12} className="text-amber-600" /> Menunggu Verifikasi HSE
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

                    {/* Rejection Notes / Reason */}
                    {isRejected && cert.notes && (
                      <div className="mt-3 p-3 bg-rose-50/90 border border-rose-200 rounded-2xl text-[11px] text-rose-900 space-y-1">
                        <div className="flex items-center gap-1.5 font-black text-rose-800">
                          <AlertCircle size={13} className="text-rose-600 shrink-0" />
                          <span>Catatan / Alasan Penolakan HSE:</span>
                        </div>
                        <p className="text-slate-700 pl-4 font-medium">{cert.notes}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cert.file_url ? (
                        <button
                          type="button"
                          onClick={() => setPreviewFile({ id: cert.id, url: cert.file_url, name: certName })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-900 text-xs font-bold rounded-xl transition-colors border border-red-200 cursor-pointer shadow-2xs"
                        >
                          <Eye size={13} /> Lihat Berkas Sertifikat
                        </button>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                          Kosong
                        </span>
                      )}

                      {isRejected && (
                        <button
                          type="button"
                          onClick={() => handleReUpload(cert)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <Upload size={13} /> Unggah Kembali
                        </button>
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
                      onClick={() => setCertToDelete(cert)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title="Hapus Sertifikat Ini"
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

      {/* 7. Keterangan & Legenda Sertifikasi Kompetensi K3 */}
      <div className="mt-8 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm animate-in fade-in">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-red-900 flex items-center justify-center font-bold">
              <Award size={18} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">Keterangan & Legenda Sertifikasi Resmi K3</h3>
              <p className="text-[11px] text-slate-400 font-medium">Standar lisensi & kompetensi operasional PT DEA GLOBAL NIAGA</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddTypeModal(true)}
            className="px-3.5 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-900 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={13} /> Tambah Jenis Sertifikasi Baru
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[
            { code: 'POP', name: 'Pengawas Operasional Pertama', color: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
            { code: 'POM', name: 'Pengawas Operasional Madya', color: 'bg-cyan-50 text-cyan-700 border-cyan-300' },
            { code: 'POU', name: 'Pengawas Operasional Utama', color: 'bg-indigo-50 text-indigo-700 border-indigo-300' },
            { code: 'AK3U', name: 'Ahli K3 Umum (Kemnaker/BNSP)', color: 'bg-red-50 text-red-700 border-red-300' },
            { code: 'AK3 Listrik', name: 'Ahli K3 Spesialis Listrik', color: 'bg-amber-50 text-amber-700 border-amber-300' },
            { code: 'Teknisi Listrik', name: 'Teknisi K3 Listrik & Daya', color: 'bg-orange-50 text-orange-700 border-orange-300' },
            { code: 'CSMS', name: 'Contractor Safety Management', color: 'bg-purple-50 text-purple-700 border-purple-300' },
            { code: 'SMKP', name: 'SMKP Minerba Audit', color: 'bg-rose-50 text-rose-700 border-rose-300' },
            { code: 'WAH / TKPK', name: 'Working at Height / Ketinggian', color: 'bg-sky-50 text-sky-700 border-sky-300' },
            { code: 'P3K / First Aid', name: 'Pertolongan Pertama (P3K)', color: 'bg-green-50 text-green-700 border-green-300' },
            { code: 'LOTOTO', name: 'Lock Out Tag Out Try Out', color: 'bg-violet-50 text-violet-700 border-violet-300' },
            { code: 'Pilot Drone', name: 'Sertifikasi Pilot Drone', color: 'bg-slate-50 text-slate-700 border-slate-300' },
            { code: 'Fiber Optic (FO)', name: 'Instalasi & Splicing FO', color: 'bg-blue-50 text-blue-700 border-blue-300' },
            { code: 'MTCNA/MTCRE', name: 'MikroTik Certified Network', color: 'bg-teal-50 text-teal-700 border-teal-300' },
            { code: 'Ubiquiti', name: 'Ubiquiti Enterprise Wireless', color: 'bg-blue-50 text-blue-700 border-blue-300' },
            { code: 'Doc Control', name: 'Document Control Administrasi', color: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-300' },
          ].map((item, idx) => (
            <div key={idx} className="p-3 bg-slate-50/70 rounded-2xl border border-slate-100 flex flex-col gap-1 hover:bg-slate-50 transition">
              <div className="flex items-center justify-between">
                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${item.color}`}>
                  {item.code}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-800 line-clamp-1">{item.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 8. LinkedIn-Style Add Modal (Portaled to body) */}
      {showModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-900 flex items-center justify-center">
                  <Award size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">Tambah Lisensi & Sertifikasi Pribadi</h2>
                  <p className="text-[10px] text-slate-400 font-medium">Unggah berkas untuk diverifikasi secara resmi oleh tim HSE</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-700 font-bold">
                      Nama Sertifikasi / Lisensi <span className="text-red-600">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddTypeModal(true)}
                      className="text-[10px] text-red-700 hover:text-red-800 font-black flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={12} /> Tambah Jenis Baru
                    </button>
                  </div>
                  <input
                    type="text"
                    list="personalCertTypesList"
                    required
                    placeholder="Pilih atau ketik: POP, POM, WAH, AK3U, CSMS..."
                    value={formData.nama_sertifikat}
                    onChange={(e) => setFormData(prev => ({ ...prev, nama_sertifikat: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none text-xs font-bold"
                  />
                  <datalist id="personalCertTypesList">
                    {certTypes.map(c => <option key={c.id} value={c.name} />)}
                    <option value="Pengawas Operasional Pertama (POP)" />
                    <option value="Pengawas Operasional Madya (POM)" />
                    <option value="Working at Height (WAH)" />
                    <option value="Ahli K3 Umum (AK3U)" />
                    <option value="Contractor Safety Management System (CSMS)" />
                    <option value="Ahli K3 Listrik" />
                    <option value="Teknisi Listrik" />
                    <option value="First Aid / P3K" />
                    <option value="SMKP Minerba" />
                    <option value="Pilot Drone" />
                    <option value="Lock Out Tag Out Try Out (LOTOTO)" />
                    <option value="Fiber Optic (FO)" />
                    <option value="MikroTik Certified Network Associate (MTCNA)" />
                    <option value="Ubiquiti Certified" />
                    <option value="Document Control" />
                  </datalist>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
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

              <div>
                <label className="block text-slate-700 font-bold mb-1">Catatan / Keterangan Kompetensi (Opsional)</label>
                <textarea
                  rows="2"
                  placeholder="Keterangan singkat mengenai keahlian atau kompetensi lisensi..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20"
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
        </div>,
        document.body
      )}

      {/* 9. Modal Tambah Jenis Sertifikasi Baru */}
      {showAddTypeModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Award size={18} className="text-red-700" /> Tambah Jenis Sertifikasi Baru
              </h3>
              <button onClick={() => setShowAddTypeModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewType} className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Nama Jenis Sertifikasi *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahli K3 Kimia / Welder 6G"
                  value={newTypeName}
                  onChange={e => setNewTypeName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-900/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Kategori / Bidang</label>
                <select
                  value={newTypeCategory}
                  onChange={e => setNewTypeCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-900/20 cursor-pointer"
                >
                  <option value="K3/HSE">K3 / HSE (Keselamatan Kerja)</option>
                  <option value="Teknis & Operasional">Teknis & Operasional</option>
                  <option value="IT & Jaringan">IT & Jaringan</option>
                  <option value="Manajemen & Administrasi">Manajemen & Administrasi</option>
                  <option value="Lingkungan Hidup (LH)">Lingkungan Hidup (LH)</option>
                  <option value="Geologi & Eksplorasi">Geologi & Eksplorasi</option>
                  <option value="Logistik & Supply Chain">Logistik & Supply Chain</option>
                  <option value="Legalitas & Kepatuhan">Legalitas & Kepatuhan</option>
                  <option value="Lainnya">+ Tulis Kategori Kustom Baru...</option>
                </select>
              </div>

              {newTypeCategory === 'Lainnya' && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-150">
                  <label className="block text-slate-700 font-bold mb-1">Tulis Kategori Baru <span className="text-red-600">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Keuangan, HRGA, Mining HSE, dll"
                    value={customCategory}
                    onChange={e => setCustomCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-900/20"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddTypeModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingType}
                  className="px-5 py-2 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus size={14} /> {savingType ? 'Mendaftarkan...' : 'Daftarkan Jenis Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* 10. PDF / Image Viewer Modal */}
      {previewFile && (
        <PdfViewerModal
          url={previewFile?.url || previewFile}
          fileName={previewFile?.name || 'Dokumen Sertifikat'}
          allCertificates={certs}
          activeId={previewFile?.id}
          onClose={() => setPreviewFile(null)}
          onDelete={(doc) => setCertToDelete({
            id: doc.id,
            nama_sertifikat: doc.title || doc.nama_sertifikat,
            certificate_number: doc.certNumber,
            organisasi_penerbit: doc.issuer,
            expired_date: doc.expiry,
            is_lifetime: doc.isLifetime
          })}
        />
      )}

      {/* 11. Modal Konfirmasi Hapus Sertifikat Spesifik */}
      {certToDelete && createPortal(
        <div className="fixed inset-0 z-[999999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Hapus Sertifikat Ini?</h3>
                <p className="text-xs text-slate-500">Konfirmasi penghapusan sertifikat spesifik</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mb-4">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Nama Sertifikat</span>
                <p className="text-xs font-bold text-red-700">{certToDelete.nama_sertifikat || certToDelete.certificate_name || certToDelete.name}</p>
              </div>
              {(certToDelete.certificate_number || certToDelete.nomor_sertifikat) && (
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Nomor Registrasi</span>
                  <p className="text-xs font-mono font-bold text-slate-700">{certToDelete.certificate_number || certToDelete.nomor_sertifikat}</p>
                </div>
              )}
            </div>

            <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 mb-5 text-[11px] text-amber-900 leading-relaxed">
              ⚠️ <strong>Catatan:</strong> Hanya sertifikat di atas yang akan dihapus. Sertifikat Anda yang lain tetap tersimpan dengan aman.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCertToDelete(null)}
                disabled={deletingCert}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteCert}
                disabled={deletingCert}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
              >
                {deletingCert ? 'Menghapus...' : 'Hapus Sertifikat Ini Saja'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default PersonalCertifications;
