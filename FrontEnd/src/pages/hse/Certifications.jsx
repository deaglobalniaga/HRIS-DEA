import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { 
    Award, Upload, Trash2, Search, FileText, Plus, Eye, CheckCircle2, 
    AlertTriangle, X, RefreshCw, Filter, ShieldCheck, Download,
    ExternalLink, Building, Calendar, Check, HelpCircle, FileCheck
} from 'lucide-react';
import api from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PdfViewerModal from '../../components/PdfViewerModal';

const parseDateSafe = (dStr) => {
    if (!dStr) return null;
    const clean = String(dStr).split('T')[0];
    const d = new Date(clean + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
};

const Certifications = ({ preSelectedUser = null, uploadTrigger = 0 }) => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();
    const role = (user?.role || '').toLowerCase();
    const canManage = ['admin', 'superadmin', 'super_admin', 'hse_admin', 'hse', 'hse_officer'].includes(role) || role.includes('admin') || role.includes('hse');

    const [certifications, setCertifications] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [certTypes, setCertTypes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [showAddTypeModal, setShowAddTypeModal] = useState(false);
    const [newTypeName, setNewTypeName] = useState('');
    const [newTypeCategory, setNewTypeCategory] = useState('K3/HSE');
    const [customCategory, setCustomCategory] = useState('');
    const [savingType, setSavingType] = useState(false);

    // Filter Expiry State ('ALL' | 'expiring' | 'expired' | 'active')
    const [expiryFilter, setExpiryFilter] = useState(searchParams.get('expiry') || 'ALL');
    const [activeTab, setActiveTab] = useState(searchParams.get('subtab') || 'matrix'); // 'matrix' | 'pending'
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        const exp = searchParams.get('expiry') || 'ALL';
        setExpiryFilter(exp);
        const sub = searchParams.get('subtab') || 'matrix';
        setActiveTab(sub);
    }, [searchParams]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, filterType, expiryFilter]);

    const [previewDoc, setPreviewDoc] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [certToDelete, setCertToDelete] = useState(null);
    const [deletingCert, setDeletingCert] = useState(false);
    
    // LinkedIn-Style Form state
    const [selectedUserId, setSelectedUserId] = useState('');
    const [namaSertifikat, setNamaSertifikat] = useState('');
    const [certNumber, setCertNumber] = useState('');
    const [institusi, setInstitusi] = useState('');
    const [credentialUrl, setCredentialUrl] = useState('');
    const [notes, setNotes] = useState('');
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
            setNamaSertifikat(created.name);
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
        if (credentialUrl) formData.append('credential_url', credentialUrl);
        if (notes) formData.append('notes', notes);
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

    const confirmDeleteCert = async () => {
        if (!certToDelete) return;
        setDeletingCert(true);
        try {
            await api.delete(`/hris/certifications/${certToDelete.id}`);
            addToast(`Sertifikat "${certToDelete.nama_sertifikat || certToDelete.name}" milik ${certToDelete.employeeName || 'karyawan'} berhasil dihapus.`, 'success');
            setCertToDelete(null);
            if (previewDoc && previewDoc.id === certToDelete.id) {
                setPreviewDoc(null);
            }
            fetchData();
        } catch (err) {
            console.error(err);
            addToast('Gagal menghapus sertifikat', 'error');
        } finally {
            setDeletingCert(false);
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
        setCredentialUrl('');
        setNotes('');
        setTglTerbit('');
        setTglExpired('');
        setIsLifetime(false);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getStatusIndicator = (cert) => {
        if (cert.status === 'Rejected' || cert.notes?.includes('[STATUS:REJECTED]')) {
            return { color: 'bg-rose-100 text-rose-800 border-rose-300', text: 'Ditolak HSE' };
        }
        if (cert.status === 'Pending' || cert.notes?.includes('[STATUS:PENDING]')) {
            return { color: 'bg-purple-100 text-purple-800 border-purple-300', text: 'Menunggu Verifikasi' };
        }
        if (cert.is_lifetime || !cert.tanggal_kadaluarsa) {
            return { color: 'bg-teal-100 text-teal-800 border-teal-300', text: 'Seumur Hidup' };
        }
        const expiredDate = parseDateSafe(cert.tanggal_kadaluarsa);
        if (!expiredDate) {
            return { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Aktif' };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diffDays = Math.round((expiredDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return { color: 'bg-red-100 text-red-800 border-red-300', text: 'Kedaluwarsa' };
        if (diffDays <= 60) return { color: 'bg-amber-100 text-amber-800 border-amber-300', text: diffDays === 0 ? 'Habis Hari Ini' : `Segera Habis (${diffDays} hr)` };
        return { color: 'bg-emerald-100 text-emerald-800 border-emerald-300', text: 'Aktif' };
    };

    const getDisplayRows = () => {
        let rows = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        (employees || []).forEach(emp => {
            if (!emp) return;
            const empId = emp.id;
            // Only include approved certificates in the general matrix (exclude rejected and pending)
            const empCerts = (certifications || []).filter(c => 
                c &&
                ((c.karyawan && (c.karyawan.id === empId || c.karyawan.nama_lengkap === emp.nama_lengkap || c.karyawan.nama === emp.nama)) ||
                c.user_id === empId || 
                c.employee_id === empId) &&
                c.status !== 'Rejected' && 
                !c.notes?.includes('[STATUS:REJECTED]') &&
                c.status !== 'Pending' &&
                !c.notes?.includes('[STATUS:PENDING]')
            );

            let matchingCerts = empCerts;

            // 1. Filter by Certificate Type
            if (filterType !== 'ALL') {
                matchingCerts = matchingCerts.filter(c => {
                    const certName = (c.nama_sertifikat || c.certificate_name || '').toLowerCase();
                    return certName.includes(filterType.toLowerCase());
                });
            }

            // 2. Filter by Expiry Status
            if (expiryFilter !== 'ALL') {
                matchingCerts = matchingCerts.filter(c => {
                    if (c.is_lifetime || !c.tanggal_kadaluarsa) {
                        return expiryFilter === 'active';
                    }
                    const expDate = parseDateSafe(c.tanggal_kadaluarsa);
                    if (!expDate) return expiryFilter === 'active';
                    const diffDays = Math.round((expDate - today) / (1000 * 60 * 60 * 24));

                    if (expiryFilter === 'expired') {
                        return diffDays < 0;
                    } else if (expiryFilter === 'expiring') {
                        return diffDays >= 0 && diffDays <= 60;
                    } else if (expiryFilter === 'active') {
                        return diffDays > 60;
                    }
                    return true;
                });
            }

            const empName = emp.nama || emp.nama_lengkap || '';
            const empNip = emp.nomor_pegawai || '';
            const empDept = emp.department || emp.departments?.name || '';
            const empJabatan = emp.jabatan || '';

            const term = searchTerm.toLowerCase().trim();
            const hasMatchingCert = matchingCerts.some(c => 
                (c.nama_sertifikat || c.certificate_name || '').toLowerCase().includes(term) ||
                (c.nomor_sertifikat || c.certificate_number || '').toLowerCase().includes(term) ||
                (c.institusi_penerbit || '').toLowerCase().includes(term)
            );

            const matchSearch = !term ||
                empName.toLowerCase().includes(term) ||
                empNip.toLowerCase().includes(term) ||
                empDept.toLowerCase().includes(term) ||
                empJabatan.toLowerCase().includes(term) ||
                hasMatchingCert;

            if (matchingCerts.length > 0) {
                if (matchSearch) {
                    rows.push({
                        type: 'has_certs',
                        employee: emp,
                        certs: matchingCerts
                    });
                }
            } else if (expiryFilter === 'ALL' && filterType === 'ALL' && matchSearch) {
                rows.push({
                    type: 'empty',
                    employee: emp,
                    certs: []
                });
            }
        });
        
        return rows;
    };

    const todayDateObj = new Date();
    todayDateObj.setHours(0, 0, 0, 0);
    const approvedCertsList = (certifications || []).filter(c => 
        c &&
        c.status !== 'Rejected' && 
        !c.notes?.includes('[STATUS:REJECTED]') &&
        c.status !== 'Pending' &&
        !c.notes?.includes('[STATUS:PENDING]')
    );

    const expiringCount = approvedCertsList.filter(c => {
        if (c.is_lifetime || !c.tanggal_kadaluarsa) return false;
        const expDate = parseDateSafe(c.tanggal_kadaluarsa);
        if (!expDate) return false;
        const diff = Math.round((expDate - todayDateObj) / (1000 * 60 * 60 * 24));
        return diff >= 0 && diff <= 60;
    }).length;

    const expiredCount = approvedCertsList.filter(c => {
        if (c.is_lifetime || !c.tanggal_kadaluarsa) return false;
        const expDate = parseDateSafe(c.tanggal_kadaluarsa);
        if (!expDate) return false;
        const diff = Math.round((expDate - todayDateObj) / (1000 * 60 * 60 * 24));
        return diff < 0;
    }).length;

    const activeCount = approvedCertsList.filter(c => {
        if (c.is_lifetime || !c.tanggal_kadaluarsa) return true;
        const expDate = parseDateSafe(c.tanggal_kadaluarsa);
        if (!expDate) return true;
        const diff = Math.round((expDate - todayDateObj) / (1000 * 60 * 60 * 24));
        return diff > 60;
    }).length;

    const displayRows = getDisplayRows();
    const totalPages = Math.max(1, Math.ceil(displayRows.length / itemsPerPage));
    const paginatedRows = displayRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const pendingCerts = certifications.filter(c => c.status === 'Pending');

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
                                                    onClick={() => {
                                                        const userCerts = certifications.filter(c => 
                                                            (c.karyawan && (c.karyawan.id === emp.id || c.karyawan.nama_lengkap === emp.nama_lengkap || c.karyawan.nama === emp.nama)) ||
                                                            c.user_id === emp.id || 
                                                            c.employee_id === emp.id ||
                                                            c.id === cert.id
                                                        );
                                                        setPreviewDoc({ 
                                                            id: cert.id,
                                                            url: cert.file_url || cert.file_path || cert.attachments || cert.url, 
                                                            name: `${emp.nama || emp.nama_lengkap || 'Karyawan'} - ${cert.nama_sertifikat || 'Sertifikat K3'}`,
                                                            userCerts: userCerts,
                                                            karyawan: emp
                                                        });
                                                    }}
                                                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer"
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
                    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-3.5">
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto flex-1">
                                <div className="relative w-full sm:w-72">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                                    <input
                                        type="text"
                                        placeholder="Cari nama karyawan, NIP, sertifikat..."
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

                            {/* Status Filter Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap w-full lg:w-auto">
                                <button
                                    type="button"
                                    onClick={() => setExpiryFilter('ALL')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        expiryFilter === 'ALL'
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                    }`}
                                >
                                    <span>Semua</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${expiryFilter === 'ALL' ? 'bg-slate-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                                        {approvedCertsList.length}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setExpiryFilter('expiring')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        expiryFilter === 'expiring'
                                            ? 'bg-amber-500 text-slate-950 font-black ring-2 ring-amber-400 shadow-sm'
                                            : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80'
                                    }`}
                                >
                                    <AlertTriangle size={13} className={expiryFilter === 'expiring' ? 'text-slate-950' : 'text-amber-600'} />
                                    <span>Segera Habis (&le; 60 Hr)</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${expiryFilter === 'expiring' ? 'bg-amber-600 text-white' : 'bg-amber-200 text-amber-900'}`}>
                                        {expiringCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setExpiryFilter('expired')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        expiryFilter === 'expired'
                                            ? 'bg-red-600 text-white font-black ring-2 ring-red-400 shadow-sm'
                                            : 'bg-red-50 hover:bg-red-100 text-red-900 border border-red-200/80'
                                    }`}
                                >
                                    <FileCheck size={13} className={expiryFilter === 'expired' ? 'text-white' : 'text-red-600'} />
                                    <span>Kedaluwarsa</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${expiryFilter === 'expired' ? 'bg-red-800 text-white' : 'bg-red-200 text-red-900'}`}>
                                        {expiredCount}
                                    </span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setExpiryFilter('active')}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                        expiryFilter === 'active'
                                            ? 'bg-emerald-600 text-white font-black ring-2 ring-emerald-400 shadow-sm'
                                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200/80'
                                    }`}
                                >
                                    <CheckCircle2 size={13} className={expiryFilter === 'active' ? 'text-white' : 'text-emerald-600'} />
                                    <span>Aktif</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${expiryFilter === 'active' ? 'bg-emerald-800 text-white' : 'bg-emerald-200 text-emerald-900'}`}>
                                        {activeCount}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Active Filter Notification */}
                        {expiryFilter !== 'ALL' && (
                            <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200/80 px-4 py-2 rounded-xl text-xs font-medium text-amber-900 animate-in fade-in">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                                    <span>
                                        Menampilkan filter khusus: <strong>{expiryFilter === 'expiring' ? 'Sertifikat Segera Habis (Masa Berlaku ≤ 60 Hari)' : expiryFilter === 'expired' ? 'Sertifikat Sudah Kedaluwarsa' : 'Sertifikat Aktif / Seumur Hidup'}</strong>.
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setExpiryFilter('ALL')}
                                    className="text-amber-800 hover:text-amber-950 font-black underline text-xs cursor-pointer ml-3 shrink-0"
                                >
                                    Reset / Tampilkan Semua
                                </button>
                            </div>
                        )}
                    </div>

                    {/* LEGENDA STATUS & KATEGORI SERTIFIKASI K3 - WHITE WITH SOFT ROSE GRADIENT */}
                    <div className="bg-gradient-to-r from-white via-rose-50/70 to-red-50/60 text-slate-800 rounded-2xl p-4.5 shadow-sm border border-red-200/80">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 mb-2.5 border-b border-rose-200/70">
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping"></span>
                                <h4 className="text-xs font-black text-red-950 uppercase tracking-wider flex items-center gap-1.5">
                                    <ShieldCheck size={15} className="text-red-700" /> Legenda Standar Sertifikasi & Lisensi K3 Minerba
                                </h4>
                            </div>
                            <span className="text-[10px] text-slate-500 font-bold bg-white/90 px-3 py-1 rounded-full border border-rose-200/70 shadow-2xs">
                                Standar Kepmen ESDM 1827 K/30/MEM/2018 & Kemnaker RI
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5 text-[11px]">
                            {/* Aktif */}
                            <div className="flex items-center gap-2.5 bg-white/95 border border-emerald-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 shrink-0"></span>
                                <div>
                                    <strong className="text-emerald-700 block font-black text-xs">Aktif / Valid</strong>
                                    <span className="text-[10px] text-slate-500">Masa berlaku &gt; 60 hari</span>
                                </div>
                            </div>

                            {/* Segera Habis */}
                            <div className="flex items-center gap-2.5 bg-white/95 border border-amber-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
                                <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm shadow-amber-400/50 shrink-0"></span>
                                <div>
                                    <strong className="text-amber-700 block font-black text-xs">Segera Habis</strong>
                                    <span className="text-[10px] text-slate-500">&le; 60 hari (Perpanjang)</span>
                                </div>
                            </div>

                            {/* Kedaluwarsa */}
                            <div className="flex items-center gap-2.5 bg-white/95 border border-rose-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
                                <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50 shrink-0"></span>
                                <div>
                                    <strong className="text-rose-700 block font-black text-xs">Kedaluwarsa</strong>
                                    <span className="text-[10px] text-slate-500">Lisensi tidak aktif / non-valid</span>
                                </div>
                            </div>

                            {/* Seumur Hidup */}
                            <div className="flex items-center gap-2.5 bg-white/95 border border-teal-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
                                <span className="w-3 h-3 rounded-full bg-teal-500 shadow-sm shadow-teal-500/50 shrink-0"></span>
                                <div>
                                    <strong className="text-teal-700 block font-black text-xs">Seumur Hidup</strong>
                                    <span className="text-[10px] text-slate-500">Tanpa tanggal kedaluwarsa</span>
                                </div>
                            </div>

                            {/* Menunggu Verifikasi */}
                            <div className="flex items-center gap-2.5 bg-white/95 border border-purple-200/80 rounded-xl px-3.5 py-2.5 shadow-2xs">
                                <span className="w-3 h-3 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50 shrink-0"></span>
                                <div>
                                    <strong className="text-purple-700 block font-black text-xs">Verifikasi User</strong>
                                    <span className="text-[10px] text-slate-500">Menunggu ACC Admin HSE</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Matrix Table */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                        <th className="p-3.5 w-12 text-center">No</th>
                                        <th className="p-3.5">Nama Pejabat / Karyawan</th>
                                        <th className="p-3.5">Departemen</th>
                                        <th className="p-3.5">Sertifikasi Dimiliki & Institusi</th>
                                        <th className="p-3.5 text-center">Masa Berlaku & Status</th>
                                        <th className="p-3.5 text-center">Aksi HSE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">
                                                <RefreshCw className="animate-spin mb-2 mx-auto" size={24} /> Memuat matriks sertifikasi...
                                            </td>
                                        </tr>
                                    ) : paginatedRows.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Tidak ada data sertifikasi ditemukan.</td>
                                        </tr>
                                    ) : (
                                        paginatedRows.map((row, idx) => {
                                            const emp = row.employee;
                                            const itemNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                                            
                                            if (row.type === 'empty') {
                                                return (
                                                    <tr key={`empty-${emp.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="p-3.5 text-center font-bold text-slate-400 text-[11px] align-top">
                                                            {itemNumber}
                                                        </td>
                                                        <td className="p-3.5 align-top">
                                                            <div className="flex items-start gap-2.5">
                                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-600 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                                                    {(emp.nama || emp.nama_lengkap || 'U').charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 leading-tight">{emp.nama || emp.nama_lengkap || '-'}</p>
                                                                    {emp.nomor_pegawai && emp.nomor_pegawai !== '-' && (
                                                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIP: {emp.nomor_pegawai}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-3.5 text-slate-600 align-top">
                                                            <div className="font-semibold text-slate-700">{emp.department || emp.departments?.name || '-'}</div>
                                                            {emp.jabatan && emp.jabatan !== '-' && (
                                                                <div className="text-[10px] text-slate-400">{emp.jabatan}</div>
                                                            )}
                                                        </td>
                                                        <td colSpan="2" className="p-3.5 text-xs text-slate-400 italic text-center bg-slate-50/40 align-middle">
                                                            Belum ada sertifikasi terdaftar / terunggah.
                                                        </td>
                                                        <td className="p-3.5 text-center align-top">
                                                            {canManage && (
                                                                <button 
                                                                    type="button"
                                                                    onClick={() => { 
                                                                        resetForm();
                                                                        setSelectedUserId(emp.id); 
                                                                        setShowUploadModal(true); 
                                                                    }} 
                                                                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 mx-auto cursor-pointer"
                                                                >
                                                                    <Upload size={12} /> Upload
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            }

                                            return (
                                                <tr key={`emp-${emp.id}-${idx}`} className="hover:bg-slate-50/60 transition-colors">
                                                    {/* No */}
                                                    <td className="p-3.5 text-center font-bold text-slate-400 text-[11px] align-top">
                                                        {itemNumber}
                                                    </td>

                                                    {/* Karyawan */}
                                                    <td className="p-3.5 font-bold text-slate-900 align-top">
                                                        <div className="flex items-start gap-2.5">
                                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-red-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                                                                {(emp.nama || emp.nama_lengkap || 'U').charAt(0)}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-slate-900 leading-tight">{emp.nama || emp.nama_lengkap || '-'}</p>
                                                                {emp.nomor_pegawai && emp.nomor_pegawai !== '-' && (
                                                                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIP: {emp.nomor_pegawai}</p>
                                                                )}
                                                                <span className="inline-block mt-1 text-[9px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                                                                    {row.certs.length} Sertifikat Dimiliki
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Departemen & Jabatan */}
                                                    <td className="p-3.5 text-slate-600 align-top">
                                                        <div className="font-semibold text-slate-700">{emp.department || emp.departments?.name || '-'}</div>
                                                        {emp.jabatan && emp.jabatan !== '-' && (
                                                            <div className="text-[10px] text-slate-400">{emp.jabatan}</div>
                                                        )}
                                                    </td>

                                                    {/* Sertifikasi Dimiliki */}
                                                    <td className="p-3.5 align-top">
                                                        <div className="flex flex-col gap-2.5">
                                                            {row.certs.map((cert, cIdx) => (
                                                                <div key={cert.id || cIdx} className="flex items-start gap-2">
                                                                    <Award size={15} className="text-red-700 shrink-0 mt-0.5" />
                                                                    <div>
                                                                        <p className="font-bold text-slate-900 text-xs leading-tight">{cert.nama_sertifikat || cert.certificate_name}</p>
                                                                        <span className="text-[10px] font-mono text-slate-500 font-bold block mt-0.5">
                                                                            No: {cert.nomor_sertifikat || cert.certificate_number || '-'} • <span className="text-slate-400 font-normal">{cert.institusi_penerbit || 'K3/HSE'}</span>
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* Masa Berlaku & Status */}
                                                    <td className="p-3.5 text-center align-top">
                                                        <div className="flex flex-col gap-2.5">
                                                            {row.certs.map((cert, cIdx) => {
                                                                const status = getStatusIndicator(cert);
                                                                return (
                                                                    <div key={cert.id || cIdx} className="flex items-center justify-center gap-2 min-h-[30px]">
                                                                        <span className="text-[11px] font-mono font-bold text-slate-700">
                                                                            {cert.is_lifetime ? 'Seumur Hidup' : `s/d ${cert.tanggal_kadaluarsa || '-'}`}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${status.color}`}>
                                                                            {status.text}
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>

                                                    {/* Aksi HSE */}
                                                    <td className="p-3.5 text-center align-top">
                                                        <div className="flex flex-col gap-2.5 items-center">
                                                            {row.certs.map((cert, cIdx) => {
                                                                const hasFile = Boolean(cert.file_url || cert.file_path);
                                                                return (
                                                                    <div key={cert.id || cIdx} className="flex items-center justify-center gap-1.5 min-h-[30px]">
                                                                        {hasFile ? (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    setPreviewDoc({ 
                                                                                        id: cert.id,
                                                                                        url: cert.file_url || cert.file_path || cert.attachments || cert.url, 
                                                                                        name: `${emp.nama || emp.nama_lengkap || 'Karyawan'} - ${cert.nama_sertifikat || 'Sertifikat K3'}`,
                                                                                        userCerts: row.certs.map(c => ({
                                                                                            id: c.id,
                                                                                            url: c.file_url || c.file_path,
                                                                                            name: `${emp.nama || emp.nama_lengkap} - ${c.nama_sertifikat}`,
                                                                                            nama_sertifikat: c.nama_sertifikat,
                                                                                            nomor_sertifikat: c.nomor_sertifikat,
                                                                                            is_lifetime: c.is_lifetime,
                                                                                            tanggal_kadaluarsa: c.tanggal_kadaluarsa,
                                                                                            file_url: c.file_url || c.file_path,
                                                                                            karyawan: emp
                                                                                        })),
                                                                                        karyawan: emp
                                                                                    });
                                                                                }}
                                                                                className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 shadow-2xs border border-red-200 cursor-pointer"
                                                                                title="Lihat & Pratinjau Berkas Sertifikat"
                                                                            >
                                                                                <Eye size={12} /> Preview
                                                                            </button>
                                                                        ) : (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                                                                                Kosong
                                                                            </span>
                                                                        )}
                                                                        {canManage && (
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => setCertToDelete({
                                                                                    id: cert.id,
                                                                                    nama_sertifikat: cert.nama_sertifikat || cert.certificate_name,
                                                                                    nomor_sertifikat: cert.nomor_sertifikat || cert.certificate_number,
                                                                                    institusi_penerbit: cert.institusi_penerbit,
                                                                                    tanggal_kadaluarsa: cert.tanggal_kadaluarsa,
                                                                                    is_lifetime: cert.is_lifetime,
                                                                                    employeeName: emp.nama || emp.nama_lengkap,
                                                                                    employeeDept: emp.department || emp.departments?.name,
                                                                                    employeeNip: emp.nomor_pegawai
                                                                                })}
                                                                                className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                                                                                title="Hapus Sertifikat Ini"
                                                                            >
                                                                                <Trash2 size={13} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {!loading && displayRows.length > 0 && (
                            <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-4">
                                    <span className="text-xs font-bold text-slate-500">
                                        Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, displayRows.length)} dari {displayRows.length} Data Sertifikasi
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-500">Tampilkan:</span>
                                        <select
                                            value={itemsPerPage}
                                            onChange={(e) => {
                                                setItemsPerPage(Number(e.target.value));
                                                setCurrentPage(1);
                                            }}
                                            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg p-1.5 outline-none cursor-pointer"
                                        >
                                            <option value={10}>10</option>
                                            <option value={25}>25</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Prev
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            let pageNum;
                                            if (totalPages <= 5) {
                                                pageNum = i + 1;
                                            } else if (currentPage <= 3) {
                                                pageNum = i + 1;
                                            } else if (currentPage >= totalPages - 2) {
                                                pageNum = totalPages - 4 + i;
                                            } else {
                                                pageNum = currentPage - 2 + i;
                                            }
                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                                                        currentPage === pageNum
                                                            ? 'bg-red-700 text-white shadow-xs font-black'
                                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-600 rounded-xl hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* LEGENDA & KETERANGAN MATRIKS SERTIFIKASI K3 */}
            <div className="mt-6 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm animate-in fade-in">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-red-50 text-red-700 flex items-center justify-center font-bold">
                            <Award size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-900">Keterangan & Legenda Sertifikasi Kompetensi K3</h3>
                            <p className="text-[11px] text-slate-500 font-medium">Daftar kode & warna lisensi resmi operasional PT DEA GLOBAL NIAGA.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowAddTypeModal(true)}
                        className="px-3.5 py-1.5 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
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

            {/* PORTALED LINKEDIN-STYLE UPLOAD MODAL */}
            {showUploadModal && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center">
                                    <Award size={22} />
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">Upload & Daftarkan Lisensi K3</h3>
                                    <p className="text-[11px] text-slate-400 font-medium">Form lengkap sertifikasi kompetensi standar industri</p>
                                </div>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-medium">
                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Pilih Karyawan Target <span className="text-red-600">*</span></label>
                                <select
                                    value={selectedUserId}
                                    onChange={e => setSelectedUserId(e.target.value)}
                                    required
                                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-900/20"
                                >
                                    <option value="">-- Pilih Karyawan --</option>
                                    {employees.map(emp => (
                                        <option key={emp.id} value={emp.id}>
                                            {emp.nama || emp.nama_lengkap} ({emp.nomor_pegawai} - {emp.department || emp.departments?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-slate-700 font-bold">Jenis / Nama Sertifikat <span className="text-red-600">*</span></label>
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
                                        list="certTypesList"
                                        placeholder="Pilih atau ketik jenis sertifikasi..."
                                        value={namaSertifikat}
                                        onChange={e => setNamaSertifikat(e.target.value)}
                                        required
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-bold"
                                    />
                                    <datalist id="certTypesList">
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
                                    </datalist>
                                </div>

                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">ID Kredensial / No. Registrasi <span className="text-red-600">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: CERT/DGN/WAH/001"
                                        value={certNumber}
                                        onChange={e => setCertNumber(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-mono font-bold"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Lembaga / Organisasi Penerbit <span className="text-red-600">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Contoh: BNSP / Kementerian ESDM / Kemnaker"
                                        value={institusi}
                                        onChange={e => setInstitusi(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">URL Kredensial (Verifikasi Online)</label>
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={credentialUrl}
                                        onChange={e => setCredentialUrl(e.target.value)}
                                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Tanggal Diterbitkan <span className="text-red-600">*</span></label>
                                    <input
                                        type="date"
                                        required
                                        value={tglTerbit}
                                        onChange={e => setTglTerbit(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-slate-700 font-bold mb-1">Masa Berlaku Hingga</label>
                                    <input
                                        type="date"
                                        disabled={isLifetime}
                                        value={tglExpired}
                                        onChange={e => setTglExpired(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20 disabled:opacity-40 font-bold"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                <input
                                    type="checkbox"
                                    id="isLifetimeHSE"
                                    checked={isLifetime}
                                    onChange={e => setIsLifetime(e.target.checked)}
                                    className="w-4 h-4 text-red-700 rounded accent-red-700 focus:ring-red-900"
                                />
                                <label htmlFor="isLifetimeHSE" className="text-slate-700 text-xs font-bold cursor-pointer">
                                    Sertifikat / Lisensi ini berlaku Seumur Hidup (Lifetime)
                                </label>
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Lampiran File Asli (PDF / JPG / PNG)</label>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                                    onChange={e => setFile(e.target.files[0])}
                                    className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 border border-slate-200 rounded-2xl p-1.5 cursor-pointer"
                                />
                            </div>

                            <div>
                                <label className="block text-slate-700 font-bold mb-1">Keterangan / Catatan Tambahan (Opsional)</label>
                                <textarea
                                    rows="2"
                                    placeholder="Contoh: Terakreditasi BNSP, mencakup kompetensi pengawasan operasional tambang..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-900/20"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setShowUploadModal(false)}
                                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-5 py-2.5 bg-gradient-to-r from-red-700 to-rose-700 hover:from-red-800 hover:to-rose-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                                >
                                    <Upload size={14} /> {uploading ? 'Menyimpan...' : 'Simpan & Upload Sertifikat'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}

            {/* MODAL TAMBAH JENIS SERTIFIKASI BARU */}
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

            {/* FULL-PAGE IN-WEB PREVIEW MODAL */}
            {previewDoc && (
                <PdfViewerModal
                    url={previewDoc?.url || previewDoc}
                    fileName={previewDoc?.name || "Sertifikat K3 / Lisensi Karyawan"}
                    allCertificates={previewDoc?.userCerts || (previewDoc ? [previewDoc] : [])}
                    activeId={previewDoc?.id}
                    onClose={() => setPreviewDoc(null)}
                    onDelete={canManage ? (doc) => setCertToDelete({
                        id: doc.id,
                        nama_sertifikat: doc.title || doc.nama_sertifikat,
                        nomor_sertifikat: doc.certNumber,
                        institusi_penerbit: doc.issuer,
                        tanggal_kadaluarsa: doc.expiry,
                        is_lifetime: doc.isLifetime,
                        employeeName: doc.employeeName,
                        employeeDept: doc.employeeDept,
                        employeeNip: doc.employeeNip
                    }) : null}
                />
            )}

            {/* MODAL KONFIRMASI HAPUS SERTIFIKAT SPESIFIK */}
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
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Pemilik Sertifikat</span>
                                <p className="text-xs font-bold text-slate-900">{certToDelete.employeeName || 'Karyawan'} {certToDelete.employeeDept ? `(${certToDelete.employeeDept})` : ''}</p>
                            </div>
                            <div>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Jenis Sertifikat</span>
                                <p className="text-xs font-bold text-red-700">{certToDelete.nama_sertifikat}</p>
                            </div>
                            {certToDelete.nomor_sertifikat && certToDelete.nomor_sertifikat !== '-' && (
                                <div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Nomor Sertifikat</span>
                                    <p className="text-xs font-mono font-bold text-slate-700">{certToDelete.nomor_sertifikat}</p>
                                </div>
                            )}
                        </div>

                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200/80 mb-5 text-[11px] text-amber-900 leading-relaxed">
                            ⚠️ <strong>Catatan:</strong> Hanya sertifikat spesifik di atas yang akan dihapus dari sistem. Sertifikat dan data lainnya milik karyawan ini tetap aman dan tidak terpengaruh.
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

export default Certifications;
