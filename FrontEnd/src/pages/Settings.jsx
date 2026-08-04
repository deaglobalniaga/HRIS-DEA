import React, { useState, useEffect } from 'react';
import { Lock, User, Save, Building, Hash, Calendar as CalendarIcon, MapPin, Briefcase, Clock } from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const Settings = () => {
    const { user, login, token } = useAuth();
    const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'security' | 'company'
    const [loading, setLoading] = useState(false);
    
    const isAdmin = user?.role?.toLowerCase().includes('admin') || user?.role?.toLowerCase().includes('hr');
    
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
    const [companySettings, setCompanySettings] = useState({
        monthlyTargetHours: 160,
        officeLat: -3.42436,
        officeLng: 115.99267,
        officeRadius: 50,
        checkInStart: '06:00',
        checkInEnd: '09:00',
        checkOutStart: '17:00',
        checkOutEnd: '20:00',
        maxLateMinutes: 15
    });
    
    const [photoPreview, setPhotoPreview] = useState(null);

    useEffect(() => {
        // Pre-fill form with user data from context
        if (user) {
            setProfileData({
                full_name: user.full_name || '',
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                nik_internal: user.nik_internal || '',
                email: user.email || user.username || '',
                division: user.division || '',
                date_of_birth: user.date_of_birth || '',
                date_of_joining: user.date_of_joining || '',
                address: user.address || '',
                nik_ktp: user.nik_ktp || '',
                phone_number: user.phone_number || '',
                contract_type: user.contract_type || '',
                job_title: user.job_title || ''
            });
            setPhotoPreview(user.profile_photo_url || null);
        }

        // Fetch company settings
        const fetchSettings = async () => {
            try {
                const res = await api.get('/settings');
                if (res.data) setCompanySettings(res.data);
            } catch (err) {
                console.error("Gagal memuat pengaturan perusahaan:", err);
            }
        };
        fetchSettings();
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
            const res = await api.patch('/auth/profile', profileData);
            alert('Profil berhasil diperbarui!');
            login(token, res.data.user); // Update context
        } catch (error) {
            alert('Gagal memperbarui profil: ' + (error.response?.data?.error || error.message));
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
    const handleSaveCompanySettings = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.patch('/settings', companySettings);
            alert('Pengaturan perusahaan berhasil disimpan!');
        } catch (error) {
            alert('Gagal menyimpan pengaturan: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
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
                        <h2 className="mt-4 font-bold text-gray-900 text-center">{user?.full_name}</h2>
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
                        {isAdmin && (
                            <button 
                                onClick={() => setActiveTab('company')}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'company' ? 'bg-white shadow-sm border border-slate-200 text-red-900' : 'text-slate-500 hover:bg-slate-100 hover:text-gray-900'}`}
                            >
                                <Building size={16} />
                                Data Perusahaan
                            </button>
                        )}
                    </nav>
                </div>

                {/* Content Area */}
                <div className="flex-1 p-6">
                    {activeTab === 'profile' && (
                        <div>
                            <h3 className="text-base font-black text-gray-900 mb-4">Data Pribadi</h3>
                            <form onSubmit={handleSaveProfile} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nama Lengkap</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" name="full_name" value={profileData.full_name} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Email Pribadi</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="email" name="email" value={profileData.email} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">NIK Internal</label>
                                        <div className="relative">
                                            <Hash size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" name="nik_internal" value={profileData.nik_internal} onChange={handleProfileChange} disabled className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nama Depan</label>
                                        <input type="text" name="first_name" value={profileData.first_name} onChange={handleProfileChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Nama Belakang</label>
                                        <input type="text" name="last_name" value={profileData.last_name} onChange={handleProfileChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Divisi</label>
                                        <div className="relative">
                                            <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={profileData.division || '-'} disabled className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Posisi / Job Title</label>
                                        <div className="relative">
                                            <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={profileData.job_title || '-'} disabled className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tipe Karyawan</label>
                                        <div className="relative">
                                            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="text" value={profileData.contract_type || '-'} disabled className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tanggal Lahir</label>
                                        <div className="relative">
                                            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="date" name="date_of_birth" value={profileData.date_of_birth} onChange={handleProfileChange} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Tanggal Bergabung</label>
                                        <div className="relative">
                                            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input type="date" value={profileData.date_of_joining} disabled className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border border-slate-200 rounded-xl outline-none font-medium text-slate-500 cursor-not-allowed" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">NIK KTP</label>
                                        <input type="text" name="nik_ktp" value={profileData.nik_ktp} onChange={handleProfileChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">No WhatsApp / Telepon</label>
                                        <input type="text" name="phone_number" value={profileData.phone_number} onChange={handleProfileChange} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                    </div>
                                    <div className="group md:col-span-2">
                                        <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Alamat Lengkap</label>
                                        <div className="relative">
                                            <MapPin size={16} className="absolute left-3 top-3 text-slate-400" />
                                            <textarea name="address" value={profileData.address} onChange={handleProfileChange} rows="2" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium text-sm"></textarea>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 flex justify-end">
                                    <button type="submit" disabled={loading} className="bg-red-900 hover:bg-red-800 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center gap-2">
                                        <Save size={18} /> {loading ? 'Menyimpan...' : 'Simpan Profil'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div>
                            <h3 className="text-lg font-black text-gray-900 mb-6">Pengaturan Keamanan</h3>
                            <form onSubmit={handleSavePassword} className="space-y-6 max-w-md">
                                <div className="group">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Password Baru</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="password" name="newPassword" value={passwords.newPassword} onChange={handlePasswordChange} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                    </div>
                                </div>
                                <div className="group">
                                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Konfirmasi Password Baru</label>
                                    <div className="relative">
                                        <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="password" name="confirmPassword" value={passwords.confirmPassword} onChange={handlePasswordChange} required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium" />
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100">
                                    <button type="submit" disabled={loading} className="bg-slate-900 hover:bg-black text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-slate-900/20 transition-all flex items-center gap-2">
                                        <Save size={18} /> {loading ? 'Menyimpan...' : 'Perbarui Password'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {activeTab === 'company' && isAdmin && (
                        <div>
                            <h3 className="text-base font-black text-gray-900 mb-4">Pengaturan Perusahaan & Regulasi HR</h3>
                            <form onSubmit={handleSaveCompanySettings} className="space-y-6 max-w-3xl">
                                
                                {/* Section 1: Lokasi Kantor (GPS) */}
                                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-4">
                                    <h4 className="text-sm font-black text-blue-900 flex items-center gap-2"><MapPin size={16}/> Lokasi Presensi Kantor (Geofencing)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Latitude</label>
                                            <input type="number" step="any" value={companySettings.officeLat} onChange={(e) => setCompanySettings({...companySettings, officeLat: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Longitude</label>
                                            <input type="number" step="any" value={companySettings.officeLng} onChange={(e) => setCompanySettings({...companySettings, officeLng: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Radius (Meter)</label>
                                            <input type="number" value={companySettings.officeRadius} onChange={(e) => setCompanySettings({...companySettings, officeRadius: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" required />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 2: Parameter & Batasan Waktu Absensi */}
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-4">
                                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2"><Clock size={16}/> Parameter Waktu Presensi</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Mulai Check-In</label>
                                            <input type="time" value={companySettings.checkInStart} onChange={(e) => setCompanySettings({...companySettings, checkInStart: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-900" required />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Batas Check-In</label>
                                            <input type="time" value={companySettings.checkInEnd} onChange={(e) => setCompanySettings({...companySettings, checkInEnd: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-900" required />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Mulai Check-Out</label>
                                            <input type="time" value={companySettings.checkOutStart} onChange={(e) => setCompanySettings({...companySettings, checkOutStart: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-900" required />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Batas Check-Out</label>
                                            <input type="time" value={companySettings.checkOutEnd} onChange={(e) => setCompanySettings({...companySettings, checkOutEnd: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-900" required />
                                        </div>
                                        <div className="group">
                                            <label className="block text-xs font-bold text-slate-500 mb-1">Toleransi Telat (Menit)</label>
                                            <input type="number" value={companySettings.maxLateMinutes} onChange={(e) => setCompanySettings({...companySettings, maxLateMinutes: e.target.value})} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-red-900" required min="0" />
                                        </div>
                                    </div>
                                </div>

                                {/* Section 3: Target Waktu Kerja */}
                                <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                    <div className="group max-w-xs">
                                        <label className="block text-xs font-bold text-slate-500 mb-1">Target Jam Kerja Bulanan (100% KPI)</label>
                                        <div className="relative">
                                            <CalendarIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                            <input 
                                                type="number" 
                                                value={companySettings.monthlyTargetHours} 
                                                onChange={(e) => setCompanySettings({...companySettings, monthlyTargetHours: e.target.value})} 
                                                required 
                                                min="1"
                                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-900/20 focus:border-red-900 outline-none transition-all font-medium text-sm" 
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <button type="submit" disabled={loading} className="bg-red-900 hover:bg-red-800 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-red-900/20 transition-all flex items-center gap-2 text-sm">
                                        <Save size={16} /> {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Settings;
