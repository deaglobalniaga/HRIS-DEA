import React, { useState, useEffect } from 'react';
import { Camera, MapPin, ShieldAlert, Key, RefreshCw, User, Lock, Building, Smartphone, Save, AlertCircle, Eye, EyeOff, CheckCircle, XCircle, Hash, Calendar as CalendarIcon, Briefcase, Clock } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user, login, token } = useAuth();
    const [activeTab, setActiveTab] = useState('profile');
    const [profileTab, setProfileTab] = useState('publik'); // 'publik' | 'inti' | 'dokumen'
    const [devices, setDevices] = useState([]);
    const [mfaData, setMfaData] = useState({ secret: '', qr: '', token: '', enabled: false });
    const [loading, setLoading] = useState(false);
    
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');
    const isSuperAdmin = user?.role === 'superadmin';
    
    // Profile Data
    const [profileData, setProfileData] = useState({
        full_name: '',
        first_name: '',
        last_name: '',
        nik_internal: '',
        email: '',
        division: '',
        date_of_birth: '',
        date_of_joining: '',
        address: '',
        nik_ktp: '',
        phone_number: '',
        contract_type: '',
        job_title: ''
    });
    
    // Password Data
    const [passwords, setPasswords] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    // Company Settings Data
    const [jwtSecret, setJwtSecret] = useState('****************');

    useEffect(() => {
        if (activeTab === 'system' && user?.role === 'superadmin') {
            fetchJwtSecret();
        }
        if (activeTab === 'access' && user?.role === 'superadmin') {
            fetchAccessList();
        }
    }, [activeTab]);

    const fetchJwtSecret = async () => {
        try {
            const res = await api.get('/auth/jwt-secret');
            setJwtSecret(res.data.secret);
        } catch (e) { console.error('Failed to fetch JWT Secret', e); }
    };

    const regenerateJwtSecret = async () => {
        if (!window.confirm('PERINGATAN: Mengubah Secret Key akan memaksa SEMUA user (termasuk Anda) keluar dari sesi login saat ini. Anda yakin?')) return;
        try {
            const res = await api.post('/auth/jwt-secret/regenerate');
            setJwtSecret(res.data.secret);
            addToast(res.data.message, 'success');
            setTimeout(() => {
                logout(); // force logout after changing secret
            }, 3000);
        } catch (e) {
            addToast('Gagal mengubah Secret Key', 'error');
        }
    };



    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        // Pre-fill form with user data from context
        if (user) {
            setProfileData({ ...user });
            setPhotoPreview(user.profile_photo_url || null);
            if (user.mfa_enabled) setMfaData(prev => ({ ...prev, enabled: true }));
        }


        const fetchSecurity = async () => {
            try {
                const res = await api.get('/auth/devices');
                setDevices(res.data);
            } catch(e) {}
        };
        fetchSecurity();
    
    }, [user]);

    const handleProfileChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };


    // SAVE PROFILE
    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Only send fields that the user can self-edit
            const editableFields = ['nama', 'no_handphone', 'email', 'alamat', 'kontak_darurat', 'hubungan', 'recovery_email'];
            const payload = {};
            editableFields.forEach(f => {
                if (profileData[f] !== undefined && profileData[f] !== null) {
                    payload[f] = profileData[f];
                }
            });

            const res = await api.patch('/auth/profile', payload, {
                headers: { 'Content-Type': 'application/json' }
            });

            window.alert('Profil berhasil diperbarui!');
            if (res.data.user) {
                login(token, res.data.user); // Update context
            }
        } catch (error) {
            window.alert('Gagal memperbarui profil: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // SAVE PASSWORD
    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (passwords.newPassword !== passwords.confirmPassword) {
            return alert('Password tidak cocok!');
        }
        setLoading(true);
        try {
            await api.patch('/auth/change-password', { newPassword: passwords.newPassword });
            alert('Password berhasil diubah!');
            setPasswords({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            alert('Gagal mengubah password: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    // SAVE COMPANY SETTINGS
    
    const setupMfa = async () => {
        try {
            const res = await api.get('/auth/mfa/generate');
            setMfaData(prev => ({ ...prev, secret: res.data.secret, qr: res.data.qrCodeUrl }));
        } catch(e) { alert('Gagal generate MFA'); }
    };
    const verifyMfa = async () => {
        try {
            await api.post('/auth/mfa/verify', { token: mfaData.token });
            alert('MFA berhasil diaktifkan!');
            setMfaData(prev => ({ ...prev, enabled: true, secret: '', qr: '', token: '' }));
            // Reload context user to update mfa_enabled status
            const uRes = await api.get('/auth/profile');
            login(token, uRes.data);
        } catch(e) { alert('Kode MFA Salah'); }
    };
    const disableMfa = async () => {
        const t = prompt("Masukan kode Authenticator saat ini untuk mematikan MFA:");
        if (!t) return;
        try {
            await api.post('/auth/mfa/disable', { token: t });
            alert('MFA dinonaktifkan.');
            setMfaData(prev => ({ ...prev, enabled: false, token: '' }));
            const uRes = await api.get('/auth/profile');
            login(token, uRes.data);
        } catch(e) { alert('Kode MFA Salah'); }
    };
    const saveRecoveryEmail = async (e) => {
        e.preventDefault();
        try {
            await api.patch('/auth/recovery-email', { email: profileData.recovery_email });
            alert('Email pemulihan disimpan!');
        } catch(e) { alert('Gagal'); }
    };
    const removeDevice = async (id) => {
        if(!confirm('Logout dari perangkat ini?')) return;
        try {
            await api.delete(`/auth/devices/${id}`);
            setDevices(devices.filter(d => d.device_id !== id));
        } catch(e) {}
    };
    


    return (
        <div className="w-full max-w-5xl mx-auto space-y-4 pb-8">
            <h1 className="text-xl font-black text-gray-900 tracking-tight mb-4">Pengaturan Sistem</h1>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[60vh]">
                
                {/* Sidebar Settings Menu */}
                <div className="w-full md:w-64 bg-slate-50 p-5 border-b md:border-b-0 md:border-r border-slate-200">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-slate-200 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">
                            {photoPreview ? (
                                <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User size={40} className="text-slate-400" />
                            )}
                        </div>
                        <h2 className="mt-4 font-bold text-gray-900 text-center">{user?.nama || user?.username}</h2>
                        <p className="text-xs font-bold text-red-900 bg-red-50 px-2 py-1 rounded-full uppercase mt-1">{user?.role}</p>
                    </div>

                    <nav className="space-y-1">
                        <button 
                            onClick={() => setActiveTab('profile')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'profile' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-gray-900'}`}
                        >
                            <User size={18} />
                            Data Pribadi
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'security' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-gray-900'}`}
                        >
                            <Lock size={16} />
                            Keamanan
                        </button>

                    </nav>
                </div>

                
                {/* Content Area */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {activeTab === 'profile' && (
                        <div>
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-black text-gray-900">Data Pribadi</h3>
                                <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button onClick={() => setProfileTab('publik')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${profileTab === 'publik' ? 'bg-white shadow-sm text-gray-900' : 'text-slate-500'}`}>Publik</button>
                                    <button onClick={() => setProfileTab('inti')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${profileTab === 'inti' ? 'bg-white shadow-sm text-gray-900' : 'text-slate-500'}`}>Informasi Inti</button>
                                    <button onClick={() => setProfileTab('dokumen')} className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${profileTab === 'dokumen' ? 'bg-white shadow-sm text-gray-900' : 'text-slate-500'}`}>Dokumen</button>
                                </div>
                            </div>
                            
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                {profileTab === 'publik' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="md:col-span-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-900 mb-2">Informasi Publik dapat Anda ubah secara mandiri.</div>
                                        <div><label className="block text-xs font-bold text-slate-600 mb-2">Nama Lengkap (Panggilan)</label><input type="text" name="nama" value={profileData.nama || ''} onChange={handleProfileChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" /></div>
                                        <div><label className="block text-xs font-bold text-slate-600 mb-2">No Handphone</label><input type="text" name="no_handphone" value={profileData.no_handphone || ''} onChange={handleProfileChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" /></div>
                                        <div><label className="block text-xs font-bold text-slate-600 mb-2">Email Pribadi</label><input type="email" name="email" value={profileData.email || ''} onChange={handleProfileChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" /></div>
                                        <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-600 mb-2">Alamat Domisili</label><textarea name="alamat" value={profileData.alamat || ''} onChange={handleProfileChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900"></textarea></div>
                                        <div><label className="block text-xs font-bold text-slate-600 mb-2">Kontak Darurat (Nama/No)</label><input type="text" name="kontak_darurat" value={profileData.kontak_darurat || ''} onChange={handleProfileChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" /></div>
                                        <div><label className="block text-xs font-bold text-slate-600 mb-2">Hubungan Kontak Darurat</label><input type="text" name="hubungan" value={profileData.hubungan || ''} onChange={handleProfileChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-3 outline-none focus:border-red-900" /></div>
                                        
                                        {/* Button Save */}
                                        <div className="md:col-span-2 flex justify-end pt-4 mt-2 border-t border-slate-100">
                                            <button type="submit" disabled={loading} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition flex items-center gap-2">
                                                <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                                
                                {profileTab === 'inti' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="md:col-span-2 p-3 bg-orange-50 border border-orange-100 rounded-xl text-xs font-bold text-orange-900 mb-2">Data berikut bersifat Read-Only. Hubungi HR jika terdapat kesalahan.</div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">NIK</label><input type="text" disabled value={profileData.nik || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Nomor PKWT</label><input type="text" disabled value={profileData.nomor_pkwt || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Perusahaan</label><input type="text" disabled value={profileData.perusahaan || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Department</label><input type="text" disabled value={profileData.department || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Jabatan</label><input type="text" disabled value={profileData.jabatan || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Level / Status</label><input type="text" disabled value={`${profileData.level || ''} - ${profileData.status_karyawan || ''}`} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Tanggal Lahir</label><input type="text" disabled value={profileData.tanggal_lahir ? new Date(profileData.tanggal_lahir).toLocaleDateString('id-ID') : ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Join Date</label><input type="text" disabled value={profileData.join_date ? new Date(profileData.join_date).toLocaleDateString('id-ID') : ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Pendidikan & Jurusan</label><input type="text" disabled value={`${profileData.pendidikan || ''} ${profileData.jurusan || ''}`} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Email Office</label><input type="text" disabled value={profileData.email_office || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                    </div>
                                )}
                                
                                {profileTab === 'dokumen' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="md:col-span-2 p-3 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 mb-2">Dokumen legalitas dan data perbankan (Read-Only).</div>
                                        
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">NPWP</label><input type="text" disabled value={profileData.npwp || ''} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">BPJS TK / Kes</label><input type="text" disabled value={`KPJ: ${profileData.nomor_kpj || '-'} | JKN: ${profileData.nomor_jkn || '-'}`} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        <div><label className="block text-xs font-bold text-slate-500 mb-1">Bank</label><input type="text" disabled value={`${profileData.nama_rekening || '-'} - ${profileData.nomor_rekening || '-'}`} className="w-full bg-slate-100 border border-slate-200 text-slate-600 font-bold rounded-xl px-4 py-2 cursor-not-allowed" /></div>
                                        
                                        {/* Doc Previews */}
                                        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                            {[ 
                                                { label: 'KTP', url: user?.ktp_file_url }, 
                                                { label: 'Kartu Keluarga', url: user?.kk_file_url }, 
                                                { label: 'NPWP', url: user?.npwp_file_url }, 
                                                { label: 'Ijazah', url: user?.ijazah_file_url } 
                                            ].map((doc, idx) => (
                                                <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex flex-col items-center justify-center text-center gap-2">
                                                    <div className="w-10 h-10 bg-red-100 text-red-900 rounded-full flex items-center justify-center"><User size={18} /></div>
                                                    <span className="text-xs font-bold text-slate-700">{doc.label}</span>
                                                    {doc.url ? (
                                                        <a href={doc.url} target="_blank" rel="noreferrer" className="text-[10px] bg-white border border-slate-200 px-3 py-1 rounded-full text-blue-600 font-bold hover:bg-blue-50 mt-1">Lihat PDF</a>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-200 px-3 py-1 rounded-full mt-1">Kosong</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-gray-900">Keamanan Akun</h3>
                            
                            {/* MFA Settings */}
                            <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-sm font-black text-gray-900">Autentikasi 2 Langkah (MFA)</h4>
                                        <p className="text-xs text-slate-500 font-medium">Lindungi akun Anda dengan Google Authenticator.</p>
                                    </div>
                                    <div className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100">
                                        {mfaData.enabled ? <span className="text-green-600">MFA Aktif</span> : <span className="text-slate-400">Nonaktif</span>}
                                    </div>
                                </div>
                                
                                {!mfaData.enabled && !mfaData.secret && (
                                    <button onClick={setupMfa} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800">Setup MFA Sekarang</button>
                                )}
                                
                                {!mfaData.enabled && mfaData.secret && (
                                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-4 items-center animate-in fade-in">
                                        <div className="flex flex-col items-center">
                                            <img src={mfaData.qr} alt="QR" className="w-32 h-32 rounded-lg bg-white p-1" />
                                            <p className="mt-2 text-[10px] font-mono bg-slate-200 px-2 py-1 rounded text-slate-700">{mfaData.secret}</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-700 mb-2">1. Scan QR (atau masukkan kode di atas) di Authenticator<br/>2. Masukan angka OTP yang muncul di bawah ini:</p>
                                            <div className="flex gap-2">
                                                <input type="text" value={mfaData.token} onChange={e=>setMfaData({...mfaData, token: e.target.value})} placeholder="000000" className="w-32 text-center font-bold tracking-widest px-3 py-2 border border-slate-300 rounded-lg outline-none focus:border-red-500" />
                                                <button onClick={verifyMfa} className="px-4 py-2 bg-red-900 text-white font-bold text-xs rounded-lg">Verifikasi</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {mfaData.enabled && (
                                    <button onClick={disableMfa} className="px-4 py-2 border border-red-200 text-red-600 bg-red-50 text-xs font-bold rounded-lg hover:bg-red-100">Matikan MFA</button>
                                )}
                            </div>

                            {/* Recovery Email */}
                            <form onSubmit={saveRecoveryEmail} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm flex items-end gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-black text-gray-900 mb-1">Email Pemulihan</label>
                                    <p className="text-xs text-slate-500 font-medium mb-3">Email alternatif untuk mereset kata sandi.</p>
                                    <input type="email" value={profileData.recovery_email || ''} onChange={e => setProfileData({...profileData, recovery_email: e.target.value})} className="w-full bg-slate-50 border border-slate-200 text-gray-900 font-bold rounded-xl px-4 py-2 outline-none focus:border-red-900" placeholder="email.lain@gmail.com" />
                                </div>
                                <button type="submit" className="px-4 py-2.5 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 shrink-0">Simpan Email</button>
                            </form>

                            {/* Password Form */}
                            <form onSubmit={handleSavePassword} className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm space-y-4">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">Ubah Kata Sandi</h4>
                                    <p className="text-xs text-slate-500 font-medium mb-4">Gunakan password yang kuat.</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-slate-600 mb-2">Password Baru</label><input type="password" required name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-red-900" /></div>
                                    <div><label className="block text-xs font-bold text-slate-600 mb-2">Konfirmasi Password Baru</label><input type="password" required name="confirmPassword" value={passwords.confirmPassword} onChange={handlePasswordChange} className="w-full bg-slate-50 border border-slate-200 text-gray-900 rounded-xl px-4 py-2.5 outline-none focus:border-red-900" /></div>
                                </div>
                                <div className="flex justify-end"><button type="submit" disabled={loading} className="px-6 py-2 bg-red-900 text-white font-bold rounded-xl hover:bg-red-800 transition">Ubah Password</button></div>
                            </form>

                            {/* Active Devices */}
                            <div className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm">
                                <h4 className="text-sm font-black text-gray-900 mb-4">Perangkat Aktif</h4>
                                <div className="divide-y divide-slate-100">
                                    {devices.length === 0 ? <p className="text-xs text-slate-400">Tidak ada data perangkat</p> : 
                                     devices.map((d, i) => (
                                        <div key={i} className="py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><User size={14} /></div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-900">{d.browser} <span className="text-[10px] text-slate-400 ml-1">({d.ip})</span></p>
                                                    <p className="text-[10px] font-bold text-green-600">Aktif {new Date(d.last_active).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => removeDevice(d.device_id)} className="text-[10px] font-bold bg-red-50 text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-100">Logout</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
export default Settings;
