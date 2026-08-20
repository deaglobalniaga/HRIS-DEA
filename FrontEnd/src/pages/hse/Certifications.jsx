import React, { useState, useEffect, useRef } from 'react';
import { 
    Award, Upload, Trash2, Search, FileText, Plus, Eye, CheckCircle2, 
    AlertTriangle, X, RefreshCw, Filter, ShieldCheck, Download
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PdfViewerModal from '../../components/PdfViewerModal';

const Certifications = ({ preSelectedUser = null, uploadTrigger = 0 }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const role = (user?.role || '').toLowerCase();
    const canManage = ['admin', 'superadmin', 'super_admin'].includes(role);

    const [certifications, setCertifications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [certTypes, setCertTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [previewDoc, setPreviewDoc] = useState(null);
    const [uploading, setUploading] = useState(false);
    
    const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'pending'
    const [actionLoading, setActionLoading] = useState(null);
    
    // Form state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [namaSertifikat, setNamaSertifikat] = useState('');
    const [certNumber, setCertNumber] = useState('');
    const [institusi, setInstitusi] = useState('');
    const [tglTerbit, setTglTerbit] = useState('');
    const [tglExpired, setTglExpired] = useState('');
    const [isLifetime, setIsLifetime] = useState(false);
    const [file, setFile] = useState(null);

    const fileInputRef = useRef();

    useEffect(() => {
        if (preSelectedUser) {
            setSelectedUserId(preSelectedUser.id || preSelectedUser._id);
        }
    }, [preSelectedUser]);

    useEffect(() => {
        if (uploadTrigger > 0) {
            setSelectedUserId('');
            setShowUploadModal(true);
        }
    }, [uploadTrigger]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [certRes, empRes, typesRes] = await Promise.all([
                api.get('/hris/certifications'),
                api.get('/hris/employees'),
                api.get('/hris/certificate-types').catch(() => ({ data: [] }))
            ]);
            setCertifications(certRes.data || []);
            setEmployees(empRes.data || []);
            setCertTypes(typesRes.data || []);
        } catch (err) {
            console.error('Failed to fetch certifications', err);
            addToast('Gagal memuat data sertifikasi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedUserId) {
            addToast('Pilih karyawan terlebih dahulu', 'error');
            return;
        }
        if (!namaSertifikat) {
            addToast('Pilih atau isi nama sertifikasi', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('user_id', selectedUserId);
        formData.append('nama_sertifikat', namaSertifikat);
        formData.append('nomor_sertifikat', certNumber || `CERT-${Date.now().toString().slice(-6)}`);
        formData.append('institusi_penerbit', institusi || 'Lembaga Resmi K3');
        formData.append('tanggal_diterbitkan', tglTerbit || new Date().toISOString().split('T')[0]);
        formData.append('is_lifetime', isLifetime ? 'true' : 'false');
        if (!isLifetime && tglExpired) {
            formData.append('tanggal_kadaluarsa', tglExpired);
        }
        if (file) {
            formData.append('file', file);
            formData.append('attachments', file);
        }

        try {
            await api.post('/hris/certifications', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            addToast('Sertifikat K3 berhasil disimpan & diunggah!', 'success');
            setShowUploadModal(false);
            resetForm();
            fetchData();
        } catch (err) {
            console.error(err);
            addToast(err.response?.data?.error || err.response?.data?.message || 'Gagal mengupload sertifikat', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Yakin ingin menghapus sertifikat ini?')) return;
        try {
            await api.delete(`/hris/certifications/${id}`);
            addToast('Sertifikat berhasil dihapus', 'success');
            fetchData();
        } catch (err) {
            console.error(err);
            addToast('Gagal menghapus sertifikat', 'error');
        }
    };

    const handleApprove = async (certId) => {
        setActionLoading(certId);
        try {
            await api.patch(`/hris/certifications/${certId}/approve`);
            addToast('Sertifikat berhasil disetujui & diverifikasi oleh HSE.', 'success');
            fetchData();
        } catch (err) {
            console.error(err);
            addToast('Gagal menyetujui sertifikat', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (certId) => {
        const reason = window.prompt ? window.prompt('Alasan penolakan sertifikat (opsional):') : '';
        setActionLoading(certId);
        try {
            await api.patch(`/hris/certifications/${certId}/reject`, { reason });
            addToast('Permohonan sertifikat telah ditolak.', 'info');
            fetchData();
        } catch (err) {
            console.error(err);
            addToast('Gagal menolak sertifikat', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const resetForm = () => {
        if (!preSelectedUser) setSelectedUserId('');
        setNamaSertifikat('');
        setCertNumber('');
        setInstitusi('');
        setTglTerbit('');
        setTglExpired('');
        setIsLifetime(false);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusIndicator = (cert) => {
        if (cert.status === 'Pending' || cert.is_approved === false) {
            return { color: 'bg-amber-100 text-amber-800 border-amber-300', text: 'Menunggu Verifikasi HSE' };
        }
        if (cert.status === 'Rejected') {
            return { color: 'bg-rose-100 text-rose-800 border-rose-300', text: 'Ditolak HSE' };
        }
        if (cert.is_lifetime || !cert.tanggal_kadaluarsa) {
            return { color: 'bg-green-100 text-green-800 border-green-300', text: 'Seumur Hidup' };
        }
        const expiredDate = new Date(cert.tanggal_kadaluarsa);
        const today = new Date();
        const diffDays = Math.ceil((expiredDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'bg-red-100 text-red-800 border-red-300', text: 'Kedaluwarsa' };
        if (diffDays <= 60) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Segera Habis' };
        return { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Aktif' };
    };

    const getDisplayRows = () => {
        let rows = [];
        
        employees.forEach(emp => {
            const empCerts = certifications.filter(c => 
                (c.karyawan && c.karyawan.id === emp.id) ||
                c.user_id === emp.id || 
                c.employee_id === emp.id
            );

            const empName = emp.nama || emp.nama_lengkap || '';
            const matchSearch = empName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (emp.jabatan || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (emp.department || '').toLowerCase().includes(searchTerm.toLowerCase());
            
            if (empCerts.length > 0) {
                empCerts.forEach(cert => {
                    const certName = (cert.nama_sertifikat || cert.certificate_name || '').toLowerCase();
                    const matchType = filterType === 'ALL' || certName.includes(filterType.toLowerCase());
                    if (matchSearch && matchType) {
                        rows.push({ type: 'cert', employee: emp, cert: cert });
                    }
                });
            } else {
                if (matchSearch && filterType === 'ALL') {
                    rows.push({ type: 'empty', employee: emp, cert: null });
                }
            }
        });
        
        return rows;
    };

    const displayRows = getDisplayRows();
    const pendingCerts = certifications.filter(c => c.status === 'Pending' || c.is_approved === false);

    return (
        <div className="w-full flex flex-col gap-5 relative font-sans">
            {/* Sub-Tab Navigation */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 ${
                            activeTab === 'matrix'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <Award size={15} /> Matriks K3 Seluruh Karyawan
                    </button>
                    
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4 py-2 text-xs font-black rounded-xl transition flex items-center gap-2 ${
                            activeTab === 'pending'
                                ? 'bg-red-700 text-white shadow-sm'
                                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                        }`}
                    >
                        <ShieldCheck size={15} /> Permohonan Sertifikat User
                        {pendingCerts.length > 0 && (
                            <span className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                                activeTab === 'pending' ? 'bg-white text-red-700' : 'bg-amber-500 text-white animate-pulse'
                            }`}>
                                {pendingCerts.length}
                            </span>
                        )}
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button 
                        onClick={fetchData} 
                        className="p-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 transition-all shadow-sm"
                        title="Refresh Data"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>

                    {canManage && activeTab === 'matrix' && (
                        <button
                            onClick={() => { resetForm(); setShowUploadModal(true); }}
                            className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                            <Plus size={15} /> Upload Sertifikat K3 Baru
                        </button>
                    )}
                </div>
            </div>

            {/* PENDING APPROVAL TAB VIEW */}
            {activeTab === 'pending' ? (
                <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-4 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <ShieldCheck className="text-red-700" size={18} /> Permohonan Sertifikat & Lisensi Mandiri (Menunggu Verifikasi HSE)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Tinjau berkas sertifikat yang diunggah oleh karyawan. Sertifikat yang disetujui akan resmi tercatat pada profil dan matriks perusahaan.
                            </p>
                        </div>
                        <span className="px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold">
                            {pendingCerts.length} Menunggu Persetujuan
                        </span>
                    </div>

                    {loading ? (
                        <div className="py-12 text-center text-slate-400 font-bold">
                            <RefreshCw className="animate-spin mb-2 mx-auto" size={24} /> Memuat data permohonan sertifikasi...
                        </div>
                    ) : pendingCerts.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
                            <p className="font-bold text-slate-700 text-sm">Semua Permohonan Telah Diproses</p>
                            <p className="text-xs text-slate-400 mt-0.5">Tidak ada sertifikat user yang sedang menunggu persetujuan Admin HSE.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {pendingCerts.map((cert) => {
                                const emp = cert.karyawan || {};
                                const isBusy = actionLoading === cert.id;

                                return (
                                    <div key={cert.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3.5 hover:border-slate-300 transition">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black text-sm shrink-0">
                                                    {(emp.nama_lengkap || 'K').charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-black text-slate-900">{emp.nama_lengkap}</h4>
                                                    <p className="text-[11px] text-slate-500">{emp.jabatan} • {emp.departemen}</p>
                                                    <span className="text-[10px] font-mono text-slate-400">No. Pegawai: {emp.nomor_pegawai}</span>
                                                </div>
                                            </div>
                                            <span className="px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-full text-[10px] font-black shrink-0">
                                                Menunggu Verifikasi
                                            </span>
                                        </div>

                                        <div className="p-3 bg-white rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Nama Sertifikat</span>
                                                <span className="font-bold text-slate-900">{cert.nama_sertifikat}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">No. Sertifikat / Registrasi</span>
                                                <span className="font-mono text-slate-700 font-bold">{cert.nomor_sertifikat || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Penerbit</span>
                                                <span className="text-slate-700">{cert.institusi_penerbit || '-'}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-slate-400 text-[10px] uppercase font-bold">Masa Berlaku</span>
                                                <span className="font-bold text-slate-800">
                                                    {cert.is_lifetime ? 'Seumur Hidup' : cert.tanggal_kadaluarsa || '-'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60">
                                            {cert.file_url || cert.file_path ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewDoc(cert)}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1"
                                                >
                                                    <Eye size={13} /> Pratinjau Berkas
                                                </button>
                                            ) : (
                                                <span className="text-[10px] text-slate-400 italic">Tidak ada lampiran berkas</span>
                                            )}

                                            <div className="flex items-center gap-2 ml-auto">
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleReject(cert.id)}
                                                    className="px-3 py-1.5 bg-slate-200 hover:bg-red-50 text-slate-700 hover:text-red-700 text-xs font-bold rounded-xl transition disabled:opacity-50"
                                                >
                                                    Tolak
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={isBusy}
                                                    onClick={() => handleApprove(cert.id)}
                                                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-sm transition flex items-center gap-1 disabled:opacity-50"
                                                >
                                                    <CheckCircle2 size={13} /> {isBusy ? "Memproses..." : "Terima & Setujui"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                /* MATRIX TAB VIEW */
                <div className="space-y-4">
                    {/* Search & Filter Bar */}
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                <input
                                    type="text"
                                    placeholder="Cari nama karyawan, jabatan, divisi..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-900/20"
                                />
                            </div>

                            {/* Filter Type */}
                            <select
                                value={filterType}
                                onChange={e => setFilterType(e.target.value)}
                                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-red-900/20"
                            >
                                <option value="ALL">Semua Jenis Sertifikat</option>
                                <option value="POP">POP (Pengawas Pertama)</option>
                                <option value="POM">POM (Pengawas Madya)</option>
                                <option value="WAH">WAH (Working at Height)</option>
                                <option value="AK3U">AK3U (Ahli K3 Umum)</option>
                                <option value="CSMS">CSMS / CSMC</option>
                                <option value="LISTRIK">Teknisi / AK3 Listrik</option>
                                <option value="UBIQUITI">Ubiquiti / Network</option>
                            </select>
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="p-3.5">Karyawan</th>
                                        <th className="p-3.5">Sertifikat & Kompetensi</th>
                                        <th className="p-3.5">Institusi Penerbit</th>
                                        <th className="p-3.5">Masa Berlaku</th>
                                        <th className="p-3.5 text-center">Status</th>
                                        <th className="p-3.5 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                                <RefreshCw className="animate-spin mb-2 mx-auto" size={24} /> Memuat matriks sertifikasi...
                                            </td>
                                        </tr>
                                    ) : displayRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Tidak ada data sertifikasi ditemukan.</td>
                                        </tr>
                                    ) : (
                                        displayRows.map((row, idx) => {
                                            const emp = row.employee;
                                            
                                            if (row.type === 'empty') {
                                                return (
                                                    <tr key={`empty-${emp.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0">
                                                                    {(emp.nama || emp.nama_lengkap || 'U').charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900">{emp.nama || emp.nama_lengkap || '-'}</p>
                                                                    <p className="text-[10px] text-slate-400">{emp.department || emp.departments?.name || '-'}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td colSpan="4" className="p-3.5 text-xs text-slate-400 italic text-center bg-slate-50/40">
                                                            Belum ada sertifikasi terdaftar / terunggah.
                                                        </td>
                                                        <td className="p-3.5 text-center">
                                                            {canManage && (
                                                                <button 
                                                                    onClick={() => { 
                                                                        resetForm();
                                                                        setSelectedUserId(emp.id); 
                                                                        setShowUploadModal(true); 
                                                                    }} 
                                                                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 mx-auto"
                                                                >
                                                                    <Upload size={12} /> Upload Sertifikat
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            const cert = row.cert;
                                            const status = getStatusIndicator(cert);
                                            const hasFile = Boolean(cert.file_url || cert.file_path);

                                            return (
                                                <tr key={`cert-${cert.id || idx}`} className="hover:bg-slate-50/60 transition-colors">
                                                    {/* Karyawan */}
                                                    <td className="p-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-900 to-red-900 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                                                                {(emp.nama || emp.nama_lengkap || 'U').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900">{emp.nama || emp.nama_lengkap || '-'}</p>
                                                                <p className="text-[10px] text-slate-400">{emp.department || emp.departments?.name || '-'}</p>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Sertifikat */}
                                                    <td className="p-3.5">
                                                        <div className="flex items-center gap-2">
                                                            <Award size={15} className="text-red-700 shrink-0" />
                                                            <div>
                                                                <p className="font-bold text-slate-900">{cert.nama_sertifikat || cert.certificate_name}</p>
                                                                <span className="text-[10px] font-mono text-slate-400">{cert.nomor_sertifikat || cert.certificate_number || '-'}</span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Institusi */}
                                                    <td className="p-3.5 text-slate-600">
                                                        {cert.institusi_penerbit || 'BNSP / Kemnaker / Minerba'}
                                                    </td>

                                                    {/* Masa Berlaku */}
                                                    <td className="p-3.5">
                                                        {cert.is_lifetime ? (
                                                            <span className="text-slate-500 font-bold text-[11px]">Seumur Hidup</span>
                                                        ) : (
                                                            <div className="text-[11px]">
                                                                <span className="text-slate-500">s/d </span>
                                                                <span className="font-mono font-bold text-slate-800">{cert.tanggal_kadaluarsa || '-'}</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Status */}
                                                    <td className="p-3.5 text-center">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${status.color}`}>
                                                            {status.text}
                                                        </span>
                                                    </td>

                                                    {/* Aksi */}
                                                    <td className="p-3.5 text-center">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            {hasFile && (
                                                                <button
                                                                    onClick={() => setPreviewDoc(cert)}
                                                                    className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors"
                                                                    title="Lihat Berkas"
                                                                >
                                                                    <Eye size={15} />
                                                                </button>
                                                            )}
                                                            {canManage && (
                                                                <button
                                                                    onClick={() => handleDelete(cert.id)}
                                                                    className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                                                    title="Hapus Sertifikat"
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* UPLOAD MODAL */}
            {showUploadModal && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                <Award size={18} className="text-red-700" /> Upload & Daftarkan Sertifikat K3
                            </h3>
                            <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="space-y-3.5 text-xs font-medium">
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Pilih Karyawan Target *</label>
                                <select
                                    value={selectedUserId}
                                    onChange={e => setSelectedUserId(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-900/20"
                                >
                                    <option value="">-- Pilih Karyawan --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nama || emp.nama_lengkap} ({emp.nomor_pegawai} - {emp.department || emp.departments?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Jenis / Nama Sertifikat *</label>
                                    <input
                                        type="text"
                                        list="certTypesList"
                                        placeholder="Contoh: POP, WAH, AK3U"
                                        value={namaSertifikat}
                                        onChange={e => setNamaSertifikat(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-bold"
                                    />
                                    <datalist id="certTypesList">
                                        {certTypes.map(c => <option key={c.id} value={c.name} />)}
                                        <option value="Pengawas Operasional Pertama (POP)" />
                                        <option value="Pengawas Operasional Madya (POM)" />
                                        <option value="Working at Height (WAH)" />
                                        <option value="Ahli K3 Umum (AK3U)" />
                                        <option value="Contractor Safety Management System (CSMS)" />
                                        <option value="Teknisi Listrik" />
                                        <option value="Ubiquiti Certified" />
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Nomor Registrasi / Sertifikat</label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: CERT/DGN/WAH/001"
                                        value={certNumber}
                                        onChange={e => setCertNumber(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-mono"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Lembaga / Institusi Penerbit</label>
                                <input
                                    type="text"
                                    placeholder="Contoh: BNSP / Kementerian ESDM / Kemnaker"
                                    value={institusi}
                                    onChange={e => setInstitusi(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Tanggal Diterbitkan</label>
                                    <input
                                        type="date"
                                        value={tglTerbit}
                                        onChange={e => setTglTerbit(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Masa Berlaku Hingga</label>
                                    <input
                                        type="date"
                                        disabled={isLifetime}
                                        value={tglExpired}
                                        onChange={e => setTglExpired(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 disabled:opacity-40"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="isLifetime"
                                    checked={isLifetime}
                                    onChange={e => setIsLifetime(e.target.checked)}
                                    className="rounded border-slate-300 accent-red-700"
                                />
                                <label htmlFor="isLifetime" className="text-slate-700 text-xs font-bold cursor-pointer">
                                    Sertifikat berlaku seumur hidup (Lifetime)
                                </label>
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Lampiran File Asli (PDF / JPG / PNG)</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                >
                                    <Upload size={14} /> {uploading ? 'Menyimpan...' : 'Simpan & Upload'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* FULL-PAGE IN-WEB PREVIEW MODAL */}
            {previewDoc && (
                <PdfViewerModal
                    url={previewDoc}
                    fileName="Sertifikat K3 / Lisensi Karyawan"
                    onClose={() => setPreviewDoc(null)}
                />
            )}
        </div>
    );
};

export default Certifications;
