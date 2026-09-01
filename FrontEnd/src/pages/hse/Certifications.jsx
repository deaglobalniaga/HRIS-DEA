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

// 15 K3 Competency Legends with exact color dots matching the corporate matrix
const CERT_LEGEND = [
    { code: 'POM', name: 'Pengawas Operasional Madya', dot: '#84cc16' },
    { code: 'POP', name: 'Pengawas Operasional Pertama', dot: '#2563eb' },
    { code: 'AK3U', name: 'Ahli K3 Umum', dot: '#dc2626' },
    { code: 'AK3 Listrik', name: 'AK3 Listrik', dot: '#f59e0b' },
    { code: 'WAH', name: 'Working at Height', dot: '#ea580c' },
    { code: 'Teknisi Listrik', name: 'Teknisi Listrik', dot: '#eab308' },
    { code: 'MTCNA', name: 'MikroTik Certified Network Associate', dot: '#9333ea' },
    { code: 'Ubiqty', name: 'Ubiquiti Network Specialist', dot: '#06b6d4' },
    { code: 'FO', name: 'Fiber Optic Specialist', dot: '#10b981' },
    { code: 'TOT', name: 'Training of Trainer', dot: '#0f766e' },
    { code: 'First Aid', name: 'Pertolongan Pertama (P3K)', dot: '#065f46' },
    { code: 'Operator Drone', name: 'Lisensi Operator Drone', dot: '#db2777' },
    { code: 'Teknisi Geoteknik', name: 'Teknisi Geoteknik', dot: '#78350f' },
    { code: 'Building Construction', name: 'Building Construction', dot: '#57534e' },
    { code: 'CSMC', name: 'Certified Safety Management', dot: '#f97316' },
];

const getCertLegendItem = (certName) => {
    if (!certName) return { code: 'K3', name: 'Kompetensi K3', dot: '#64748b' };
    const upper = certName.toUpperCase().trim();
    const found = CERT_LEGEND.find(l => upper.includes(l.code.toUpperCase()) || upper.includes(l.name.toUpperCase()));
    if (found) return found;
    return {
        code: certName.length > 12 ? certName.slice(0, 10) + '..' : certName,
        name: certName,
        dot: '#b91c1c'
    };
};

