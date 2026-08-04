import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Calendar, Save, Camera, Shield, Mail, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import api from '../api/api';

const Profile = ({ user }) => {
  const [formData, setFormData] = useState({
    email: '',
    phone_number: '',
    address: '',
    birth_date: '',
    profile_photo_url: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    // Fetch detailed profile
    const fetchProfile = async () => {
      try {
        const res = await api.get('/hris/employees'); // Hacky way for now, usually there is /profile GET
        const myProfile = res.data.find(u => u.id === user.id);
        if (myProfile) {
            setUserInfo(myProfile);
            setFormData({
                email: myProfile.email || myProfile.username || '',
                phone_number: myProfile.phone_number || '',
                address: myProfile.address || '',
                birth_date: myProfile.birth_date ? myProfile.birth_date.split('T')[0] : '',
                profile_photo_url: myProfile.profile_photo_url || ''
            });
        }
      } catch (err) {
        console.error(err);
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [user.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    
    try {
        await api.put('/hris/profile', formData);
        setMessage({ text: 'Profil berhasil diperbarui.', type: 'success' });
    } catch (err) {
        console.error(err);
        setMessage({ text: 'Gagal memperbarui profil.', type: 'error' });
    } finally {
        setSaving(false);
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    }
  };

  if (loading) {
      return (
          <div className="w-full h-[60vh] flex items-center justify-center">
              <Loader2 className="animate-spin text-red-900" size={48} />
          </div>
      );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
        
        {/* Header Section */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden relative">
            <div className="h-32 bg-gradient-to-r from-red-900 via-red-800 to-slate-900"></div>
            <div className="px-8 pb-8">
                <div className="relative flex justify-between items-end -mt-12 mb-6">
                    <div className="flex items-end gap-6">
                        <div className="relative group">
                            {formData.profile_photo_url || user.profile_photo_url ? (
                                <img src={formData.profile_photo_url || user.profile_photo_url} alt="Profile" className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg object-cover bg-white" />
                            ) : (
                                <div className="w-28 h-28 rounded-2xl border-4 border-white shadow-lg bg-slate-100 flex items-center justify-center text-4xl font-black text-slate-300">
                                    {user?.full_name?.charAt(0) || 'U'}
                                </div>
                            )}
                            <button className="absolute bottom-2 right-2 w-8 h-8 bg-white text-slate-700 rounded-lg shadow-md border border-slate-100 flex items-center justify-center hover:text-red-900 transition-colors">
                                <Camera size={16} />
                            </button>
                        </div>
                        <div className="mb-2">
                            <h1 className="text-2xl font-black text-gray-900">{user.full_name}</h1>
                            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{userInfo?.job_title || user.role}</p>
                        </div>
                    </div>
                    <div className="mb-2 flex items-center gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-black uppercase flex items-center gap-1">
                            <Shield size={14} /> Active
                        </span>
                    </div>
                </div>
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Left Column: Read Only Info */}
            <div className="col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <h3 className="font-black text-gray-900 mb-4 flex items-center gap-2">
                        <User size={18} className="text-red-900" />
                        Informasi Karir
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NIK Internal</p>
                            <p className="text-sm font-bold text-gray-900">{userInfo?.nik_internal || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Divisi</p>
                            <p className="text-sm font-bold text-gray-900">{userInfo?.division || '-'}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tanggal Bergabung</p>
                            <p className="text-sm font-bold text-gray-900">{userInfo?.date_of_joining ? new Date(userInfo.date_of_joining).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric'}) : '-'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Column: Editable Form */}
            <div className="col-span-1 md:col-span-2">
                <form onSubmit={handleSave} className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h3 className="font-black text-gray-900 text-lg">Informasi Pribadi</h3>
                        {message.text && (
                            <span className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1 ${message.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                                <AlertCircle size={14} /> {message.text}
                            </span>
                        )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="email" 
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="email@perusahaan.com"
                                    className="w-full bg-white border border-slate-200 focus:border-red-900 focus:ring-1 focus:ring-red-900 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-gray-900 transition-all outline-none"
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Nomor HP</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    name="phone_number"
                                    value={formData.phone_number} 
                                    onChange={handleChange}
                                    placeholder="Contoh: 08123456789"
                                    className="w-full bg-white border border-slate-200 focus:border-red-900 focus:ring-1 focus:ring-red-900 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-gray-900 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Tanggal Lahir</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="date" 
                                    name="birth_date"
                                    value={formData.birth_date} 
                                    onChange={handleChange}
                                    className="w-full bg-white border border-slate-200 focus:border-red-900 focus:ring-1 focus:ring-red-900 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-gray-900 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">NIK KTP (Optional)</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    value={userInfo?.nik_ktp || ''} 
                                    disabled
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-slate-500 cursor-not-allowed"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Alamat Lengkap</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 text-slate-400" size={16} />
                            <textarea 
                                name="address"
                                value={formData.address} 
                                onChange={handleChange}
                                placeholder="Masukkan alamat lengkap..."
                                rows="3"
                                className="w-full bg-white border border-slate-200 focus:border-red-900 focus:ring-1 focus:ring-red-900 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-gray-900 transition-all outline-none resize-none"
                            ></textarea>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="bg-red-900 hover:bg-red-800 disabled:opacity-50 text-white px-6 py-3 rounded-xl text-sm font-black tracking-wide flex items-center gap-2 transition-colors shadow-md"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            Simpan Perubahan
                        </button>
                    </div>
                </form>
            </div>
        </div>

    </div>
  );
};

export default Profile;
