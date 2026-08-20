import React, { useState, useEffect, useRef } from 'react';
import { 
    User, Lock, Shield, Smartphone, Key, RefreshCw, CheckCircle2, AlertCircle, Save, X,
    FileText, Award, Building2, Briefcase, Calendar, CreditCard, Hash, MapPin, Eye, Check,
    Upload, Download, AlertTriangle, Trash2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../api/api';
import PdfViewerModal from '../../components/PdfViewerModal';

const Settings = () => {
    const { user, login, token } = useAuth();
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('profile');
    const [profileTab, setProfileTab] = useState('publik'); // 'publik' | 'inti' | 'dokumen'
    const [loading, setLoading] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(null);
    const [previewDocUrl, setPreviewDocUrl] = useState(null);
    const [previewDocTitle, setPreviewDocTitle] = useState('');
    
    // Form States
    const [profileData, setProfileData] = useState({
        nama: '',
        nama_lengkap: '',
        no_handphone: '',
        email: '',
        alamat: '',
        kontak_darurat: '',
        hubungan: '',
        recovery_email: '',
        // Read-only fields
        nomor_pegawai: '',
        nik: '',
        jabatan: '',
        level: '',
        perusahaan: '',
        penempatan: '',
        department: '',
        status_karyawan: '',
        join_date: '',
        pendidikan: '',
        jurusan: '',
        agama: '',
        status_perkawinan: '',
        status_pajak: '',
        npwp: '',
        nomor_kpj: '',
        nomor_jkn: '',
        nama_rekening: '',
        nomor_rekening: '',
        documents: []
    });

    const [passwords, setPasswords] = useState({
        oldPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [usernameForm, setUsernameForm] = useState({
        newUsername: '',
        confirmPassword: ''
    });
    const [usernameLoading, setUsernameLoading] = useState(false);

    const [mfaData, setMfaData] = useState({
        secret: '',
        qr: '',
        token: '',
        enabled: false
    });

    const [devices, setDevices] = useState([]);
    const [photoPreview, setPhotoPreview] = useState(null);

    const ktpInputRef = useRef();
    const kkInputRef = useRef();
    const npwpInputRef = useRef();
    const ijazahInputRef = useRef();

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/profile');
            if (res.data) {
                const u = res.data;
                setProfileData({
                    ...u,
                    nama: u.nama || u.nama_lengkap || u.full_name || '',
                    nama_lengkap: u.nama_lengkap || u.nama || u.full_name || '',
                    no_handphone: u.no_handphone || u.phone_number || '',
                    email: u.email || '',
                    alamat: u.alamat || u.address || '',
                    kontak_darurat: u.kontak_darurat || u.kontak_darurat_nama || '',
                    hubungan: u.hubungan || u.kontak_darurat_hubungan || '',
                    recovery_email: u.recovery_email || '',
                    nomor_pegawai: u.nomor_pegawai || 'DGN-EMP-001',
                    nik: u.nik || '6371012345678901',
                    jabatan: u.jabatan || 'Project Staff',
                    level: u.level || 'STAFF',
                    perusahaan: u.perusahaan || 'PT DEA GLOBAL NIAGA',
                    penempatan: u.penempatan || 'Site BIB',
                    department: u.department || u.departments?.name || 'Project',
                    status_karyawan: u.status_karyawan || 'Aktif',
                    join_date: u.join_date || '2024-01-15',
                    pendidikan: u.pendidikan || 'S1 / D4',
                    jurusan: u.jurusan || 'Teknik',
                    agama: u.agama || 'Islam',
                    status_perkawinan: u.status_perkawinan || 'Menikah',
                    status_pajak: u.status_pajak || 'K/1',
                    npwp: u.npwp || '01.234.567.8-901.000',
                    nomor_kpj: u.nomor_kpj || '12345678901',
                    nomor_jkn: u.nomor_jkn || '09876543210',
                    nama_rekening: u.nama_rekening || u.nama_lengkap || u.nama || '',
                    nomor_rekening: u.nomor_rekening || '1234567890 (Mandiri)',
                    documents: u.documents || []
                });
                setPhotoPreview(u.profile_photo_url || null);
                if (u.username) setUsernameForm(prev => ({ ...prev, newUsername: u.username }));
                if (u.mfa_enabled) setMfaData(prev => ({ ...prev, enabled: true }));
            }
        } catch (err) {
            console.error('Fetch profile error:', err);
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await api.get('/settings/my-devices');
            setDevices(res.data || []);
        } catch (e) {
            console.error('Fetch devices error:', e);
        }
    };

    useEffect(() => {
        fetchProfile();
        fetchDevices();
    }, []);

    const handleProfileChange = (e) => {
        const { name, value } = e.target;
        if (name === 'nama' || name === 'nama_lengkap') {
            setProfileData(prev => ({ ...prev, nama: value, nama_lengkap: value }));
        } else {
            setProfileData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    // SAVE PROFILE (Publik only)
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const activeName = profileData.nama || profileData.nama_lengkap;
            const payload = {
                nama: activeName,
                nama_lengkap: activeName,
                no_handphone: profileData.no_handphone,
                email: profileData.email,
                alamat: profileData.alamat,
                kontak_darurat: profileData.kontak_darurat,
                kontak_darurat_nama: profileData.kontak_darurat,
                hubungan: profileData.hubungan,
                kontak_darurat_hubungan: profileData.hubungan,
                recovery_email: profileData.recovery_email
            };

            const res = await api.patch('/auth/profile', payload);
            addToast('Data profil publik berhasil diperbarui!', 'success');
            if (res.data.user) {
                login(token, res.data.user);
                setProfileData(prev => ({
                    ...prev,
                    ...res.data.user,
                    nama: res.data.user.nama_lengkap || res.data.user.nama || prev.nama,
                    nama_lengkap: res.data.user.nama_lengkap || res.data.user.nama || prev.nama_lengkap
                }));
            }
            fetchProfile();
        } catch (error) {
            addToast('Gagal memperbarui profil: ' + (error.response?.data?.error || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    // UPLOAD DOCUMENT (KTP, KK, NPWP, IJAZAH)
    const handleUploadDoc = async (docType, file) => {
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            addToast('Ukuran file maksimal 5MB', 'error');
            return;
        }

        setUploadingDoc(docType);
        const formData = new FormData();
        formData.append(`${docType.toLowerCase()}_file`, file);

        try {
            await api.patch('/auth/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            addToast(`Berkas ${docType} berhasil diunggah!`, 'success');
            fetchProfile();
        } catch (err) {
            console.error(err);
            addToast(`Gagal mengunggah berkas ${docType}`, 'error');
        } finally {
            setUploadingDoc(null);
        }
    };

    // SAVE USERNAME
    const handleSaveUsername = async (e) => {
        e.preventDefault();
        const cleanName = (usernameForm.newUsername || '').trim();
        if (!cleanName || cleanName.length < 3) {
            addToast('Username minimal 3 karakter tanpa spasi.', 'error');
            return;
        }
        setUsernameLoading(true);
        try {
            const res = await api.patch('/auth/change-username', {
                newUsername: cleanName,
                password: usernameForm.confirmPassword
            });
            addToast(res.data.message || 'Username berhasil diperbarui!', 'success');
            if (res.data.username) {
                login(token, { ...user, username: res.data.username });
                setProfileData(prev => ({ ...prev, username: res.data.username }));
            }
            setUsernameForm(prev => ({ ...prev, confirmPassword: '' }));
            fetchProfile();
        } catch (error) {
            addToast(error.response?.data?.message || 'Gagal mengubah username', 'error');
        } finally {
            setUsernameLoading(false);
        }
    };

    // SAVE PASSWORD
    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (!passwords.newPassword || passwords.newPassword.length < 6) {
            addToast('Password baru minimal 6 karakter.', 'error');
            return;
        }
        if (passwords.newPassword !== passwords.confirmPassword) {
            addToast('Konfirmasi password tidak cocok!', 'error');
            return;
        }
        setLoading(true);
        try {
            await api.patch('/auth/change-password', { 
                oldPassword: passwords.oldPassword,
                newPassword: passwords.newPassword 
            });
            addToast('Password berhasil diubah!', 'success');
            setPasswords({ oldPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            addToast('Gagal mengubah password: ' + (error.response?.data?.message || error.response?.data?.error || error.message), 'error');
        } finally {
            setLoading(false);
        }
    };

    // DELETE / DISCONNECT DEVICE
    const handleDeleteDevice = async (devId) => {
        if (!window.confirm('Putuskan dan hapus sesi perangkat ini?')) return;
        try {
            await api.delete(`/settings/my-devices/${devId}`);
            addToast('Perangkat berhasil diputus dan dihapus dari akun!', 'success');
            fetchDevices();
        } catch (error) {
            addToast('Gagal menghapus perangkat: ' + (error.response?.data?.message || error.message), 'error');
        }
    };

    // DELETE INDIVIDUAL DOCUMENT
    const handleDeleteDocByType = async (docType, docName) => {
        if (!window.confirm(`Apakah Anda yakin ingin menghapus berkas ${docName}?`)) return;
        try {
            const res = await api.delete(`/auth/document-by-type/${docType}`);
            addToast(res.data.message || `Berkas ${docName} berhasil dihapus!`, 'success');
            fetchProfile();
        } catch (err) {
            addToast('Gagal menghapus berkas: ' + (err.response?.data?.message || err.message), 'error');
        }
    };

    // RESET / DELETE FACE BIOMETRIC DESCRIPTOR
    const handleResetFaceDescriptor = async () => {
        if (!window.confirm('Apakah Anda yakin ingin menghapus data biometrik wajah Anda dari sistem? Anda harus mendaftarkan ulang wajah untuk dapat melakukan presensi.')) return;
        try {
            const res = await api.delete('/auth/face-descriptor');
            addToast(res.data.message || 'Data biometrik wajah berhasil direset!', 'success');
            fetchProfile();
        } catch (err) {
            addToast('Gagal mereset data wajah: ' + (err.response?.data?.message || err.message), 'error');
        }
    };

    // MFA METHODS
    const setupMfa = async () => {
        try {
            const res = await api.get('/auth/mfa/generate');
            setMfaData(prev => ({ ...prev, secret: res.data.secret, qr: res.data.qrCodeUrl }));
            addToast('QR Code MFA berhasil dibuat. Scan dengan Google Authenticator.', 'info');
        } catch(e) {
            addToast('Gagal membuat QR Code MFA', 'error');
        }
    };

    const verifyMfa = async () => {
        if (!mfaData.token) {
            addToast('Masukkan 6 digit kode dari aplikasi Authenticator', 'error');
            return;
        }
        try {
            await api.post('/auth/mfa/verify', { token: mfaData.token });
            addToast('MFA 2-Faktor berhasil diaktifkan!', 'success');
            setMfaData(prev => ({ ...prev, enabled: true, secret: '', qr: '', token: '' }));
            fetchProfile();
        } catch(e) {
            addToast('Kode MFA Salah atau Kedaluwarsa', 'error');
        }
    };

    const disableMfa = async () => {
        if (!window.confirm("Yakin ingin menonaktifkan MFA 2-Faktor?")) return;
        try {
            await api.post('/auth/mfa/disable', {});
            addToast('MFA berhasil dinonaktifkan.', 'info');
            setMfaData(prev => ({ ...prev, enabled: false, token: '', qr: '', secret: '' }));
            fetchProfile();
        } catch(e) {
            addToast('Gagal menonaktifkan MFA', 'error');
        }
    };

    const saveRecoveryEmail = async (e) => {
        e.preventDefault();
        if (!profileData.recovery_email) {
            addToast('Harap masukkan alamat email pemulihan.', 'error');
            return;
        }
        try {
            await api.patch('/auth/recovery-email', { email: profileData.recovery_email });
            addToast('Email pemulihan berhasil disimpan!', 'success');
        } catch(e) {
            addToast('Gagal menyimpan email pemulihan: ' + (e.response?.data?.error || e.message), 'error');
        }
    };

    // Helper for Document Status Check
    const getDocInfo = (type) => {
        const docs = profileData.documents || [];
        const found = docs.find(d => (d.document_type || '').toUpperCase() === type.toUpperCase());
        return {
            hasFile: Boolean(found?.file_url),
            url: found?.file_url || null,
            name: found?.file_name || `${type}.pdf`
        };
    };

    const ktpDoc = getDocInfo('KTP');
    const kkDoc = getDocInfo('KK');
    const npwpDoc = getDocInfo('NPWP');
    const ijazahDoc = getDocInfo('IJAZAH');

    return (
        <div className="w-full max-w-5xl mx-auto space-y-4 pb-12 font-sans">
            <h1 className="text-xl font-black text-slate-900 tracking-tight mb-4">Pengaturan Akun & Profil</h1>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[60vh]">
                
                {/* Sidebar Settings Menu */}
                <div className="w-full md:w-64 bg-slate-50 p-5 border-b md:border-b-0 md:border-r border-slate-200 flex flex-col justify-between">
                    <div>
                        <div className="flex flex-col items-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-slate-900 border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-white font-black text-2xl tracking-wider select-none">
                                {(profileData.nama || user?.nama || user?.username || 'US').slice(0, 2).toUpperCase()}
                            </div>
                            <h2 className="mt-3 font-black text-slate-900 text-center text-sm">{profileData.nama || user?.nama || user?.username}</h2>
                            <p className="text-[10px] font-black text-red-700 bg-red-50 px-2.5 py-0.5 rounded-full uppercase mt-1 border border-red-200">
                                {user?.role || 'User'}
                            </p>
                        </div>

                        <nav className="space-y-1.5">
                            <button 
                                onClick={() => setActiveTab('profile')}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                    activeTab === 'profile' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <User size={16} /> Data Pribadi
                            </button>
                            <button 
                                onClick={() => setActiveTab('security')}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
                                    activeTab === 'security' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Lock size={16} /> Keamanan
                            </button>
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <div className="space-y-4 animate-in fade-in duration-200">
                            {/* Top 3 Tabs Navigation for Profile */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                                <div>
                                    <h3 className="text-base font-black text-slate-900">
                                        {profileTab === 'publik' && 'Data Pribadi & Kontak'}
                                        {profileTab === 'inti' && 'Informasi Inti Kepegawaian (Read-Only)'}
                                        {profileTab === 'dokumen' && 'Dokumen & Berkas Resmi'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        {profileTab === 'publik' && 'Informasi kontak dan nama panggilan yang dapat Anda ubah secara mandiri.'}
                                        {profileTab === 'inti' && 'Data resmi posisi, leveling, dan identitas legal yang dikelola HRGA.'}
                                        {profileTab === 'dokumen' && 'Status unggahan berkas legal dan pratinjau dokumen (KTP, KK, NPWP, Ijazah).'}
                                    </p>
                                </div>

                                <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
                                    <button 
                                        type="button"
                                        onClick={() => setProfileTab('publik')} 
                                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                            profileTab === 'publik' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Publik & Kontak
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setProfileTab('inti')} 
                                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                            profileTab === 'inti' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Informasi Inti
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={() => setProfileTab('dokumen')} 
                                        className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${
                                            profileTab === 'dokumen' ? 'bg-red-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
                                        }`}
                                    >
                                        Dokumen
                                    </button>
                                </div>
                            </div>
                            
                            {/* 1. TAB PUBLIK & KONTAK (EDITABLE MANDIRI) */}
                            {profileTab === 'publik' && (
                                <form onSubmit={handleSaveProfile} className="space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                                        <div className="md:col-span-2 p-3 bg-red-50/60 border border-red-100 rounded-xl text-xs font-bold text-red-950 flex items-center gap-2">
                                            <AlertCircle size={16} className="text-red-700 shrink-0" />
                                            <span>Informasi kontak di bawah ini dapat Anda ubah dan simpan secara mandiri kapan saja.</span>
                                        </div>
                                        
                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Nama Lengkap / Panggilan</label>
                                            <input 
                                                type="text" 
                                                name="nama" 
                                                value={profileData.nama || ''} 
                                                onChange={handleProfileChange} 
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-red-900/20 text-xs" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Nomor Handphone / WhatsApp</label>
                                            <input 
                                                type="text" 
                                                name="no_handphone" 
                                                value={profileData.no_handphone || ''} 
                                                onChange={handleProfileChange} 
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-red-900/20 text-xs" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Email Pribadi</label>
                                            <input 
                                                type="email" 
                                                name="email" 
                                                value={profileData.email || ''} 
                                                onChange={handleProfileChange} 
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-red-900/20 text-xs" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Kontak Darurat (Nama / No. HP)</label>
                                            <input 
                                                type="text" 
                                                name="kontak_darurat" 
                                                value={profileData.kontak_darurat || ''} 
                                                onChange={handleProfileChange} 
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-red-900/20 text-xs" 
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-slate-700 font-bold mb-1">Hubungan Kontak Darurat</label>
                                            <input 
                                                type="text" 
                                                name="hubungan" 
                                                value={profileData.hubungan || ''} 
                                                onChange={handleProfileChange} 
                                                placeholder="Contoh: Orang Tua / Pasangan / Saudara"
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-red-900/20 text-xs" 
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <label className="block text-slate-700 font-bold mb-1">Alamat Domisili</label>
                                            <textarea 
                                                rows={2} 
                                                name="alamat" 
                                                value={profileData.alamat || ''} 
                                                onChange={handleProfileChange} 
                                                className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-bold rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-red-900/20 text-xs"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-3">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-6 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center gap-2"
                                        >
                                            <Save size={15} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* 2. TAB INFORMASI INTI (READ-ONLY RESMI HRGA) */}
                            {profileTab === 'inti' && (
                                <div className="space-y-4">
                                    <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                            <Shield size={16} className="text-red-700" />
                                            Data Resmi Kepegawaian (Terkunci & Dikelola Langsung oleh HRGA)
                                        </span>
                                        <span className="text-[10px] bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200 font-black">
                                            READ-ONLY
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 text-xs">
                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor Induk Pegawai (NIP)</span>
                                            <p className="font-mono font-black text-slate-900 mt-1">{profileData.nomor_pegawai}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Nomor Induk Kependudukan (NIK)</span>
                                            <p className="font-mono font-black text-slate-900 mt-1">{profileData.nik}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Perusahaan Legal</span>
                                            <p className="font-bold text-slate-900 mt-1">{profileData.perusahaan}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Jabatan Struktural</span>
                                            <p className="font-black text-red-700 mt-1">{profileData.jabatan}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tingkatan Leveling</span>
                                            <p className="font-black text-slate-800 mt-1">{profileData.level}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Divisi / Departemen</span>
                                            <p className="font-bold text-slate-900 mt-1">{profileData.department}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Penempatan Operasional</span>
                                            <p className="font-bold text-slate-900 mt-1">{profileData.penempatan}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Status Kepegawaian</span>
                                            <p className="font-bold text-emerald-700 mt-1 flex items-center gap-1">
                                                <CheckCircle2 size={13} /> {profileData.status_karyawan}
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Bergabung (Join Date)</span>
                                            <p className="font-bold text-slate-800 mt-1">{profileData.join_date}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">NPWP Pribadi</span>
                                            <p className="font-mono font-bold text-slate-800 mt-1">{profileData.npwp}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">BPJS Ketenagakerjaan (KPJ)</span>
                                            <p className="font-mono font-bold text-slate-800 mt-1">{profileData.nomor_kpj}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">BPJS Kesehatan (JKN)</span>
                                            <p className="font-mono font-bold text-slate-800 mt-1">{profileData.nomor_jkn}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 3. TAB DOKUMEN & BERKAS RESMI (READ-ONLY RESMI & PREVIEW) */}
                            {profileTab === 'dokumen' && (
                                <div className="space-y-4">
                                    <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-2xl flex items-start gap-3 text-xs text-slate-700">
                                        <Shield size={18} className="text-red-700 shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-bold block text-slate-900 mb-0.5">Arsip & Dokumen Resmi Legalitas Karyawan (Read-Only)</span>
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                                                Dokumen resmi seperti KTP, Kartu Keluarga, NPWP, dan Ijazah dikelola dan diperbarui secara terpusat oleh tim Admin HRGA demi integritas data perusahaan. Anda dapat melakukan pratinjau (*preview*) dokumen pribadi Anda di bawah ini.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        {/* KTP Card */}
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900">Kartu Tanda Penduduk (KTP)</h4>
                                                        <span className="text-[10px] text-slate-400">Identitas Kependudukan</span>
                                                    </div>
                                                </div>
                                                {ktpDoc.hasFile ? (
                                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-black flex items-center gap-1 border border-green-300">
                                                        <Check size={11} /> Terunggah
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                                                        Belum Diunggah
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                                                <span className="text-slate-400 text-[10px]">Dikelola oleh HRGA</span>
                                                {ktpDoc.hasFile ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setPreviewDocUrl(ktpDoc.url); setPreviewDocTitle('Kartu Tanda Penduduk (KTP)'); }}
                                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Eye size={13} /> Pratinjau
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDocByType('KTP', 'Kartu Tanda Penduduk (KTP)')}
                                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                            title="Hapus Berkas KTP"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[10px]">Berkas belum tersedia</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* KK Card */}
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-black">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900">Kartu Keluarga (KK)</h4>
                                                        <span className="text-[10px] text-slate-400">Data Tanggungan & PTKP</span>
                                                    </div>
                                                </div>
                                                {kkDoc.hasFile ? (
                                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-black flex items-center gap-1 border border-green-300">
                                                        <Check size={11} /> Terunggah
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                                                        Belum Diunggah
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                                                <span className="text-slate-400 text-[10px]">Dikelola oleh HRGA</span>
                                                {kkDoc.hasFile ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setPreviewDocUrl(kkDoc.url); setPreviewDocTitle('Kartu Keluarga (KK)'); }}
                                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Eye size={13} /> Pratinjau
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDocByType('KK', 'Kartu Keluarga (KK)')}
                                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                            title="Hapus Berkas KK"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[10px]">Berkas belum tersedia</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* NPWP Card */}
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                                                        <FileText size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900">Kartu NPWP</h4>
                                                        <span className="text-[10px] text-slate-400">Pajak Penghasilan (PPh 21)</span>
                                                    </div>
                                                </div>
                                                {npwpDoc.hasFile ? (
                                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-black flex items-center gap-1 border border-green-300">
                                                        <Check size={11} /> Terunggah
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                                                        Belum Diunggah
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                                                <span className="text-slate-400 text-[10px]">Dikelola oleh HRGA</span>
                                                {npwpDoc.hasFile ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setPreviewDocUrl(npwpDoc.url); setPreviewDocTitle('Kartu NPWP'); }}
                                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Eye size={13} /> Pratinjau
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDocByType('NPWP', 'Kartu NPWP')}
                                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                            title="Hapus Berkas NPWP"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[10px]">Berkas belum tersedia</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ijazah Card */}
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black">
                                                        <Award size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-slate-900">Ijazah Pendidikan Terakhir</h4>
                                                        <span className="text-[10px] text-slate-400">Bukti Kelulusan & Kualifikasi</span>
                                                    </div>
                                                </div>
                                                {ijazahDoc.hasFile ? (
                                                    <span className="px-2.5 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-black flex items-center gap-1 border border-green-300">
                                                        <Check size={11} /> Terunggah
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 bg-slate-200 text-slate-600 rounded-full text-[10px] font-bold">
                                                        Belum Diunggah
                                                    </span>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                                                <span className="text-slate-400 text-[10px]">Dikelola oleh HRGA</span>
                                                {ijazahDoc.hasFile ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => { setPreviewDocUrl(ijazahDoc.url); setPreviewDocTitle('Ijazah Pendidikan'); }}
                                                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                        >
                                                            <Eye size={13} /> Pratinjau
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDocByType('IJAZAH', 'Ijazah Pendidikan')}
                                                            className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl transition-all flex items-center gap-1 shadow-sm"
                                                            title="Hapus Berkas Ijazah"
                                                        >
                                                            <Trash2 size={13} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 italic text-[10px]">Berkas belum tersedia</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* KEAMANAN TAB */}
                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in duration-200">
                            <div>
                                <h3 className="text-base font-black text-slate-900">Keamanan Akun & Otentikasi</h3>
                                <p className="text-xs text-slate-500 mt-0.5">Kelola verifikasi 2-faktor (MFA), data biometrik wajah, nama pengguna, dan kata sandi.</p>
                            </div>

                            {/* Biometric Face Data Card */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                            <ShieldCheck size={15} className="text-red-700" /> Database Biometrik Wajah (Face Recognition)
                                        </h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">
                                            Data vektor 128-dimensi digunakan sebagai pembanding otomatis saat melakukan Presensi Masuk & Pulang di kamera.
                                        </p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                        profileData.face_descriptor ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {profileData.face_descriptor ? 'Terdaftar & Aktif' : 'Belum Didaftarkan'}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                                    <span className="text-slate-500 text-[11px]">
                                        {profileData.face_descriptor 
                                            ? 'Data biometrik aktif digunakan untuk verifikasi presensi mobile & site.'
                                            : 'Wajah belum terdaftar. Presensi kamera memerlukan pendaftaran biometrik.'}
                                    </span>
                                    {profileData.face_descriptor && (
                                        <button
                                            type="button"
                                            onClick={handleResetFaceDescriptor}
                                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
                                        >
                                            <Trash2 size={13} /> Reset / Hapus Data Wajah
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* MFA Card */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900">Autentikasi 2 Langkah (MFA Google Authenticator)</h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Lindungi akun Anda dengan kode OTP 6 digit dari ponsel.</p>
                                    </div>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                        mfaData.enabled ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                        {mfaData.enabled ? 'Aktif' : 'Nonaktif'}
                                    </span>
                                </div>

                                {mfaData.enabled ? (
                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-xs text-green-700 font-bold flex items-center gap-1.5">
                                            <CheckCircle2 size={15} /> Akun Anda telah diamankan dengan MFA.
                                        </span>
                                        <button
                                            type="button"
                                            onClick={disableMfa}
                                            className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-all"
                                        >
                                            Nonaktifkan MFA
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-2">
                                        {!mfaData.qr ? (
                                            <button
                                                type="button"
                                                onClick={setupMfa}
                                                className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-sm"
                                            >
                                                Setup MFA Sekarang
                                            </button>
                                        ) : (
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                                                <p className="text-xs text-slate-600 font-medium">
                                                    1. Buka Google Authenticator di HP Anda lalu scan QR Code di bawah:
                                                </p>
                                                <div className="flex justify-center">
                                                    <img src={mfaData.qr} alt="MFA QR Code" className="w-36 h-36 border border-slate-200 rounded-lg p-1" />
                                                </div>
                                                <p className="text-[11px] text-slate-500 font-mono text-center">
                                                    Secret Key: <span className="font-bold text-slate-800">{mfaData.secret}</span>
                                                </p>
                                                <div className="flex gap-2 max-w-xs mx-auto">
                                                    <input
                                                        type="text"
                                                        placeholder="6 Digit Kode OTP"
                                                        value={mfaData.token}
                                                        onChange={(e) => setMfaData({ ...mfaData, token: e.target.value })}
                                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center outline-none focus:ring-1 focus:ring-red-900"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={verifyMfa}
                                                        className="px-4 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl"
                                                    >
                                                        Verifikasi
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Recovery Email */}
                            <form onSubmit={saveRecoveryEmail} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                <div>
                                    <h4 className="text-xs font-black text-slate-900">Email Pemulihan Akun</h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Email alternatif untuk mereset kata sandi jika lupa password.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="email"
                                        placeholder="nama@gmail.com"
                                        value={profileData.recovery_email || ''}
                                        onChange={(e) => setProfileData({ ...profileData, recovery_email: e.target.value })}
                                        className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900"
                                    />
                                    <button
                                        type="submit"
                                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shrink-0"
                                    >
                                        Simpan Email
                                    </button>
                                </div>
                            </form>

                            {/* 1. Ubah Username (ID Login) */}
                            <form onSubmit={handleSaveUsername} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                            <User size={15} className="text-red-700" /> Nama Pengguna (Username / ID Login)
                                        </h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Username digunakan sebagai identitas akun untuk masuk ke portal HRIS.</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 shadow-sm">
                                        <span className="text-slate-400 text-[11px]">Saat ini:</span>
                                        <span className="text-red-700">@{profileData.username || user?.username || '-'}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-medium pt-1">
                                    <div>
                                        <label className="block text-slate-600 text-[10px] font-bold mb-1">Username Baru</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">@</span>
                                            <input
                                                type="text"
                                                placeholder="contoh: aryatony_dgn"
                                                value={usernameForm.newUsername}
                                                onChange={(e) => setUsernameForm({ ...usernameForm, newUsername: e.target.value.toLowerCase().replace(/\s+/g, '') })}
                                                className="w-full pl-7 pr-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900 font-mono"
                                            />
                                        </div>
                                        <span className="text-[9px] text-slate-400 mt-0.5 block">Hanya huruf kecil, angka, titik, atau underscore tanpa spasi.</span>
                                    </div>
                                    <div>
                                        <label className="block text-slate-600 text-[10px] font-bold mb-1">Kata Sandi Saat Ini (Konfirmasi)</label>
                                        <input
                                            type="password"
                                            placeholder="Masukkan kata sandi saat ini"
                                            value={usernameForm.confirmPassword}
                                            onChange={(e) => setUsernameForm({ ...usernameForm, confirmPassword: e.target.value })}
                                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900"
                                        />
                                        <span className="text-[9px] text-slate-400 mt-0.5 block">Wajib diisi untuk memverifikasi keamanan kepemilikan akun.</span>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={usernameLoading}
                                        className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                        <Save size={13} /> {usernameLoading ? 'Menyimpan...' : 'Simpan Username Baru'}
                                    </button>
                                </div>
                            </form>

                            {/* 2. Ubah Kata Sandi */}
                            <form onSubmit={handleSavePassword} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                <div>
                                    <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                        <Lock size={15} className="text-red-700" /> Ubah Kata Sandi (Password)
                                    </h4>
                                    <p className="text-[11px] text-slate-500 mt-0.5">Gunakan password yang kuat dengan kombinasi minimal 6 karakter huruf dan angka.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-medium pt-1">
                                    <div>
                                        <label className="block text-slate-600 text-[10px] font-bold mb-1">Kata Sandi Lama / Saat Ini</label>
                                        <input
                                            type="password"
                                            name="oldPassword"
                                            placeholder="Kata sandi saat ini"
                                            value={passwords.oldPassword}
                                            onChange={handlePasswordChange}
                                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-600 text-[10px] font-bold mb-1">Kata Sandi Baru</label>
                                        <input
                                            type="password"
                                            name="newPassword"
                                            placeholder="Minimal 6 karakter"
                                            value={passwords.newPassword}
                                            onChange={handlePasswordChange}
                                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-slate-600 text-[10px] font-bold mb-1">Konfirmasi Kata Sandi Baru</label>
                                        <input
                                            type="password"
                                            name="confirmPassword"
                                            placeholder="Ulangi kata sandi baru"
                                            value={passwords.confirmPassword}
                                            onChange={handlePasswordChange}
                                            className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-red-900"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="px-5 py-2 bg-red-700 hover:bg-red-800 text-white text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                                    >
                                        <Key size={13} /> {loading ? 'Memproses...' : 'Simpan Kata Sandi Baru'}
                                    </button>
                                </div>
                            </form>

                            {/* Active Devices & Sessions */}
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-slate-900 flex items-center gap-2">
                                            <Smartphone size={15} className="text-red-700" /> Sesi & Perangkat Terhubung
                                        </h4>
                                        <p className="text-[11px] text-slate-500 mt-0.5">Daftar perangkat keras dan sistem operasi yang digunakan untuk masuk ke akun Anda.</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={fetchDevices} 
                                        className="p-1.5 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm"
                                    >
                                        <RefreshCw size={11} /> Muat Ulang
                                    </button>
                                </div>

                                <div className="space-y-2 pt-1">
                                    {devices.length === 0 ? (
                                        <div className="p-4 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400 font-bold">
                                            Belum ada data riwayat perangkat lain. Sesi saat ini aktif & aman.
                                        </div>
                                    ) : (
                                        devices.map((dev, idx) => (
                                            <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 text-red-700 flex items-center justify-center font-bold shrink-0">
                                                        <Smartphone size={16} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h5 className="font-bold text-slate-900">
                                                                {dev.device_name || `${dev.os || 'OS'} (${dev.browser || 'Browser'})`}
                                                            </h5>
                                                            {idx === 0 && (
                                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
                                                                    Sesi Aktif Saat Ini
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            {dev.os || 'OS'} • {dev.browser || 'Browser'} • IP: {dev.ip || '127.0.0.1'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="text-right text-[10px] font-mono text-slate-400">
                                                        {dev.last_login ? new Date(dev.last_login).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Baru saja'}
                                                    </div>
                                                    {dev.id && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleDeleteDevice(dev.id)}
                                                            title="Putuskan dan hapus perangkat ini"
                                                            className="p-1.5 bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold"
                                                        >
                                                            <Trash2 size={13} />
                                                            <span className="hidden sm:inline">Hapus</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* FULL-PAGE DOCUMENT PREVIEW MODAL */}
            {previewDocUrl && (
                <PdfViewerModal
                    url={previewDocUrl}
                    fileName={previewDocTitle || "Dokumen Karyawan"}
                    onClose={() => setPreviewDocUrl(null)}
                />
            )}
        </div>
    );
};

export default Settings;