const getEmployeeOverallStatus = (certs = []) => {
    if (!certs || certs.length === 0) {
        return { text: 'Belum Ada Sertifikat', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let hasExpired = false;
    let hasExpiring = false;

    for (const c of certs) {
        if (c.is_lifetime || !c.tanggal_kadaluarsa) continue;
        const exp = parseDateSafe(c.tanggal_kadaluarsa);
        if (!exp) continue;
        const diff = Math.round((exp - today) / (1000 * 60 * 60 * 24));
        if (diff < 0) hasExpired = true;
        else if (diff <= 60) hasExpiring = true;
    }

    if (hasExpired) {
        return { text: 'Ada Kedaluwarsa', color: 'bg-red-100 text-red-800 border-red-300' };
    }
    if (hasExpiring) {
        return { text: 'Segera Habis (≤ 60 hr)', color: 'bg-amber-100 text-amber-900 border-amber-300' };
    }
    return { text: 'Semua Aktif / Valid', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
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

    // Selected Employee Detail Modal State
    const [selectedEmpDetail, setSelectedEmpDetail] = useState(null);

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
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                    {/* LEFT PANEL: MATRIKS SERTIFIKASI LEGENDA (3 Cols on XL) */}
                    <div className="xl:col-span-3 bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 sticky top-4">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                                <Award className="text-red-600" size={20} />
                                <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase">
                                    Matriks Sertifikasi
                                </h3>
                            </div>
                            {filterType !== 'ALL' && (
                                <button
                                    onClick={() => setFilterType('ALL')}
                                    className="text-[10px] text-red-600 hover:text-red-800 font-bold underline cursor-pointer"
                                >
                                    Reset
                                </button>
                            )}
                        </div>

                        <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                            Klik pada jenis lisensi di bawah untuk memfilter daftar karyawan yang memilikinya:
                        </p>

                        <div className="space-y-1.5 max-h-[620px] overflow-y-auto pr-1">
                            {CERT_LEGEND.map((item, idx) => {
                                const isSelected = filterType.toUpperCase() === item.code.toUpperCase();
                                const count = approvedCertsList.filter(c => {
                                    const cName = (c.nama_sertifikat || c.certificate_name || '').toUpperCase();
                                    return cName.includes(item.code.toUpperCase()) || cName.includes(item.name.toUpperCase());
                                }).length;

                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => setFilterType(isSelected ? 'ALL' : item.code)}
                                        className={`w-full p-2.5 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                                            isSelected 
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                                                : 'bg-white hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                                        }`}
                                    >
                                        <span 
                                            className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5 shadow-xs" 
                                            style={{ backgroundColor: item.dot }}
                                        ></span>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <span className={`text-xs font-black truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                                                    {item.code}
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                                                    isSelected 
                                                        ? 'bg-white/20 text-white' 
                                                        : count > 0 ? 'bg-slate-100 text-slate-700' : 'text-slate-400'
                                                }`}>
                                                    {count}
                                                </span>
                                            </div>
                                            <p className={`text-[10px] font-medium truncate ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                                {item.name}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {canManage && (
                            <button
                                type="button"
                                onClick={() => setShowAddTypeModal(true)}
                                className="w-full py-2 bg-slate-50 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-700 hover:text-red-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                            >
                                <Plus size={13} /> Tambah Jenis Sertifikasi
                            </button>
                        )}
                    </div>

                    {/* RIGHT PANEL: TABLE & FILTERS (9 Cols on XL) */}
                    <div className="xl:col-span-9 space-y-4">
                        {/* Search & Status Filter Bar */}
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

                                    {filterType !== 'ALL' && (
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white shadow-xs">
                                            <span>Filter: {filterType}</span>
                                            <X size={13} className="cursor-pointer hover:text-red-300" onClick={() => setFilterType('ALL')} />
                                        </span>
                                    )}
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
                            {(expiryFilter !== 'ALL' || filterType !== 'ALL') && (
                                <div className="flex items-center justify-between bg-amber-50/90 border border-amber-200/80 px-4 py-2 rounded-xl text-xs font-medium text-amber-900 animate-in fade-in">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle size={14} className="text-amber-700 shrink-0" />
                                        <span>
                                            Menampilkan filter: <strong>{filterType !== 'ALL' ? `Jenis ${filterType}` : ''} {expiryFilter !== 'ALL' ? `• Status ${expiryFilter}` : ''}</strong>.
                                        </span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => { setExpiryFilter('ALL'); setFilterType('ALL'); }}
                                        className="text-amber-800 hover:text-amber-950 font-black underline text-xs cursor-pointer ml-3 shrink-0"
                                    >
                                        Reset Semua Filter
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* COMPACT MATRIX TABLE */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
                                            <th className="p-3.5 w-12 text-center">No</th>
                                            <th className="p-3.5 min-w-[200px]">Karyawan</th>
                                            <th className="p-3.5 min-w-[160px]">Departemen & Jabatan</th>
                                            <th className="p-3.5 min-w-[260px]">Sertifikasi Dimiliki</th>
                                            <th className="p-3.5 text-center min-w-[150px]">Status Masa Berlaku</th>
                                            <th className="p-3.5 text-center w-28">Aksi</th>
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
                                                <td colSpan="6" className="p-8 text-center text-slate-400 font-bold">Tidak ada data sertifikasi yang cocok.</td>
                                            </tr>
                                        ) : (
                                            paginatedRows.map((row, idx) => {
                                                const emp = row.employee;
                                                const itemNumber = (currentPage - 1) * itemsPerPage + idx + 1;
                                                const overall = getEmployeeOverallStatus(row.certs);

                                                return (
                                                    <tr 
                                                        key={`emp-${emp.id}-${idx}`} 
                                                        onClick={() => setSelectedEmpDetail({ employee: emp, certs: row.certs })}
                                                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                                    >
                                                        {/* No */}
                                                        <td className="p-3.5 text-center font-bold text-slate-400 text-[11px] align-middle">
                                                            {itemNumber}
                                                        </td>

                                                        {/* Karyawan */}
                                                        <td className="p-3.5 font-bold text-slate-900 align-middle">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-900 to-red-900 text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                                                                    {(emp.nama || emp.nama_lengkap || 'U').charAt(0)}
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs font-bold text-slate-900 leading-tight group-hover:text-red-700 transition-colors">{emp.nama || emp.nama_lengkap || '-'}</p>
                                                                    {emp.nomor_pegawai && emp.nomor_pegawai !== '-' && (
                                                                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">NIP: {emp.nomor_pegawai}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Departemen & Jabatan */}
                                                        <td className="p-3.5 text-slate-600 align-middle">
                                                            <div className="font-semibold text-slate-800">{emp.department || emp.departments?.name || '-'}</div>
                                                            {emp.jabatan && emp.jabatan !== '-' && (
                                                                <div className="text-[10px] text-slate-400 font-medium">{emp.jabatan}</div>
                                                            )}
                                                        </td>

                                                        {/* Sertifikasi Dimiliki (Render Colored Dot Chips) */}
                                                        <td className="p-3.5 align-middle">
                                                            {row.certs.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1.5 items-center">
                                                                    {row.certs.map((cert, cIdx) => {
                                                                        const item = getCertLegendItem(cert.nama_sertifikat || cert.certificate_name);
                                                                        return (
                                                                            <span 
                                                                                key={cert.id || cIdx}
                                                                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[11px] font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 shadow-2xs transition"
                                                                                title={`${item.name} (${cert.nomor_sertifikat || '-'})`}
                                                                            >
                                                                                <span 
                                                                                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                                                                                    style={{ backgroundColor: item.dot }}
                                                                                ></span>
                                                                                <span className="font-bold">{item.code}</span>
                                                                            </span>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <span className="text-[11px] text-slate-400 italic">Belum ada sertifikasi</span>
                                                            )}
                                                        </td>

                                                        {/* Status Masa Berlaku */}
                                                        <td className="p-3.5 text-center align-middle">
                                                            <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black border ${overall.color}`}>
                                                                {overall.text}
                                                            </span>
                                                        </td>

                                                        {/* Aksi */}
                                                        <td className="p-3.5 text-center align-middle" onClick={e => e.stopPropagation()}>
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setSelectedEmpDetail({ employee: emp, certs: row.certs })}
                                                                    className="px-2.5 py-1 bg-slate-900 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition flex items-center gap-1 shadow-2xs cursor-pointer"
                                                                    title="Lihat Detail Sertifikat Karyawan"
                                                                >
                                                                    <Eye size={12} /> Detail
                                                                </button>
                                                                {canManage && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            resetForm();
                                                                            setSelectedUserId(emp.id);
                                                                            setShowUploadModal(true);
                                                                        }}
                                                                        className="p-1 hover:bg-red-50 text-slate-400 hover:text-red-700 rounded-lg transition cursor-pointer"
                                                                        title="Upload Sertifikat Baru untuk Karyawan Ini"
                                                                    >
                                                                        <Plus size={14} />
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

                            {/* Pagination Controls */}
                            {!loading && displayRows.length > 0 && (
                                <div className="p-4 border-t border-slate-100 bg-white flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-bold text-slate-500">
                                            Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, displayRows.length)} dari {displayRows.length} Karyawan
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
                </div>
            )}

            {/* PORTALED EMPLOYEE CERTIFICATION DETAIL MODAL (WHEN ROW OR DETAIL IS CLICKED) */}
            {selectedEmpDetail && typeof document !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95">
                        {/* Header Profile */}
                        <div className="flex items-start justify-between pb-4 border-b border-slate-100">
                            <div className="flex items-center gap-3.5">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-slate-900 to-red-900 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
                                    {(selectedEmpDetail.employee.nama || selectedEmpDetail.employee.nama_lengkap || 'U').charAt(0)}
                                </div>
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        {selectedEmpDetail.employee.nama || selectedEmpDetail.employee.nama_lengkap}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                                        {selectedEmpDetail.employee.jabatan || 'Staff'} • {selectedEmpDetail.employee.department || selectedEmpDetail.employee.departments?.name || 'Operasional'}
                                    </p>
                                    {selectedEmpDetail.employee.nomor_pegawai && (
                                        <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                            No. Pegawai: {selectedEmpDetail.employee.nomor_pegawai}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button 
                                onClick={() => setSelectedEmpDetail(null)} 
                                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Summary Badges */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Total Sertifikasi Dimiliki</span>
                                <span className="text-sm font-black text-slate-900 px-2.5 py-0.5 bg-white rounded-lg border border-slate-200">
                                    {selectedEmpDetail.certs.length} Sertifikat
                                </span>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-600">Status Validitas</span>
                                <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${getEmployeeOverallStatus(selectedEmpDetail.certs).color}`}>
                                    {getEmployeeOverallStatus(selectedEmpDetail.certs).text}
                                </span>
                            </div>
                        </div>

                        {/* Certificates List */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                                Daftar Rincian Sertifikat & Lisensi ({selectedEmpDetail.certs.length})
                            </h4>

                            {selectedEmpDetail.certs.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                    <Award size={32} className="mx-auto text-slate-300 mb-2" />
                                    <p className="font-bold text-xs text-slate-600">Belum ada sertifikasi K3 yang tercatat</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Upload sertifikat baru untuk menambahkan lisensi kompetensi karyawan ini.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedEmpDetail.certs.map((cert, cIdx) => {
                                        const status = getStatusIndicator(cert);
                                        const legendItem = getCertLegendItem(cert.nama_sertifikat || cert.certificate_name);
                                        const hasFile = Boolean(cert.file_url || cert.file_path);

                                        return (
                                            <div 
                                                key={cert.id || cIdx}
                                                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col md:flex-row items-start md:items-center justify-between gap-3.5"
                                            >
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <span 
                                                        className="w-4 h-4 rounded-full shrink-0 mt-1 shadow-xs" 
                                                        style={{ backgroundColor: legendItem.dot }}
                                                    ></span>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h5 className="text-xs font-black text-slate-900">
                                                                {cert.nama_sertifikat || cert.certificate_name}
                                                            </h5>
                                                            <span className={`px-2 py-0.2 rounded-md text-[10px] font-black border ${status.color}`}>
                                                                {status.text}
                                                            </span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                                            No: <strong>{cert.nomor_sertifikat || cert.certificate_number || '-'}</strong> • <span className="text-slate-400">{cert.institusi_penerbit || 'Lembaga Resmi K3'}</span>
                                                        </p>
                                                        <p className="text-[11px] text-slate-600 mt-1 font-medium">
                                                            Masa Berlaku: <strong>{cert.is_lifetime ? 'Seumur Hidup' : `${cert.tanggal_diterbitkan || '-'} s/d ${cert.tanggal_kadaluarsa || '-'}`}</strong>
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                                                    {hasFile ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewDoc({
                                                                id: cert.id,
                                                                url: cert.file_url || cert.file_path || cert.attachments || cert.url,
                                                                name: `${selectedEmpDetail.employee.nama || selectedEmpDetail.employee.nama_lengkap} - ${cert.nama_sertifikat || 'Sertifikat K3'}`,
                                                                userCerts: selectedEmpDetail.certs.map(c => ({
                                                                    id: c.id,
                                                                    url: c.file_url || c.file_path,
                                                                    name: `${selectedEmpDetail.employee.nama || selectedEmpDetail.employee.nama_lengkap} - ${c.nama_sertifikat}`,
                                                                    nama_sertifikat: c.nama_sertifikat,
                                                                    nomor_sertifikat: c.nomor_sertifikat,
                                                                    is_lifetime: c.is_lifetime,
                                                                    tanggal_kadaluarsa: c.tanggal_kadaluarsa,
                                                                    file_url: c.file_url || c.file_path,
                                                                    karyawan: selectedEmpDetail.employee
                                                                })),
                                                                karyawan: selectedEmpDetail.employee
                                                            })}
                                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-2xs border border-blue-200 cursor-pointer"
                                                        >
                                                            <Eye size={13} /> Pratinjau Berkas
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 italic bg-slate-100 px-2 py-1 rounded-lg">Tidak ada berkas</span>
                                                    )}

                                                    {canManage && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setCertToDelete({
                                                                    id: cert.id,
                                                                    nama_sertifikat: cert.nama_sertifikat || cert.certificate_name,
                                                                    nomor_sertifikat: cert.nomor_sertifikat || cert.certificate_number,
                                                                    institusi_penerbit: cert.institusi_penerbit,
                                                                    tanggal_kadaluarsa: cert.tanggal_kadaluarsa,
                                                                    is_lifetime: cert.is_lifetime,
                                                                    employeeName: selectedEmpDetail.employee.nama || selectedEmpDetail.employee.nama_lengkap,
                                                                    employeeDept: selectedEmpDetail.employee.department || selectedEmpDetail.employee.departments?.name,
                                                                    employeeNip: selectedEmpDetail.employee.nomor_pegawai
                                                                });
                                                            }}
                                                            className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-xl transition cursor-pointer"
                                                            title="Hapus Sertifikat Ini"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-3">
                            {canManage && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        resetForm();
                                        setSelectedUserId(selectedEmpDetail.employee.id);
                                        setShowUploadModal(true);
                                    }}
                                    className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                                >
                                    <Plus size={14} /> Upload Sertifikat Baru
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setSelectedEmpDetail(null)}
                                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer ml-auto"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

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
